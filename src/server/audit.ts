import { type FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { prisma } from '../db/client';

declare module 'fastify' {
  interface FastifyRequest {
    // Set by a later slice when a route resolves a job; attached to the audit row.
    jobId?: string;
    // Filled by the onSend hook so onResponse can persist the response body.
    auditResponseBody?: string;
  }
}

const MAX_BODY_CHARS = 16_384;

/** Requests we never want in the audit log: health probes and the docs UI. */
export function skip(url: string): boolean {
  return url === '/health' || url.startsWith('/docs');
}

/**
 * Shape a request or response body for the RequestLog JSON columns.
 *
 * - `undefined` stays `undefined` so Prisma leaves the column NULL.
 * - a string is parsed as JSON when possible, otherwise wrapped as
 *   `{ raw: <string sliced to the cap> }`.
 * - an object is stored as-is.
 * - anything whose serialized form exceeds the cap collapses to
 *   `{ truncated: true, bytes: <n> }`.
 */
function normalizeBody(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) {
    return undefined;
  }

  let normalized: unknown;
  if (typeof value === 'string') {
    try {
      normalized = JSON.parse(value);
    } catch {
      normalized = { raw: value.slice(0, MAX_BODY_CHARS) };
    }
  } else {
    normalized = value;
  }

  const serialized = JSON.stringify(normalized);
  if (serialized !== undefined && serialized.length > MAX_BODY_CHARS) {
    return { truncated: true, bytes: serialized.length };
  }

  return normalized as Prisma.InputJsonValue;
}

export function registerAuditLog(app: FastifyInstance): void {
  app.addHook('onSend', async (request, _reply, payload) => {
    if (!skip(request.url) && typeof payload === 'string') {
      request.auditResponseBody = payload;
    }
    return payload;
  });

  app.addHook('onResponse', async (request, reply) => {
    if (skip(request.url)) {
      return;
    }

    try {
      await prisma.requestLog.create({
        data: {
          method: request.method,
          path: request.url,
          statusCode: reply.statusCode,
          requestBody: normalizeBody(request.body),
          responseBody: normalizeBody(request.auditResponseBody),
          jobId: request.jobId ?? null,
          ip: request.ip,
          durationMs: Math.round(reply.elapsedTime),
        },
      });
    } catch (err) {
      request.log.error({ err }, 'failed to write request audit log');
    }
  });
}
