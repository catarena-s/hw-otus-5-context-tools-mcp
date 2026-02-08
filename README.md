# Context Tools MCP Server

Универсальный MCP (Model Context Protocol) сервер, предоставляющий инструменты для работы с документацией, навигации по проекту и выполнения безопасных команд. Совместим с любыми MCP-клиентами, включая Cursor IDE, Claude Desktop и другие.

## Принципы MCP

IDE или агент подключается к MCP-серверу через транспорт (в данном проекте — **stdio**): клиент запускает процесс сервера (`node dist/index.js`) и общается с ним по stdin/stdout по протоколу MCP. Сервер регистрирует доступные tools, клиент запрашивает их список (`ListTools`) и вызывает нужный tool (`CallTool`) с параметрами.

**Tool** в контексте этого сервера — именованная операция с входными параметрами (JSON Schema), которую агент вызывает по запросу пользователя. Сервер выполняет операцию (поиск документации, чтение файлов, выполнение команды) и возвращает структурированный результат (JSON), а не произвольный текст. Каждый tool имеет понятное имя, описание и схему параметров.

## Описание сервера

Этот MCP-сервер предоставляет набор инструментов (tools) для работы с кодом и контекстом проекта. Поиск и сравнение строк поддерживают **русский язык и Unicode** (нормализация NFC, учёт пунктуации, сортировка с учётом локали).

- **Doc Context Tools**: Поиск и чтение документации из локальных markdown-файлов
- **Project Helper Tools**: Навигация по структуре проекта, поиск файлов
- **DevOps Tools**: Выполнение безопасных команд в контексте проекта

## Доступные Tools

| Tool | Описание | Параметры |
|------|----------|-----------|
| `read_documentation` | Поиск и чтение документации из локальных markdown-файлов проекта. | `query`* (string) — поисковый запрос;<br>`category` (string) — папка/категория;<br>`maxResults` (number, по умолчанию 10) |
| `search_project_files` | Поиск файлов по имени, содержимому или типу. | `searchType`* (`filename` \| `content` \| `filetype`);<br>`query`* (string);<br>`rootDir` (string);<br>`fileExtensions` (string[]) |
| `get_project_structure` | Получение структуры проекта (дерево папок и файлов). | `rootDir` (string);<br>`maxDepth` (number, по умолчанию 5);<br>`excludePatterns` (string[]) |
| `execute_command` | Выполнение безопасных команд в контексте проекта (whitelist). | `command`* (string);<br>`args` (string[]);<br>`workingDir` (string) |

\* обязательный параметр

## Примеры вызова

### `read_documentation`

**Вызов:**
```
{
  "query": "API",
  "category": "docs",
  "maxResults": 5
}
```
**Результат:** массив объектов  `{ filePath, title, content, relevanceScore, lineNumber }`

### `search_project_files`

**Вызов:**
```
{
  "searchType": "content",
  "query": "function calculate",
  "fileExtensions": [".ts", ".js"]
}
```
**Результат:**  массив  `{ filePath, matches, fileType, lineNumbers }`

### `get_project_structure`

**Вызов:**
```
{
   "rootDir": "src",
   "maxDepth": 3,
   "excludePatterns": ["node_modules", ".git"]
}
```
**Результат:** объект  `{ name, type, size?, children? }`

### `execute_command`

**Вызов:**
```
{
  "command": "npm",
  "args": ["run", "build"],
  "workingDir": "."
}
```
**Результат:** объект  `{ stdout, stderr, exitCode, executionTime }`

## Ограничения доступа

### Файловая система

- **Доступ только в пределах корневой папки проекта**: Сервер не может читать файлы вне корневой директории проекта.

- **Определение корня проекта**: По умолчанию корень берётся по пути к запущенному скрипту (родитель каталога `dist/`), а не по `process.cwd()`, чтобы поиск и структура работали в каталоге проекта даже при запуске из Cursor с другим рабочим каталогом. При необходимости задайте корень вручную переменной окружения **`MCP_PROJECT_ROOT`** (абсолютный путь к папке проекта).
- **Исключение чувствительных файлов**: Следующие файлы и паттерны автоматически исключаются из доступа:
  - `.env`, `.env.*` - файлы с переменными окружения
  - `*.key`, `*.pem`, `*.p12`, `*.pfx` - файлы с ключами
  - `config/secrets.*` - файлы с секретами
  - `secrets/` - директория с секретами
  - `.git/` - директория Git
  - `node_modules/`, `dist/`, `build/`, `.next/`, `.cache/`, `logs/` - служебные директории

### Команды (DevOps Tool)

- **Whitelist разрешенных команд**: Разрешены только следующие команды:
  - **npm/yarn/pnpm**: `install`, `run`, `test`, `build`, `start`, `version`, `list`
  - **git** (только чтение): `status`, `log`, `diff`, `show`, `branch`, `remote`, `config`
  - **Build команды**: `npm run build`, `yarn build`, `pnpm build`

