// Production-safe logger
// Only logs in development, silent in production

const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  debug: (...args: unknown[]) => {
    if (isDev) console.debug(...args);
  },
  info: (...args: unknown[]) => {
    if (isDev) console.info(...args);
  },
  warn: (...args: unknown[]) => {
    // Warnings are always logged
    console.warn(...args);
  },
  error: (...args: unknown[]) => {
    // Errors are always logged
    console.error(...args);
  },
};

export default logger;
