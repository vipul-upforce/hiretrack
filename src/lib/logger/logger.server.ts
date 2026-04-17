import pino from 'pino';
import * as Sentry from '@sentry/nextjs';

const isDev = process.env.NODE_ENV === 'development';

// Helper to send errors to Sentry without repeating logic
const captureSentryError = (args: unknown[]) => {
  const error = args.find((arg) => arg instanceof Error);
  if (error) {
    Sentry.captureException(error);
  } else {
    // If they just logged a string like logger.error("something broke")
    Sentry.captureMessage(args.join(' '), 'error');
  }
};

export const logger = isDev
  ? {
      info: (...args: unknown[]) => console.log('INFO -- :', ...args),
      warn: (...args: unknown[]) => console.warn('WARN -- :', ...args),
      error: (...args: unknown[]) => {
        console.error('ERROR -- :', ...args);
        captureSentryError(args);
      },
    }
  : (() => {
      const pinoLogger = pino({
        level: process.env.LOG_LEVEL || 'info',
        base: undefined,
        timestamp: pino.stdTimeFunctions.isoTime,
      });

      return {
        info: (msg: string, ...args: any[]) => pinoLogger.info(msg, ...args),
        warn: (msg: string, ...args: any[]) => pinoLogger.warn(msg, ...args),
        error: (msg: string | Error, ...args: any[]) => {
          // 1. Log to Pino (standard output)
          pinoLogger.error(msg, ...args);
          
          // 2. Report to Sentry
          if (msg instanceof Error) {
            Sentry.captureException(msg);
          } else {
            Sentry.captureMessage(String(msg), 'error');
          }
        },
      };
    })();