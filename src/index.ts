import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';

/**
 * Точка входа MCP-сервера
 * Инициализирует сервер и stdio транспорт
 */
async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();

  // Обработка ошибок
  server.onerror = (error) => {
    console.error('[MCP Server Error]', error);
  };

  // Graceful shutdown
  process.on('SIGINT', async () => {
    await server.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await server.close();
    process.exit(0);
  });

  // Запуск сервера
  await server.connect(transport);

  console.error(`MCP Server started (stdio, PID: ${process.pid})`);
}

main().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
