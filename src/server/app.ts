import Fastify, { type FastifyInstance } from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { registerErrorHandling } from './error-handler';
import { healthRoutes } from '../routes/health';

export interface BuildAppOptions {
  verbose?: boolean;
  logger?: boolean;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger === false ? false : { level: options.verbose ? 'debug' : 'info' },
  }).withTypeProvider<TypeBoxTypeProvider>();

  registerErrorHandling(app);
  await app.register(healthRoutes);

  await app.ready();
  return app;
}
