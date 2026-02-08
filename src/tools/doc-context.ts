import { safeWalkDirectory, safeReadFileWithValidation } from '../lib/file-access.js';
import { logger } from '../lib/logger.js';
import {
  calculateRelevanceScore,
  extractMarkdownTitle,
  truncateText,
  findLineNumber,
  normalizeForSearch,
} from '../lib/utils.js';
import type { ReadDocumentationParams, DocumentationResult } from '../lib/types.js';
import { ACCESS_LIMITS } from '../config/access-limits.js';
import { join } from 'path';

/**
 * Tool для поиска и чтения документации из локальных markdown-файлов
 */
export async function handleReadDocumentation(
  request: { params: { name: string; arguments?: unknown } }
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const startTime = Date.now();
  let resultSize = 0;

  try {
    const args = request.params?.arguments as ReadDocumentationParams;

    if (!args || !args.query) {
      throw new Error('Query parameter is required');
    }

    const query = args.query;
    const category = args.category;
    const maxResults = args.maxResults || 10;

    // Ищем все markdown файлы в проекте
    const allFiles = await safeWalkDirectory(ACCESS_LIMITS.PROJECT_ROOT);
    const markdownFiles = allFiles.filter(
      (file) => file.endsWith('.md') || file.endsWith('.markdown')
    );

    // Фильтруем по категории, если указана (нормализация для русского и Unicode)
    const filteredFiles = category
      ? markdownFiles.filter((file) =>
        normalizeForSearch(file).includes(normalizeForSearch(category))
      )
      : markdownFiles;

    const results: DocumentationResult[] = [];

    // Читаем и анализируем каждый файл
    for (const file of filteredFiles) {
      if (results.length >= maxResults) break;

      try {
        const fullPath = join(ACCESS_LIMITS.PROJECT_ROOT, file);
        const content = await safeReadFileWithValidation(fullPath);

        // Разбиваем на разделы (по заголовкам)
        const sections = content.split(/(?=^#{1,6}\s)/m);

        for (const section of sections) {
          if (results.length >= maxResults) break;

          const relevanceScore = calculateRelevanceScore(section, query);

          // Если релевантность достаточна, добавляем результат
          if (relevanceScore > 0) {
            const title = extractMarkdownTitle(section);
            const truncatedContent = truncateText(section, 1000);
            const lineNumber = findLineNumber(content, section.substring(0, 50));

            results.push({
              filePath: file,
              title,
              content: truncatedContent,
              relevanceScore,
              lineNumber,
            });
          }
        }
      } catch (error) {
        // Пропускаем файлы, к которым нет доступа
        logger.logDebug('read_documentation', `Skipped file ${file}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Сортируем по релевантности
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    resultSize = results.length;

    const executionTime = Date.now() - startTime;
    await logger.logToolCall(
      'read_documentation',
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
      'read_documentation',
      (request.params?.arguments || {}) as Record<string, unknown>,
      executionTime,
      'error',
      undefined,
      { message: errorMessage }
    );

    throw error;
  }
}
