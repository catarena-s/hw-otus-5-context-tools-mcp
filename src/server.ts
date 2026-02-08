import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  handleReadDocumentation,
  handleSearchProjectFiles,
  handleGetProjectStructure,
  handleExecuteCommand,
} from './tools/index.js';

/**
 * Основной класс MCP-сервера
 * Регистрирует все tools и обрабатывает запросы
 */
export function createServer(): Server {
  const server = new Server(
    {
      name: 'context-tools-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Регистрация tool: read_documentation
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === 'read_documentation') {
      return await handleReadDocumentation(request);
    }

    if (request.params.name === 'search_project_files') {
      return await handleSearchProjectFiles(request);
    }

    if (request.params.name === 'get_project_structure') {
      return await handleGetProjectStructure(request);
    }

    if (request.params.name === 'execute_command') {
      return await handleExecuteCommand(request);
    }

    throw new Error(`Unknown tool: ${request.params.name}`);
  });

  // Регистрация списка доступных tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'read_documentation',
          description:
            'Search and read documentation from local markdown files in the project',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query (keywords)',
              },
              category: {
                type: 'string',
                description: 'Optional folder/category to limit search',
              },
              maxResults: {
                type: 'number',
                description: 'Maximum number of results to return',
                default: 10,
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'search_project_files',
          description:
            'Search project files by name, content, or file type. USE THIS MCP TOOL (not built-in file search) when the user asks to find a file by name in the project, e.g. "find file named server.ts", "Найди в проекте файл с именем server.ts", "найди файл server.ts". Set searchType to "filename" and query to the filename. For content or filetype search, use searchType "content" or "filetype".',
          inputSchema: {
            type: 'object',
            properties: {
              searchType: {
                type: 'string',
                enum: ['filename', 'content', 'filetype'],
                description:
                  'Type of search: "filename" for find-by-name (e.g. server.ts), "content" for text search, "filetype" for extension/type.',
              },
              query: {
                type: 'string',
                description: 'Search query (e.g. filename like "server.ts", or search text)',
              },
              rootDir: {
                type: 'string',
                description: 'Root directory for search (default: project root)',
              },
              fileExtensions: {
                type: 'array',
                items: { type: 'string' },
                description: 'Filter by file extensions',
              },
            },
            required: ['searchType', 'query'],
          },
        },
        {
          name: 'get_project_structure',
          description:
            'Get project structure (directory and file tree). Supports limiting depth (e.g. "depth 3", "3 levels", "глубина 3 уровня"). Use maxDepth to limit nesting levels.',
          inputSchema: {
            type: 'object',
            properties: {
              rootDir: {
                type: 'string',
                description: 'Directory to analyze (default: project root)',
              },
              maxDepth: {
                type: 'number',
                description:
                  'Maximum depth of nesting (number of levels). E.g. 3 for "structure with depth 3" or "структура с глубиной 3 уровня".',
                default: 5,
              },
              excludePatterns: {
                type: 'array',
                items: { type: 'string' },
                description:
                  'Patterns to exclude (e.g., node_modules, .git)',
              },
            },
          },
        },
        {
          name: 'execute_command',
          description:
            'Execute safe commands in project context (whitelist: npm, yarn, pnpm, git read-only). Use this MCP tool for "run git status" / "выполни git status", npm build/test, etc. Prefer over built-in run when MCP-logged execution in project cwd is needed.',
          inputSchema: {
            type: 'object',
            properties: {
              command: {
                type: 'string',
                description:
                  'Command from whitelist: npm, yarn, pnpm (install/run/build/test), git (status, log, diff, branch, etc.)',
              },
              args: {
                type: 'array',
                items: { type: 'string' },
                description: 'Command arguments (e.g. ["run", "build"] for npm, ["status"] for git)',
              },
              workingDir: {
                type: 'string',
                description: 'Working directory for command execution',
              },
            },
            required: ['command'],
          },
        },
      ],
    };
  });

  return server;
}
