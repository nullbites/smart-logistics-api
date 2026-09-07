import { type FastifyError, type FastifyInstance } from 'fastify';
import { RouteError } from '../domain/types';

export interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
  };
}

export function errorEnvelope(code: string, message: string): ErrorEnvelope {
  return { error: { code, message } };
}

export function registerErrorHandling(app: FastifyInstance): void {
  app.setErrorHandler((err: FastifyError, req, reply) => {
    if (err.validation || err.statusCode === 400) {
      return reply.code(400).send(errorEnvelope('VALIDATION', err.message));
    }

    if (err instanceof RouteError) {
      const status = err.code === 'INVALID_NODE' ? 400 : 422;
      return reply.code(status).send(errorEnvelope(err.code, err.message));
    }

    if (typeof err.statusCode === 'number' && err.statusCode >= 400 && err.statusCode <= 499) {
      return reply.code(err.statusCode).send(errorEnvelope('REQUEST_ERROR', err.message));
    }

    req.log.error({ err }, 'unhandled error');
    return reply.code(500).send(errorEnvelope('INTERNAL', 'Internal Server Error'));
  });

  app.setNotFoundHandler((req, reply) => {
    return reply
      .code(404)
      .send(errorEnvelope('NOT_FOUND', `Route ${req.method}:${req.url} not found`));
  });
}
