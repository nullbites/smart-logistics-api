import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../db/client';

export type JobLogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface CreateJobInput {
  networkId: string;
  requestPayload: unknown;
}

export async function createJob(input: CreateJobInput): Promise<{ id: string }> {
  const id = `job-${randomUUID()}`;

  await prisma.job.create({
    data: {
      id,
      networkId: input.networkId,
      status: 'PENDING',
      requestPayload: input.requestPayload as Prisma.InputJsonValue,
    },
  });

  return { id };
}

export function getJob(jobId: string) {
  return prisma.job.findUnique({ where: { id: jobId } });
}

export async function appendLog(
  jobId: string,
  level: JobLogLevel,
  message: string,
  data?: unknown,
): Promise<void> {
  await prisma.jobLog.create({
    data: {
      jobId,
      level,
      message,
      ...(data !== undefined ? { data: data as Prisma.InputJsonValue } : {}),
    },
  });
}

export async function markRunning(jobId: string): Promise<void> {
  await prisma.job.update({
    where: { id: jobId },
    data: {
      status: 'RUNNING',
      startedAt: new Date(),
      attempts: { increment: 1 },
    },
  });
}

export async function markCompleted(
  jobId: string,
  result: { responsePayload: unknown; durationMs: number },
): Promise<void> {
  await prisma.job.update({
    where: { id: jobId },
    data: {
      status: 'COMPLETED',
      responsePayload: result.responsePayload as Prisma.InputJsonValue,
      durationMs: result.durationMs,
      finishedAt: new Date(),
    },
  });
}

export async function markFailed(
  jobId: string,
  failure: { errorCode: string; errorMessage: string; durationMs?: number },
): Promise<void> {
  await prisma.job.update({
    where: { id: jobId },
    data: {
      status: 'FAILED',
      errorCode: failure.errorCode,
      errorMessage: failure.errorMessage,
      durationMs: failure.durationMs ?? null,
      finishedAt: new Date(),
    },
  });
}
