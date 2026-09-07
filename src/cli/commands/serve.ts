import { execFileSync } from 'node:child_process';
import { buildApp } from '../../server/app';
import { prisma } from '../../db/client';
import { logger } from '../../lib/logger';
import type { ServeOptions } from '../parse-args';

export interface RunningServer {
  address: string;
  stop: () => Promise<void>;
}

export async function runServe(opts: ServeOptions & { logger?: boolean }): Promise<RunningServer> {
  if (opts.migrate) {
    logger.info('running database migrations');
    execFileSync('npx', ['prisma', 'migrate', 'deploy'], { stdio: 'inherit' });
  }
  if (opts.seed) {
    logger.info('running database seed');
    execFileSync('npx', ['prisma', 'db', 'seed'], { stdio: 'inherit' });
  }

  const app = await buildApp({ verbose: opts.verbose, logger: opts.logger });
  const address = await app.listen({ port: opts.port, host: opts.host });
  logger.info({ address }, 'smart-logistics listening');

  let stopped = false;
  const stop = async (): Promise<void> => {
    if (stopped) return;
    stopped = true;
    logger.info('shutting down');
    await app.close();
    await prisma.$disconnect();
  };

  return { address, stop };
}

export function installSignalHandlers(stop: () => Promise<void>): void {
  const handle = (signal: NodeJS.Signals): void => {
    logger.info({ signal }, 'received shutdown signal');
    stop()
      .then(() => process.exit(0))
      .catch((err: unknown) => {
        logger.error({ err }, 'error during shutdown');
        process.exit(1);
      });
  };
  process.once('SIGINT', () => handle('SIGINT'));
  process.once('SIGTERM', () => handle('SIGTERM'));
}
