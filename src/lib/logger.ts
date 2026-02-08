import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import type { LogEntry, LogLevel } from './types.js';

/**
 * Логирование вызовов MCP tools
 */
class Logger {
  private logFile: string;
  private maxFileSize: number = 10 * 1024 * 1024; // 10MB
  private maxFiles: number = 5;
  private currentLevel: LogLevel = 'info';

  constructor() {
    const logsDir = join(process.cwd(), 'logs');
    this.logFile = join(logsDir, 'mcp-calls.log');

    // Создаем директорию для логов, если её нет
    if (!existsSync(logsDir)) {
      mkdir(logsDir, { recursive: true }).catch(() => {
        // Игнорируем ошибки создания директории
      });
    }
  }

  /**
   * Устанавливает уровень логирования
   */
  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  /**
   * Проверяет, должен ли лог быть записан на текущем уровне
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      error: 2,
    };
    return levels[level] >= levels[this.currentLevel];
  }

  /**
   * Очищает чувствительные данные из параметров
   */
  private sanitizeParameters(params: Record<string, unknown>): Record<string, unknown> {
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'apiKey', 'auth'];
    const sanitized = { ...params };

    for (const key in sanitized) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some((sk) => lowerKey.includes(sk))) {
        sanitized[key] = '***REDACTED***';
      }
    }

    return sanitized;
  }

  /**
   * Записывает лог-запись в файл
   */
  async log(entry: LogEntry): Promise<void> {
    try {
      const sanitizedEntry: LogEntry = {
        ...entry,
        parameters: this.sanitizeParameters(entry.parameters as Record<string, unknown>),
      };

      const logLine = JSON.stringify(sanitizedEntry) + '\n';

      // Проверяем размер файла и ротируем при необходимости
      if (existsSync(this.logFile)) {
        const { stat } = await import('fs/promises');
        const stats = await stat(this.logFile);
        if (stats.size + logLine.length > this.maxFileSize) {
          await this.rotateLogs();
        }
      }

      await writeFile(this.logFile, logLine, { flag: 'a' });
    } catch (error) {
      // Игнорируем ошибки записи логов, чтобы не нарушать работу сервера
      console.error('Failed to write log:', error);
    }
  }

  /**
   * Ротация логов
   */
  private async rotateLogs(): Promise<void> {
    const { rename, unlink } = await import('fs/promises');
    const logDir = dirname(this.logFile);

    // Удаляем самый старый файл, если достигнут лимит
    const oldestFile = join(logDir, `mcp-calls.${this.maxFiles}.log`);
    if (existsSync(oldestFile)) {
      await unlink(oldestFile);
    }

    // Сдвигаем существующие файлы
    for (let i = this.maxFiles - 1; i >= 1; i--) {
      const oldFile = join(logDir, `mcp-calls.${i}.log`);
      const newFile = join(logDir, `mcp-calls.${i + 1}.log`);
      if (existsSync(oldFile)) {
        await rename(oldFile, newFile);
      }
    }

    // Переименовываем текущий файл
    const firstRotated = join(logDir, 'mcp-calls.1.log');
    if (existsSync(this.logFile)) {
      await rename(this.logFile, firstRotated);
    }
  }

  /**
   * Логирует вызов tool
   */
  async logToolCall(
    tool: string,
    parameters: Record<string, unknown> | object,
    executionTimeMs: number,
    status: 'success' | 'error',
    resultSize?: number,
    error?: { message: string; code?: string }
  ): Promise<void> {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      tool,
      parameters: parameters as Record<string, unknown>,
      executionTimeMs,
      status,
      resultSize,
      error,
    };

    const level: LogLevel = status === 'error' ? 'error' : 'info';
    if (this.shouldLog(level)) {
      await this.log(entry);
    }
  }

  /**
   * Логирует debug информацию
   */
  async logDebug(
    tool: string,
    message: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    if (this.shouldLog('debug')) {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        tool,
        parameters: { message, ...data },
        executionTimeMs: 0,
        status: 'success',
      };
      await this.log(entry);
    }
  }
}

export const logger = new Logger();
