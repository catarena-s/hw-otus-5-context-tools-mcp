import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * Определяет корень проекта: 1) MCP_PROJECT_ROOT, 2) по пути к загруженному модулю
 * (dist/config/access-limits.js → два уровня вверх = корень), 3) по argv[1], 4) process.cwd().
 * Путь по модулю не зависит от cwd и argv, поэтому поиск работает при запуске из Cursor.
 */
function getProjectRoot(): string {
    const envRoot = process.env.MCP_PROJECT_ROOT;
    if (envRoot && envRoot.trim()) {
        return resolve(envRoot.trim());
    }
    try {
        const currentModulePath = fileURLToPath(import.meta.url);
        const currentDir = dirname(currentModulePath);
        // dist/config/access-limits.js → dist/config → два уровня вверх = корень проекта
        const rootFromModule = resolve(currentDir, '..', '..');
        return rootFromModule;
    } catch (_) {
        // ignore
    }
    try {
        const scriptPath = process.argv[1];
        if (scriptPath) {
            const absScript = resolve(scriptPath);
            const scriptDir = dirname(absScript);
            return resolve(scriptDir, '..');
        }
    } catch (_) {
        // ignore
    }
    return process.cwd();
}

/**
 * Конфигурация ограничений доступа к файлам
 */
export const ACCESS_LIMITS = {
    // Корневая директория проекта (по пути к скрипту или MCP_PROJECT_ROOT)
    PROJECT_ROOT: getProjectRoot(),

    // Паттерны файлов, которые должны быть исключены из доступа
    EXCLUDED_PATTERNS: [
        /\.env$/,
        /\.env\..*$/,
        /.*\.key$/,
        /.*\.pem$/,
        /.*\.p12$/,
        /.*\.pfx$/,
        /config\/secrets\./,
        /secrets\/.*/,
        /\.git\/.*/,
        /node_modules\/.*/,
        /\.next\/.*/,
        /\.cache\/.*/,
        /dist\/.*/,
        /build\/.*/,
        /logs\/.*/,
    ],

    // Максимальный размер файла для чтения (в байтах)
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB

    // Максимальная глубина вложенности для обхода директорий
    MAX_DEPTH: 20,
};

/**
 * Проверяет, находится ли путь в пределах корневой директории проекта.
 * На Windows сравнение без учёта регистра (E: и e:).
 */
export function isWithinProjectRoot(filePath: string): boolean {
    const resolvedPath = resolve(filePath);
    const resolvedRoot = resolve(ACCESS_LIMITS.PROJECT_ROOT);
    if (process.platform === 'win32') {
        return resolvedPath.toLowerCase().startsWith(resolvedRoot.toLowerCase());
    }
    return resolvedPath.startsWith(resolvedRoot);
}

/**
 * Проверяет, должен ли файл быть исключен из доступа.
 * Путь нормализуется к / для совпадения с паттернами на Windows.
 */
export function isExcluded(filePath: string): boolean {
    const normalized = filePath.replace(/\\/g, '/');
    return ACCESS_LIMITS.EXCLUDED_PATTERNS.some((pattern) =>
        pattern.test(normalized)
    );
}
