# Проверочные запросы для тестирования MCP сервера

Этот файл содержит примеры запросов для проверки работы MCP сервера. Минимум 5 запросов, из которых минимум 3 должны привести к вызову MCP-tool.

## Таблица соответствия: запрос → tool → проверка в логе

| № | Текст запроса (для чата) | Ожидаемый tool | Ожидаемые параметры (типичные) | Что проверить в логе |
|---|--------------------------|----------------|--------------------------------|----------------------|
| 1 | «Найди документацию по API» | `read_documentation` | `query`: "API" (или близко) | `tool: "read_documentation"`, `status: "success"`, при наличии результатов — `resultSize > 0`. |
| 2 | «Покажи структуру проекта» | `get_project_structure` | `{}` или `rootDir`/`maxDepth` по умолчанию | `tool: "get_project_structure"`, `status: "success"`. |
| 3 | «Найди файлы с функцией calculate» | `search_project_files` | `searchType: "content"`, `query`: "calculate" | `tool: "search_project_files"`, `status: "success"`. |
| 4 | «Найди все TypeScript файлы в проекте» | `search_project_files` | `searchType: "filetype"`, `query`: "ts" / "TypeScript" | `tool: "search_project_files"`, `status: "success"`. |
| 5 | «Выполни команду npm run build» | `execute_command` | `command: "npm"`, `args`: ["run", "build"] | `tool: "execute_command"`, `status: "success"`, в ответе клиенту — stdout/stderr и exitCode. |

## Запросы, которые вызывают MCP tools

### 1. Запрос на поиск документации
**Текст запроса:** "Найди документацию по API"
- **Ожидаемый tool:** `read_documentation`
- **Параметры:** `{"query": "API"}`
- **Подтверждение:** Проверьте `logs/mcp-calls.log` на наличие записи с `"tool": "read_documentation"`

### 2. Запрос на структуру проекта
**Текст запроса:** "Покажи структуру проекта"
- **Ожидаемый tool:** `get_project_structure`
- **Параметры:** `{}` (используются значения по умолчанию)
- **Подтверждение:** Проверьте `logs/mcp-calls.log` на наличие записи с `"tool": "get_project_structure"`

### 3. Запрос на поиск файлов по содержимому
**Текст запроса:** "Найди файлы с функцией calculate"
- **Ожидаемый tool:** `search_project_files`
- **Параметры:** `{"searchType": "content", "query": "calculate"}`
- **Подтверждение:** Проверьте `logs/mcp-calls.log` на наличие записи с `"tool": "search_project_files"`

### 4. Запрос на поиск файлов по типу
**Текст запроса:** "Найди все TypeScript файлы в проекте"
- **Ожидаемый tool:** `search_project_files`
- **Параметры:** `{"searchType": "filetype", "query": "TypeScript"}`
- **Подтверждение:** Проверьте `logs/mcp-calls.log`

### 5. Запрос на выполнение команды
**Текст запроса:** "Выполни команду npm run build"
- **Ожидаемый tool:** `execute_command`
- **Параметры:** `{"command": "npm", "args": ["run", "build"]}`
- **Подтверждение:** Проверьте `logs/mcp-calls.log` на наличие записи с `"tool": "execute_command"`

## Дополнительные запросы для тестирования

| № | Текст запроса | Ожидаемый tool | Что проверить |
|---|---------------|----------------|---------------|
| 6 | «Найди документацию по установке в папке docs» | `read_documentation` | `query` + `category: "docs"`. |
| 7 | «Найди файл с именем server.ts» | `search_project_files` | `searchType: "filename"`, `query: "server.ts"`. |
| 8 | «Покажи структуру папки src с глубиной 3» | `get_project_structure` | `rootDir: "src"`, `maxDepth: 3`. |
| 9 | «Выполни git status» | `execute_command` | `command: "git"`, `args: ["status"]`. Если Cursor выполняет встроенной командой — см. подсказку ниже. |

