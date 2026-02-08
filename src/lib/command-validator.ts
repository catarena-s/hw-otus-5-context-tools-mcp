import { isCommandAllowed, isCommandForbidden } from '../config/allowed-commands.js';
import { resolve } from 'path';
import { ACCESS_LIMITS, isWithinProjectRoot } from '../config/access-limits.js';

/**
 * Валидация команд для DevOps tool
 */

/**
 * Валидирует команду перед выполнением
 */
export function validateCommand(
  command: string,
  args: string[] = [],
  workingDir?: string
): { valid: boolean; error?: string } {
  // Проверка на запрещенные команды
  if (isCommandForbidden(command)) {
    return {
      valid: false,
      error: `Command is forbidden: ${command}`,
    };
  }

  // Проверка на разрешенные команды
  if (!isCommandAllowed(command, args)) {
    return {
      valid: false,
      error: `Command is not allowed: ${command}. Only whitelisted commands are permitted.`,
    };
  }

  // Проверка рабочей директории
  if (workingDir) {
    const resolvedDir = resolve(workingDir);
    if (!isWithinProjectRoot(resolvedDir)) {
      return {
        valid: false,
        error: `Working directory is outside project root: ${workingDir}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Безопасно извлекает команду и аргументы из строки
 */
export function parseCommand(commandString: string): {
  command: string;
  args: string[];
} {
  const parts = commandString.trim().split(/\s+/);
  const command = parts[0];
  const args = parts.slice(1);

  return { command, args };
}
