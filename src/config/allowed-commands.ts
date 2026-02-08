/**
 * Whitelist разрешенных команд для DevOps tool
 */
export const ALLOWED_COMMANDS = {
  // Разрешенные команды npm/yarn
  npm: ['install', 'run', 'test', 'build', 'start', 'version', 'list'],
  yarn: ['install', 'run', 'test', 'build', 'start', 'version', 'list'],
  pnpm: ['install', 'run', 'test', 'build', 'start', 'version', 'list'],

  // Разрешенные команды git (только чтение)
  git: ['status', 'log', 'diff', 'show', 'branch', 'remote', 'config'],

  // Разрешенные команды для сборки (если есть в package.json)
  build: ['npm run build', 'yarn build', 'pnpm build'],
};

/**
 * Проверяет, разрешена ли команда для выполнения
 */
export function isCommandAllowed(
  command: string,
  args: string[] = []
): boolean {
  const [cmd, ...cmdArgs] = command.split(' ').concat(args);

  // Проверка npm/yarn/pnpm
  if (cmd === 'npm' || cmd === 'yarn' || cmd === 'pnpm') {
    const subcommand = cmdArgs[0];
    return (
      ALLOWED_COMMANDS.npm.includes(subcommand) ||
      ALLOWED_COMMANDS.yarn.includes(subcommand) ||
      ALLOWED_COMMANDS.pnpm.includes(subcommand)
    );
  }

  // Проверка git (только безопасные команды чтения)
  if (cmd === 'git') {
    const subcommand = cmdArgs[0];
    return ALLOWED_COMMANDS.git.includes(subcommand);
  }

  // Проверка build команд
  if (ALLOWED_COMMANDS.build.includes(command)) {
    return true;
  }

  return false;
}

/**
 * Запрещенные команды (никогда не разрешаются)
 */
export const FORBIDDEN_COMMANDS = [
  'rm',
  'rmdir',
  'del',
  'delete',
  'format',
  'fdisk',
  'mkfs',
  'shutdown',
  'reboot',
  'sudo',
  'su',
];

/**
 * Проверяет, является ли команда запрещенной
 */
export function isCommandForbidden(command: string): boolean {
  const cmd = command.split(' ')[0].toLowerCase();
  return FORBIDDEN_COMMANDS.includes(cmd);
}
