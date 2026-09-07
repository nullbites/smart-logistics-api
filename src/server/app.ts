import Fastify, { type FastifyInstance } from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { registerErrorHandling } from './error-handler';
import { registerDocs } from './plugins/swagger';
import { registerAuditLog } from './audit';
import { healthRoutes } from '../routes/health';
import { networkRoutes } from '../routes/network';

export interface BuildAppOptions {
  verbose?: boolean;
  logger?: boolean;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger === false ? false : { level: options.verbose ? 'debug' : 'info' },
    // Reject unknown request properties instead of silently stripping them, so
    // `additionalProperties: false` on a body schema surfaces as a 400.
    ajv: { customOptions: { removeAdditional: false } },
  }).withTypeProvider<TypeBoxTypeProvider>();

  registerErrorHandling(app);
  await registerDocs(app);
  registerAuditLog(app);
  await app.register(healthRoutes);
  await app.register(networkRoutes);

  await app.ready();
  return app;
}
