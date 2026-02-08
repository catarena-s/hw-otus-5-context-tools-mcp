/**
 * Automated MCP server test script.
 * Spawns the MCP server via stdio, connects with MCP Client, calls listTools and callTool for each tool.
 * Run from project root: npm run test:mcp (after npm run build).
 */

import { Client } from '@modelcontextprotocol/sdk/client';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { existsSync } from 'fs';
import { join } from 'path';

const PROJECT_ROOT = process.cwd();
const SERVER_ENTRY = join(PROJECT_ROOT, 'dist', 'index.js');

const EXPECTED_TOOLS = [
  'read_documentation',
  'search_project_files',
  'get_project_structure',
  'execute_command',
];

const TOOL_CALLS = [
  { name: 'read_documentation', arguments: { query: 'API' } },
  { name: 'get_project_structure', arguments: {} },
  { name: 'search_project_files', arguments: { searchType: 'filename', query: 'server.ts' } },
  { name: 'search_project_files', arguments: { searchType: 'content', query: 'calculate' } },
  { name: 'search_project_files', arguments: { searchType: 'filetype', query: 'ts' } },
  // Use git status (safe, fast) instead of npm run build for automated test
  { name: 'execute_command', arguments: { command: 'git', args: ['status'] } },
];

function log(msg) {
  console.log(`[test-mcp] ${msg}`);
}

async function main() {
  if (!existsSync(SERVER_ENTRY)) {
    console.error(`[test-mcp] Server not found at ${SERVER_ENTRY}. Run: npm run build`);
    process.exit(1);
  }

  const transport = new StdioClientTransport({
    command: 'node',
    args: [SERVER_ENTRY],
    cwd: PROJECT_ROOT,
  });

  const client = new Client(
    { name: 'test-mcp-client', version: '1.0.0' },
    { capabilities: {} }
  );

  client.onerror = (err) => log(`Client error: ${err.message}`);

  try {
    log('Connecting to MCP server...');
    await client.connect(transport);
    log('Connected.');

    // 1. listTools
    log('Listing tools...');
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    for (const expected of EXPECTED_TOOLS) {
      if (!names.includes(expected)) {
        throw new Error(`Expected tool "${expected}" not in list. Got: ${names.join(', ')}`);
      }
    }
    log(`OK: ${tools.length} tools (${names.join(', ')})`);

    // 2. callTool for each test case
    for (const { name, arguments: args } of TOOL_CALLS) {
      log(`Calling tool: ${name} with ${JSON.stringify(args)}`);
      const result = await client.callTool({ name, arguments: args });
      if (result.isError) {
        throw new Error(`Tool ${name} returned error: ${JSON.stringify(result.content)}`);
      }
      const textContent = result.content?.find((c) => c.type === 'text');
      const preview = textContent?.text?.slice(0, 200) ?? JSON.stringify(result.content?.slice(0, 1));
      log(`OK: ${name} -> ${preview}${(textContent?.text?.length ?? 0) > 200 ? '...' : ''}`);
      // Проверка: поиск по имени server.ts должен найти src/server.ts
      if (name === 'search_project_files' && args?.searchType === 'filename' && args?.query === 'server.ts') {
        const data = JSON.parse(textContent?.text ?? '[]');
        const found = Array.isArray(data) && data.some((f) => (f.filePath || '').includes('server.ts'));
        if (!found) {
          throw new Error(`search_project_files filename server.ts expected at least one file containing server.ts, got: ${textContent?.text ?? '[]'}`);
        }
      }
    }

    log('All tests passed.');
  } finally {
    await transport.close();
  }
}

main().catch((err) => {
  console.error('[test-mcp]', err.message || err);
  process.exit(1);
});
