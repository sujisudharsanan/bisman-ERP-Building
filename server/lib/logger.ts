/**
 * Simple logger utility
 * TODO: Replace with Winston or Pino in production
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatMessage(level: LogLevel, message: string, ...args: any[]): string {
  const timestamp = new Date().toISOString();
  const levelStr = level.toUpperCase().padEnd(5);
  return `[${timestamp}] ${levelStr} ${message} ${args.length ? JSON.stringify(args) : ''}`;
}

export const logger = {
  debug: (message: string, ...args: any[]) => {
    if (shouldLog('debug')) console.log(formatMessage('debug', message, ...args));
  },
  info: (message: string, ...args: any[]) => {
    if (shouldLog('info')) console.log(formatMessage('info', message, ...args));
  },
  warn: (message: string, ...args: any[]) => {
    if (shouldLog('warn')) console.warn(formatMessage('warn', message, ...args));
  },
  error: (message: string, ...args: any[]) => {
    if (shouldLog('error')) console.error(formatMessage('error', message, ...args));
  },
};

export default logger;
