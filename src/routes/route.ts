import { type FastifyInstance } from 'fastify';
import { type Static } from '@sinclair/typebox';
import { type TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { prisma } from '../db/client';
import { createJob, getJob } from '../services/job.service';
import { getJobQueue } from '../worker/queue';
import { ErrorResponse } from '../schemas/common';
import { NetworkIdParam } from '../schemas/network';
import {
  JobIdParam,
  OptimizeBody,
  OptimizeReply,
  RouteResultDto,
  StatusReply,
} from '../schemas/route';

export async function routeRoutes(app: FastifyInstance): Promise<void> {
  const typedApp = app.withTypeProvider<TypeBoxTypeProvider>();

  typedApp.post(
    '/route/optimize/:id',
    {
      schema: {
        tags: ['route'],
        summary: 'Submit an optimization job',
        params: NetworkIdParam,
        body: OptimizeBody,
        response: { 202: OptimizeReply, 400: ErrorResponse, 404: ErrorResponse },
      },
    },
    async (request, reply) => {
      const network = await prisma.network.findUnique({
        where: { id: request.params.id },
        select: { id: true },
      });
      if (network === null) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: `network not found: ${request.params.id}` },
        });
      }

      const { id: jobId } = await createJob({
        networkId: request.params.id,
        requestPayload: request.body,
      });
      request.jobId = jobId;
      getJobQueue().enqueue(jobId);
      return reply.code(202).send({ jobId });
    },
  );

  typedApp.get(
    '/route/status/:jobId',
    {
      schema: {
        tags: ['route'],
        summary: 'Poll an optimization job',
        params: JobIdParam,
        response: { 200: StatusReply, 404: ErrorResponse },
      },
    },
    async (request, reply) => {
      const job = await getJob(request.params.jobId);
      if (job === null) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: `job not found: ${request.params.jobId}` },
        });
      }

      if (job.status === 'PENDING' || job.status === 'RUNNING') {
        return { status: job.status };
      }

      if (job.status === 'COMPLETED') {
        return {
          status: 'COMPLETED' as const,
          result: job.responsePayload as unknown as Static<typeof RouteResultDto>,
        };
      }

      return {
        status: 'FAILED' as const,
        error: { code: job.errorCode ?? 'UNKNOWN', message: job.errorMessage ?? '' },
      };
    },
  );
}
