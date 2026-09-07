import { prisma } from '../../db/client';
import {
  appendLog,
  createJob,
  getJob,
  markCompleted,
  markFailed,
  markRunning,
} from '../job.service';

async function createNetwork(): Promise<string> {
  const network = await prisma.network.create({ data: {} });
  return network.id;
}

describe('job.service', () => {
  it('createJob stores a PENDING job with a job- id and round-trips the payload', async () => {
    const networkId = await createNetwork();
    const payload = { source: 'A', target: 'E', weight: 1200 };

    const { id } = await createJob({ networkId, requestPayload: payload });
    expect(id.startsWith('job-')).toBe(true);

    const row = await prisma.job.findUnique({ where: { id } });
    expect(row).not.toBeNull();
    expect(row?.status).toBe('PENDING');
    expect(row?.networkId).toBe(networkId);
    expect(row?.requestPayload).toEqual(payload);
  });

  it('getJob returns the row and null for an unknown id', async () => {
    const networkId = await createNetwork();
    const { id } = await createJob({ networkId, requestPayload: {} });

    const found = await getJob(id);
    expect(found?.id).toBe(id);

    expect(await getJob('job-does-not-exist')).toBeNull();
  });

  it('markRunning sets RUNNING, startedAt and attempts', async () => {
    const networkId = await createNetwork();
    const { id } = await createJob({ networkId, requestPayload: {} });

    await markRunning(id);

    const row = await prisma.job.findUnique({ where: { id } });
    expect(row?.status).toBe('RUNNING');
    expect(row?.startedAt).toBeInstanceOf(Date);
    expect(row?.attempts).toBe(1);
  });

  it('markCompleted sets COMPLETED, response payload, duration and finishedAt', async () => {
    const networkId = await createNetwork();
    const { id } = await createJob({ networkId, requestPayload: {} });
    const responsePayload = { path: ['A', 'C', 'D'], cost: 20 };

    await markCompleted(id, { responsePayload, durationMs: 42 });

    const row = await prisma.job.findUnique({ where: { id } });
    expect(row?.status).toBe('COMPLETED');
    expect(row?.responsePayload).toEqual(responsePayload);
    expect(row?.durationMs).toBe(42);
    expect(row?.finishedAt).toBeInstanceOf(Date);
  });

  it('markFailed sets FAILED, error code/message and finishedAt', async () => {
    const networkId = await createNetwork();
    const { id } = await createJob({ networkId, requestPayload: {} });

    await markFailed(id, { errorCode: 'NO_ROUTE', errorMessage: 'no path from A to Z' });

    const row = await prisma.job.findUnique({ where: { id } });
    expect(row?.status).toBe('FAILED');
    expect(row?.errorCode).toBe('NO_ROUTE');
    expect(row?.errorMessage).toBe('no path from A to Z');
    expect(row?.finishedAt).toBeInstanceOf(Date);
    expect(row?.durationMs).toBeNull();
  });

  it('appendLog writes a JobLog row, with data present only when passed', async () => {
    const networkId = await createNetwork();
    const { id } = await createJob({ networkId, requestPayload: {} });

    await appendLog(id, 'INFO', 'started');
    await appendLog(id, 'WARN', 'slow segment', { edge: 'B->D' });

    const logs = await prisma.jobLog.findMany({ where: { jobId: id }, orderBy: { ts: 'asc' } });
    expect(logs).toHaveLength(2);
    expect(logs[0]?.level).toBe('INFO');
    expect(logs[0]?.message).toBe('started');
    expect(logs[0]?.data).toBeNull();
    expect(logs[1]?.level).toBe('WARN');
    expect(logs[1]?.data).toEqual({ edge: 'B->D' });
  });
});
