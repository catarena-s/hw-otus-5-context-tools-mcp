/**
 * TypeScript типы для MCP tools и конфигурации
 */

// Типы для read_documentation tool
export interface ReadDocumentationParams {
  query: string;
  category?: string;
  maxResults?: number;
}

export interface DocumentationResult {
  filePath: string;
  title: string;
  content: string;
  relevanceScore: number;
  lineNumber: number;
}

// Типы для search_project_files tool
export type SearchType = 'filename' | 'content' | 'filetype';

export interface SearchProjectFilesParams {
  searchType: SearchType;
  query: string;
  rootDir?: string;
  fileExtensions?: string[];
}

export interface FileMatch {
  filePath: string;
  matches: Array<{
    line: string;
    lineNumber: number;
    contextBefore?: string[];
    contextAfter?: string[];
  }>;
  fileType: string;
  lineNumbers: number[];
}

// Типы для get_project_structure tool
export interface GetProjectStructureParams {
  rootDir?: string;
  maxDepth?: number;
  excludePatterns?: string[];
}

export interface ProjectStructureNode {
  name: string;
  type: 'file' | 'directory';
  size?: number;
  children?: ProjectStructureNode[];
}

// Типы для execute_command tool
export interface ExecuteCommandParams {
  command: string;
  args?: string[];
  workingDir?: string;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
}

// Типы для логирования
export type LogLevel = 'debug' | 'info' | 'error';

export interface LogEntry {
  timestamp: string;
  tool: string;
  parameters: Record<string, unknown>;
  executionTimeMs: number;
  status: 'success' | 'error';
  resultSize?: number;
  error?: {
    message: string;
    code?: string;
  };
}
