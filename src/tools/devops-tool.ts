import { logger } from '../lib/logger.js';
import { validateCommand, parseCommand } from '../lib/command-validator.js';
import type { ExecuteCommandParams, CommandResult } from '../lib/types.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { resolve } from 'path';
import { ACCESS_LIMITS } from '../config/access-limits.js';

const execAsync = promisify(exec);

/**
 * Tool для выполнения безопасных команд в контексте проекта
 */
export async function handleExecuteCommand(
  request: { params: { name: string; arguments?: unknown } }
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const startTime = Date.now();

  try {
    const args = request.params?.arguments as ExecuteCommandParams;

    if (!args || !args.command) {
      throw new Error('Command parameter is required');
    }

    const { command, args: commandArgs = [], workingDir } = args;

    // Валидация команды
    const validation = validateCommand(command, commandArgs, workingDir);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Определяем рабочую директорию
    const cwd = workingDir
      ? resolve(workingDir)
      : ACCESS_LIMITS.PROJECT_ROOT;

    // Формируем полную команду
    const fullCommand =
      commandArgs.length > 0
        ? `${command} ${commandArgs.join(' ')}`
        : command;

    // Выполняем команду
    const execStartTime = Date.now();
    let result: CommandResult;

    try {
      const { stdout, stderr } = await execAsync(fullCommand, {
        cwd,
        maxBuffer: 10 * 1024 * 1024, // 10MB
        timeout: 60000, // 60 секунд
      });

      const executionTime = Date.now() - execStartTime;

      result = {
        stdout: stdout || '',
        stderr: stderr || '',
        exitCode: 0,
        executionTime,
      };
    } catch (error: any) {
      const executionTime = Date.now() - execStartTime;

      result = {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message || '',
        exitCode: error.code || 1,
        executionTime,
      };
    }

    const totalExecutionTime = Date.now() - startTime;
    await logger.logToolCall(
      'execute_command',
      args as unknown as Record<string, unknown>,
      totalExecutionTime,
      result.exitCode === 0 ? 'success' : 'error',
      undefined,
      result.exitCode !== 0
        ? { message: result.stderr, code: String(result.exitCode) }
        : undefined
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    await logger.logToolCall(
      'execute_command',
      (request.params?.arguments || {}) as Record<string, unknown>,
      executionTime,
      'error',
      undefined,
      { message: errorMessage }
    );

    throw error;
  }
}