### 6. Запрос на поиск документации с фильтром
**Текст запроса:** "Найди документацию по установке в папке docs"
- **Ожидаемый tool:** `read_documentation`
- **Параметры:** `{"query": "установка", "category": "docs"}`

### 7. Запрос на поиск файла по имени
**Текст запроса:** "Найди файл с именем server.ts" или "Найди в проекте файл с именем server.ts"
- **Ожидаемый tool:** `search_project_files`
- **Параметры:** `{"searchType": "filename", "query": "server.ts"}`

**Почему Cursor может использовать встроенный поиск:** модель часто выбирает встроенные инструменты (file search) вместо MCP. В описании tool явно указано использовать MCP для таких запросов; после перезагрузки MCP и пересборки может начать вызываться. **Если по-прежнему встроенный поиск:** попробуйте явно указать MCP: «Вызови search_project_files с searchType filename и query server.ts» или «Use MCP tool search_project_files to find file named server.ts».

### 8. Запрос на структуру с ограничением глубины
**Текст запроса:** "Покажи структуру проекта с глубиной 3 уровня"
- **Ожидаемый tool:** `get_project_structure`
- **Параметры:** `{"maxDepth": 3}`

**Если MCP не вызывается:** попробуйте формулировку, явно упоминающую инструмент или глубину по-английски, например: «Вызови get_project_structure с maxDepth 3» или «Show project structure with depth 3 levels».

### 9. Запрос на выполнение команды (git status)
**Текст запроса:** "Выполни git status"
- **Ожидаемый tool:** `execute_command`
- **Параметры:** `{"command": "git", "args": ["status"]}`

**Если Cursor выполняет команду встроенным средством:** попробуйте явно указать MCP: «Вызови execute_command с command git и args ["status"]» или «Use MCP tool execute_command to run git status».

## Негативные и граничные проверки (по желанию)

- **Неизвестный tool:** запрос, который мог бы привести к вызову несуществующего tool — в логе не должно быть успешной записи для несуществующего имени.
- **execute_command — запрещённая команда:** например «Выполни rm -rf .» — сервер должен отказать (whitelist в `src/config/allowed-commands.ts`), в логе — `status: "error"` или соответствующее сообщение.
- **read_documentation / search с пустым или несуществующим путём:** пустой результат допустим, главное — без падения сервера и с записью в лог.

## Порядок действий при ручной проверке

1. Убедиться, что выполнены предварительные условия (сборка, mcp.json, перезагрузка MCP).
2. Очистить или запомнить последнюю строку в `logs/mcp-calls.log` (чтобы видеть только новые записи).
3. Последовательно отправить в чат Cursor запросы 1–5 (и при необходимости 6–9).
4. После каждого запроса:
   - убедиться, что ответ в чате осмысленный (документация, список файлов, дерево, вывод команды);
   - открыть `logs/mcp-calls.log` и проверить последнюю запись: нужный `tool`, корректные `parameters`, `status: "success"` (или ожидаемая ошибка для негативных кейсов).
5. Итог: все 4 tools вызваны хотя бы один раз, в логах есть соответствующие успешные записи.

## Автоматическая проверка (скрипт)

Из корня проекта после сборки (`npm run build`) можно запустить автоматический тест MCP-сервера:

```bash
npm run test:mcp
```

Скрипт подключается к серверу по stdio, вызывает `listTools` и по очереди вызывает каждый tool с тестовыми параметрами. Все 4 tools должны завершиться без исключения.

## Как проверить вызовы tools

1. Откройте файл `logs/mcp-calls.log` (создаётся при первом вызове)
2. Найдите записи с соответствующими `"tool"` значениями
3. Проверьте параметры в поле `"parameters"`
4. Убедитесь, что `"status": "success"` для успешных вызовов

**Пример фактического лога** (в репозитории): [docs/sample-mcp-calls.log](docs/sample-mcp-calls.log)

## Пример успешного лога

```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "tool": "read_documentation",
  "parameters": {
    "query": "API"
  },
  "executionTimeMs": 150,
  "status": "success",
  "resultSize": 5
}
```
