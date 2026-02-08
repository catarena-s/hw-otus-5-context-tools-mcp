import { readFile, stat, readdir } from 'fs/promises';
import { resolve, join, relative } from 'path';
import { ACCESS_LIMITS, isWithinProjectRoot, isExcluded } from '../config/access-limits.js';
import { safeReadFile } from './utils.js';

/**
 * Утилиты с ограничением доступа к файлам
 */

/**
 * Валидирует путь к файлу и проверяет ограничения доступа
 */
export function validateFilePath(filePath: string): {
  valid: boolean;
  error?: string;
} {
  const resolvedPath = resolve(filePath);

  // Проверка на выход за границы проекта
  if (!isWithinProjectRoot(resolvedPath)) {
    return {
      valid: false,
      error: `Access denied: Path is outside project root: ${filePath}`,
    };
  }

  // Проверка на исключенные файлы
  if (isExcluded(resolvedPath)) {
    return {
      valid: false,
      error: `Access denied: File is excluded: ${filePath}`,
    };
  }

  return { valid: true };
}

/**
 * Безопасно читает файл с проверкой ограничений
 */
export async function safeReadFileWithValidation(
  filePath: string
): Promise<string> {
  const validation = validateFilePath(filePath);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const resolvedPath = resolve(filePath);

  // Проверка размера файла
  const stats = await stat(resolvedPath);
  if (stats.size > ACCESS_LIMITS.MAX_FILE_SIZE) {
    throw new Error(
      `File too large: ${stats.size} bytes (max: ${ACCESS_LIMITS.MAX_FILE_SIZE})`
    );
  }

  return safeReadFile(resolvedPath, ACCESS_LIMITS.MAX_FILE_SIZE);
}

/**
 * Безопасно читает директорию с проверкой ограничений
 */
export async function safeReadDirectory(
  dirPath: string
): Promise<string[]> {
  const validation = validateFilePath(dirPath);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const resolvedPath = resolve(dirPath);
  const entries = await readdir(resolvedPath, { withFileTypes: true });

  return entries
    .map((entry) => {
      const fullPath = join(resolvedPath, entry.name);
      const relPath = relative(ACCESS_LIMITS.PROJECT_ROOT, fullPath);

      // Фильтруем исключенные файлы
      if (isExcluded(fullPath)) {
        return null;
      }

      return entry.isDirectory() ? `${relPath}/` : relPath;
    })
    .filter((path): path is string => path !== null);
}

/**
 * Рекурсивно обходит директорию с ограничением глубины
 */
export async function safeWalkDirectory(
  dirPath: string,
  maxDepth: number = ACCESS_LIMITS.MAX_DEPTH,
  currentDepth: number = 0
): Promise<string[]> {
  if (currentDepth >= maxDepth) {
    return [];
  }

  const validation = validateFilePath(dirPath);
  if (!validation.valid) {
    return [];
  }

  const resolvedPath = resolve(dirPath);
  const files: string[] = [];

  try {
    const entries = await readdir(resolvedPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(resolvedPath, entry.name);

      // Пропускаем исключенные файлы
      if (isExcluded(fullPath)) {
        continue;
      }

      const relPath = relative(ACCESS_LIMITS.PROJECT_ROOT, fullPath);

      if (entry.isDirectory()) {
        // Рекурсивно обходим поддиректории
        const subFiles = await safeWalkDirectory(
          fullPath,
          maxDepth,
          currentDepth + 1
        );
        files.push(...subFiles);
      } else {
        files.push(relPath);
      }
    }
  } catch (error) {
    // Игнорируем ошибки доступа к отдельным файлам
    console.error(`Error reading directory ${dirPath}:`, error);
  }

  return files;
}

/**
 * Проверяет, существует ли файл и доступен ли он
 */
export async function isFileAccessible(filePath: string): Promise<boolean> {
  const validation = validateFilePath(filePath);
  if (!validation.valid) {
    return false;
  }

  try {
    const resolvedPath = resolve(filePath);
    const stats = await stat(resolvedPath);
    return stats.isFile();
  } catch {
    return false;
  }
}
