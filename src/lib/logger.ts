import pino from 'pino';
import { env } from '../config/env';

const level = process.env.NODE_ENV === 'test' ? 'silent' : env.VERBOSE ? 'debug' : 'info';

export const logger = pino({
  level,
  ...(process.stdout.isTTY && level !== 'silent'
    ? {
        transport: {
          target: 'pino-pretty',
          options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
        },
      }
    : {}),
});
