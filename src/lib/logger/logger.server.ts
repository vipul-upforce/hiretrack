import pino from 'pino';
/* eslint-disable no-console */
const isDev = process.env.NODE_ENV === 'development';

export const logger = isDev
  ? {
      info: (...args: unknown[]) => console.log('INFO -- :', ...args),
      error: (...args: unknown[]) => console.error('ERROR -- :', ...args),
      warn: (...args: unknown[]) => console.warn('WARN -- :', ...args),
    }
  : pino({
      level: process.env.LOG_LEVEL || 'info',
      base: undefined,
      timestamp: pino.stdTimeFunctions.isoTime,
    });
