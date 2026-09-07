import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { type FastifyInstance } from 'fastify';

export async function registerDocs(app: FastifyInstance): Promise<void> {
  await app.register(fastifySwagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Smart Logistics Routing API',
        version: '0.1.0',
        description:
          'Finds the most efficient path between locations on a predefined network, with vehicle constraints, time-of-day traffic multipliers, and ordered multi-stop routing.',
      },
      tags: [
        { name: 'network', description: 'Network (graph) management' },
        { name: 'route', description: 'Route optimization jobs' },
        { name: 'system', description: 'Health and metadata' },
      ],
    },
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: '/docs',
  });
}
