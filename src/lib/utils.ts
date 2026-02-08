import { readFile, stat } from 'fs/promises';
import { join, extname } from 'path';

/**
 * Вспомогательные функции
 * Поддержка русского и других языков: нормализация Unicode (NFC), учёт пунктуации при поиске слов.
 */

/** Нормализует строку для поиска: NFC + нижний регистр (корректно для кириллицы и Unicode) */
export function normalizeForSearch(s: string): string {
  return s.normalize('NFC').toLowerCase();
}

/** Разбивает запрос на слова (пробелы + пунктуация по краям), подходит для русского и английского */
function splitQueryWords(query: string): string[] {
  const normalized = normalizeForSearch(query);
  const words = normalized.split(/\s+/).filter((w) => w.length > 0);
  return words.map((w) => w.replace(/^[\p{P}\s]+|[\p{P}\s]+$/gu, '').trim()).filter((w) => w.length > 0);
}

/**
 * Читает файл безопасно с ограничением размера
 */
export async function safeReadFile(
  filePath: string,
  maxSize: number
): Promise<string> {
  const stats = await stat(filePath);
  if (stats.size > maxSize) {
    throw new Error(`File too large: ${stats.size} bytes (max: ${maxSize})`);
  }
  return readFile(filePath, 'utf-8');
}

/**
 * Определяет тип файла по расширению
 */
export function getFileType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  const typeMap: Record<string, string> = {
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript React',
    '.js': 'JavaScript',
    '.jsx': 'JavaScript React',
    '.json': 'JSON',
    '.md': 'Markdown',
    '.html': 'HTML',
    '.css': 'CSS',
    '.scss': 'SCSS',
    '.py': 'Python',
    '.java': 'Java',
    '.go': 'Go',
    '.rs': 'Rust',
    '.cpp': 'C++',
    '.c': 'C',
    '.h': 'C Header',
    '.xml': 'XML',
    '.yaml': 'YAML',
    '.yml': 'YAML',
  };
  return typeMap[ext] || 'Unknown';
}

/**
 * Вычисляет простую оценку релевантности на основе количества совпадений.
 * Поддерживает русский и любой Unicode: нормализация NFC, учёт пунктуации.
 */
export function calculateRelevanceScore(
  text: string,
  query: string
): number {
  const normalizedText = normalizeForSearch(text);
  const queryWords = splitQueryWords(query);

  if (queryWords.length === 0) return 0;

  let matches = 0;
  for (const word of queryWords) {
    if (normalizedText.includes(word)) {
      matches++;
    }
  }

  return Math.min(matches / queryWords.length, 1.0);
}

/**
 * Извлекает заголовок из markdown контента
 */
export function extractMarkdownTitle(content: string): string {
  // Ищем первый заголовок (# Title или ## Title)
  const match = content.match(/^#{1,6}\s+(.+)$/m);
  if (match) {
    return match[1].trim();
  }

  // Если заголовка нет, берем первую строку
  const firstLine = content.split('\n')[0].trim();
  return firstLine || 'Untitled';
}

/**
 * Обрезает текст до указанной длины, сохраняя целые слова
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).replace(/\s+\S*$/, '') + '...';
}

/**
 * Находит номер строки, на которой начинается указанный текст.
 * Нормализация NFC для корректного сравнения русского и Unicode.
 */
export function findLineNumber(content: string, searchText: string): number {
  const normSearch = searchText.normalize('NFC');
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].normalize('NFC').includes(normSearch)) {
      return i + 1; // Нумерация с 1
    }
  }
  return 1;
}
