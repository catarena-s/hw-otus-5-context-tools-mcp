import {
  safeWalkDirectory,
  safeReadFileWithValidation,
  isFileAccessible,
} from '../lib/file-access.js';
import { logger } from '../lib/logger.js';
import { getFileType, normalizeForSearch } from '../lib/utils.js';
import type {
  SearchProjectFilesParams,
  FileMatch,
  SearchType,
} from '../lib/types.js';
import { ACCESS_LIMITS } from '../config/access-limits.js';
import { join, extname, basename } from 'path';

/**
 * Tool для поиска файлов проекта по имени или содержимому
 */
export async function handleSearchProjectFiles(
  request: { params: { name: string; arguments?: unknown } }
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const startTime = Date.now();
  let resultSize = 0;

  try {
    const args = request.params?.arguments as SearchProjectFilesParams;

    if (!args || !args.searchType || !args.query) {
      throw new Error('searchType and query parameters are required');
    }

    const { searchType, query, rootDir, fileExtensions } = args;
    const searchRoot = rootDir
      ? join(ACCESS_LIMITS.PROJECT_ROOT, rootDir)
      : ACCESS_LIMITS.PROJECT_ROOT;

    const results: FileMatch[] = [];

    // Получаем список всех файлов
    const allFiles = await safeWalkDirectory(searchRoot);

    // Фильтруем по расширениям, если указаны
    let filteredFiles = allFiles;
    if (fileExtensions && fileExtensions.length > 0) {
      filteredFiles = allFiles.filter((file) => {
        const ext = extname(file).toLowerCase();
        return fileExtensions.some((allowedExt) =>
          ext.includes(allowedExt.toLowerCase())
        );
      });
    }

    // Выполняем поиск в зависимости от типа (нормализация NFC для русского и Unicode)
    if (searchType === 'filename') {
      // Поиск по имени файла (basename для корректной работы на Windows с \ и /)
      const queryNorm = normalizeForSearch(query);
      for (const file of filteredFiles) {
        const fileName = basename(file);
        if (normalizeForSearch(fileName).includes(queryNorm)) {
          const fullPath = join(ACCESS_LIMITS.PROJECT_ROOT, file);
          if (await isFileAccessible(fullPath)) {
            results.push({
              filePath: file,
              matches: [],
              fileType: getFileType(file),
              lineNumbers: [],
            });
          }
        }
      }
    } else if (searchType === 'filetype') {
      // Поиск по типу файла
      const queryNorm = normalizeForSearch(query);
      for (const file of filteredFiles) {
        const fileType = normalizeForSearch(getFileType(file));
        if (fileType.includes(queryNorm)) {
          const fullPath = join(ACCESS_LIMITS.PROJECT_ROOT, file);
          if (await isFileAccessible(fullPath)) {
            results.push({
              filePath: file,
              matches: [],
              fileType: getFileType(file),
              lineNumbers: [],
            });
          }
        }
      }
    } else if (searchType === 'content') {
      // Поиск по содержимому файла (нормализация для русского и Unicode)
      const queryNorm = normalizeForSearch(query);
      for (const file of filteredFiles) {
        try {
          const fullPath = join(ACCESS_LIMITS.PROJECT_ROOT, file);
          if (!(await isFileAccessible(fullPath))) continue;

          const content = await safeReadFileWithValidation(fullPath);
          const lines = content.split('\n');
          const matches: FileMatch['matches'] = [];
          const lineNumbers: number[] = [];

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (normalizeForSearch(line).includes(queryNorm)) {
              lineNumbers.push(i + 1);
              const contextBefore = i > 0 ? [lines[i - 1]] : [];
              const contextAfter =
                i < lines.length - 1 ? [lines[i + 1]] : [];

              matches.push({
                line: line.trim(),
                lineNumber: i + 1,
                contextBefore,
                contextAfter,
              });
            }
          }

          if (matches.length > 0) {
            results.push({
              filePath: file,
              matches,
              fileType: getFileType(file),
              lineNumbers,
            });
          }
        } catch (error) {
          // Пропускаем файлы, к которым нет доступа
          logger.logDebug('search_project_files', `Skipped file ${file}`, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    resultSize = results.length;

    const executionTime = Date.now() - startTime;
    await logger.logToolCall(
      'search_project_files',
      args as unknown as Record<string, unknown>,
      executionTime,
      'success',
      resultSize
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    await logger.logToolCall(
      'search_project_files',
      (request.params?.arguments || {}) as Record<string, unknown>,
      executionTime,
      'error',
      undefined,
      { message: errorMessage }
    );

    throw error;
  }
}
