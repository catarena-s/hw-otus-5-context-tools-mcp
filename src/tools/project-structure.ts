import { safeWalkDirectory, safeReadDirectory } from '../lib/file-access.js';
import { logger } from '../lib/logger.js';
import type {
  GetProjectStructureParams,
  ProjectStructureNode,
} from '../lib/types.js';
import { ACCESS_LIMITS } from '../config/access-limits.js';
import { join, resolve, basename } from 'path';
import { stat } from 'fs/promises';

/**
 * Tool для получения структуры проекта
 */
export async function handleGetProjectStructure(
  request: { params: { name: string; arguments?: unknown } }
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const startTime = Date.now();

  try {
    const args = request.params?.arguments as GetProjectStructureParams;

    const rootDir = args?.rootDir
      ? join(ACCESS_LIMITS.PROJECT_ROOT, args.rootDir)
      : ACCESS_LIMITS.PROJECT_ROOT;

    const maxDepth = args?.maxDepth || 5;
    const excludePatterns = args?.excludePatterns || [
      'node_modules',
      '.git',
      'dist',
      'build',
      '.next',
      'logs',
    ];

    // Рекурсивно строим дерево структуры
    const buildTree = async (
      dirPath: string,
      currentDepth: number = 0
    ): Promise<ProjectStructureNode | null> => {
      if (currentDepth >= maxDepth) {
        return null;
      }

      const dirName = basename(dirPath);
      const resolvedPath = resolve(dirPath);

      // Проверяем, не исключена ли директория
      const shouldExclude = excludePatterns.some((pattern) =>
        resolvedPath.includes(pattern)
      );
      if (shouldExclude) {
        return null;
      }

      try {
        const entries = await safeReadDirectory(dirPath);
        const children: ProjectStructureNode[] = [];

        for (const entry of entries) {
          const fullPath = join(dirPath, entry);
          const entryResolved = resolve(fullPath);

          // Пропускаем исключенные паттерны
          if (
            excludePatterns.some((pattern) => entryResolved.includes(pattern))
          ) {
            continue;
          }

          try {
            const stats = await stat(entryResolved);

            if (stats.isDirectory()) {
              const childNode = await buildTree(entryResolved, currentDepth + 1);
              if (childNode) {
                children.push(childNode);
              }
            } else {
              children.push({
                name: basename(entryResolved),
                type: 'file',
                size: stats.size,
              });
            }
          } catch {
            // Пропускаем файлы, к которым нет доступа
            continue;
          }
        }

        return {
          name: dirName || '/',
          type: 'directory',
          children: children.sort((a, b) => {
            // Сначала директории, потом файлы
            if (a.type !== b.type) {
              return a.type === 'directory' ? -1 : 1;
            }
            // localeCompare с учётом русского и Unicode
            return a.name.localeCompare(b.name, ['ru', 'en']);
          }),
        };
      } catch (error) {
        logger.logDebug('get_project_structure', `Error reading ${dirPath}`, {
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      }
    };

    const structure = await buildTree(rootDir);

    const executionTime = Date.now() - startTime;
    await logger.logToolCall(
      'get_project_structure',
      (args || {}) as Record<string, unknown>,
      executionTime,
      'success',
      structure ? 1 : 0
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(structure, null, 2),
        },
      ],
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    await logger.logToolCall(
      'get_project_structure',
      (request.params?.arguments || {}) as Record<string, unknown>,
      executionTime,
      'error',
      undefined,
      { message: errorMessage }
    );

    throw error;
  }
}
