# Настройка MCP сервера в Cursor

## 1. Запуск сервера

Сервер уже собран и готов к запуску. Он работает через stdio транспорт, поэтому Cursor будет запускать его автоматически.

## 2. Конфигурация для Cursor

### Вариант 1: Глобальная конфигурация (рекомендуется)

Откройте файл конфигурации Cursor:
- Windows: `%APPDATA%\Cursor\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`
- Или через настройки: Settings → Features → MCP → Edit Config

Добавьте следующую конфигурацию:

```json
{
  "mcpServers": {
    "context-tools-mcp": {
      "command": "node",
      "args": [
        "E:\\my\\otus\\hw_4\\dist\\index.js"
      ],
      "cwd": "E:\\my\\otus\\hw_4"
    }
  }
}
```

**Важно:** Замените `E:\\my\\otus\\hw_4` на абсолютный путь к вашему проекту.

### Вариант 2: Локальная конфигурация в проекте

Если вы хотите использовать сервер только для этого проекта, создайте файл `.cursor/mcp.json` в корне проекта:

```json
{
  "mcpServers": {
    "context-tools-mcp": {
      "command": "node",
      "args": [
        "${workspaceFolder}/dist/index.js"
      ],
      "cwd": "${workspaceFolder}"
    }
  }
}
```

Или используйте абсолютный путь:

```json
{
  "mcpServers": {
    "context-tools-mcp": {
      "command": "node",
      "args": [
        "E:\\my\\otus\\hw_4\\dist\\index.js"
      ],
      "cwd": "E:\\my\\otus\\hw_4"
    }
  }
}
```

## 3. Перезагрузка Cursor

После добавления конфигурации:
1. Перезагрузите Cursor IDE (Ctrl+Shift+P → "Reload Window")
2. Или закройте и откройте Cursor заново

## 4. Проверка работы

После перезагрузки проверьте:
1. Откройте чат в Cursor
2. Попробуйте использовать tools:
   - "Найди документацию по API"
   - "Покажи структуру проекта"
   - "Найди файлы с функцией calculate"

3. Проверьте логи в `logs/mcp-calls.log` - должны появиться записи о вызовах

## Текущий путь к проекту

Ваш проект находится по адресу: `E:\my\otus\hw_4`

Используйте этот путь в конфигурации выше.