- **Запрещенные команды**: Следующие команды никогда не разрешаются:
  - `rm`, `rmdir`, `del`, `delete` - удаление файлов
  - `format`, `fdisk`, `mkfs` - форматирование дисков
  - `shutdown`, `reboot` - системные команды
  - `sudo`, `su` - повышение привилегий

- **Ограничения рабочей директории**: Команды могут выполняться только в пределах корневой директории проекта

## Настройка

Скопируйте `.env.example` в `.env` и при необходимости задайте переменные:

```bash
cp .env.example .env
```

| Переменная | Описание |
|------------|----------|
| `MCP_PROJECT_ROOT` | Опционально. Абсолютный путь к корню проекта. Задайте, если сервер запускается из другого каталога и автоматическое определение корня (по пути к `dist/`) даёт неверный результат. |

Без `.env` сервер работает с автоматическим определением корня проекта.

## Установка и запуск

1. Установите зависимости:
```bash
npm install
```

2. Соберите проект:
```bash
npm run build
```

3. Запуск сервера:
```bash
npm start
```

Или напрямую:
```bash
node dist/index.js
```

**Примечание:** Сервер использует stdio транспорт и предназначен для запуска MCP-клиентами (Cursor, Claude Desktop и т.д.). Для ручного тестирования используйте MCP-клиент или проверьте логи в `logs/mcp-calls.log`.

## Интеграция с MCP-клиентами

### Cursor IDE

Подробные инструкции по интеграции с Cursor IDE см. в файле [cursor-install.md](./cursor-install.md).

**Подтверждение подключения** — MCP-сервер «context-tools-mcp» запущен, четыре tools доступны в панели IDE:

![MCP Server: context-tools-mcp с инструментами read_documentation, search_project_files, get_project_structure, execute_command](docs/mcp-server-screenshot.png)

## Логирование

Все вызовы tools логируются в структурированном JSON формате в файл `logs/mcp-calls.log`.

### Формат лога:
```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "tool": "read_documentation",
  "parameters": { "query": "API" },
  "executionTimeMs": 150,
  "status": "success",
  "resultSize": 5
}
```

### Характеристики логирования:
- **Ротация логов**: Максимальный размер файла 10MB, хранение до 5 файлов
- **Уровни логирования**: debug (детальные параметры), info (нормальная работа), error (ошибки)
- **Безопасность**: Чувствительные данные (пароли, токены) автоматически скрываются в логах

### Просмотр логов:
Логи находятся в директории `logs/`:
- `logs/mcp-calls.log` - текущий лог
- `logs/mcp-calls.1.log` - предыдущий лог (после ротации)
- и т.д.

**Пример лога** (подтверждение вызовов tools в репозитории): [docs/sample-mcp-calls.log](docs/sample-mcp-calls.log)

## Ссылки на код

### 1. MCP‑сервер:
  - инициализация и запуск — [`src/index.ts`](src/index.ts) (L8–L37); 
  - регистрация инструментов и обработка вызовов — [`src/server.ts`](src/server.ts) (L17–L166).

### 2. Инструменты (реализация, логирование, пример лога):

| Tool | Реализация | Логирование (успех / ошибка) | Пример записи в логе |
|------|------------|------------------------------|----------------------|
| `read_documentation` | [`src/tools/doc-context.ts`](src/tools/doc-context.ts) L16–L124 | L93–L99 / L114–L121 | `"tool": "read_documentation"`, `"status": "success"`, `"resultSize"` — см. формат выше |
| `search_project_files` | [`src/tools/project-helper.ts`](src/tools/project-helper.ts) L19–L170 | L138–L144 / L159–L166 | `"tool": "search_project_files"` |
| `get_project_structure` | [`src/tools/project-structure.ts`](src/tools/project-structure.ts) L14–L146 | L115–L121 / L138–L144 | `"tool": "get_project_structure"` |
| `execute_command` | [`src/tools/devops-tool.ts`](src/tools/devops-tool.ts) L14–L111 | L76–L85 / L100–L107 | `"tool": "execute_command"` |

### 3. Общая запись в лог: 
[`src/lib/logger.ts`](src/lib/logger.ts) — `logToolCall` L121–L145, запись в файл L64–L89, ротация L92–L118.

### 4. Пример запроса и подтверждение вызова tool:
запрос «Найди документацию по API» должен вызывать tool `read_documentation`. Подтверждение — запись в `logs/mcp-calls.log` с полем `"tool": "read_documentation"` и параметрами вызова. 

**Пример фактического лога** (подтверждение вызовов tools) — [docs/sample-mcp-calls.log](docs/sample-mcp-calls.log). В этом файле зафиксированы примеры записей для всех четырёх tools с `status: "success"`.

Дополнительные проверочные запросы — в [TEST_REQUESTS.md](TEST_REQUESTS.md).

### 5. Контракт результатов tool (формат ответа):
- описание полей результата по каждому tool — [раздел «Доступные Tools»](#доступные-tools); 
- типы TypeScript — [`src/lib/types.ts`](src/lib/types.ts) (L5–L68: параметры и результаты каждого tool).

