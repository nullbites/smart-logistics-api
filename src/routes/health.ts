import { type FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/health',
    {
      schema: {
        tags: ['system'],
        summary: 'Liveness check',
        response: {
          200: Type.Object({
            status: Type.String(),
            uptime: Type.Number(),
          }),
        },
      },
    },
    async () => {
      return { status: 'ok', uptime: process.uptime() };
    },
  );
}
