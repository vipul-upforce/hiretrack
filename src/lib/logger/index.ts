/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
const logger = {
  log: (...args: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(...args);
    }
  },
  error: (...args: any) => {
    console.error(...args);
  },
  warn: (...args: any) => {
    console.warn(...args);
  },
};

export default logger;
