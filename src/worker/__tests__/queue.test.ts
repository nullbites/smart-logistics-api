import { prisma } from '../../db/client';
import { JobQueue } from '../queue';

async function seedJobs(count: number): Promise<string[]> {
  const network = await prisma.network.create({ data: {} });
  const ids: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const id = `job-seed-${i}-${Math.random().toString(36).slice(2)}`;
    await prisma.job.create({
      data: { id, networkId: network.id, status: 'PENDING', requestPayload: { i } },
    });
    ids.push(id);
  }
  return ids;
}

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

async function waitFor(predicate: () => boolean, timeoutMs = 2000): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('waitFor timed out');
    }
    await new Promise((r) => setImmediate(r));
  }
}

describe('JobQueue', () => {
  it('requeues pre-existing PENDING jobs on start and processes each once', async () => {
    const ids = await seedJobs(3);
    const processor = jest.fn(async (_jobId: string) => {});
    const queue = new JobQueue(processor, 1);

    await queue.start();
    await queue.drain();

    expect(processor).toHaveBeenCalledTimes(3);
    const called = processor.mock.calls.map((c) => c[0]).sort();
    expect(called).toEqual([...ids].sort());

    const rows = await prisma.job.findMany({ where: { id: { in: ids } } });
    expect(rows.every((r) => r.status === 'RUNNING')).toBe(true);
    expect(rows.every((r) => r.attempts === 1)).toBe(true);
  });

  it('processes a job enqueued after start', async () => {
    const [id] = await seedJobs(1);
    const jobId = id as string;
    // Hide it from start()'s backlog scan; re-open it as PENDING and enqueue it.
    await prisma.job.update({ where: { id: jobId }, data: { status: 'COMPLETED' } });

    const processor = jest.fn(async (_jobId: string) => {});
    const queue = new JobQueue(processor, 1);
    await queue.start();
    await queue.drain();
    expect(processor).not.toHaveBeenCalled();

    await prisma.job.update({ where: { id: jobId }, data: { status: 'PENDING' } });
    queue.enqueue(jobId);
    await queue.drain();

    expect(processor).toHaveBeenCalledWith(jobId);
    const row = await prisma.job.findUnique({ where: { id: jobId } });
    expect(row?.status).toBe('RUNNING');
  });

  it('marks a job FAILED when the processor throws and keeps going for the rest', async () => {
    const ids = await seedJobs(3);
    const bad = ids[1] as string;
    const processor = jest.fn(async (jobId: string) => {
      if (jobId === bad) {
        throw new Error('boom');
      }
    });
    const queue = new JobQueue(processor, 1);

    await queue.start();
    await expect(queue.drain()).resolves.toBeUndefined();

    const badRow = await prisma.job.findUnique({ where: { id: bad } });
    expect(badRow?.status).toBe('FAILED');
    expect(badRow?.errorCode).toBe('INTERNAL');
    expect(badRow?.errorMessage).toBe('boom');
    expect(badRow?.finishedAt).toBeInstanceOf(Date);

    const others = await prisma.job.findMany({
      where: { id: { in: ids.filter((i) => i !== bad) } },
    });
    expect(others.every((r) => r.status === 'RUNNING')).toBe(true);
    expect(processor).toHaveBeenCalledTimes(3);
  });

  it('never runs more than `concurrency` jobs at once', async () => {
    const ids = await seedJobs(4);
    const gate = deferred();
    let active = 0;
    let maxActive = 0;
    const processor = jest.fn(async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await gate.promise;
      active -= 1;
    });
    const queue = new JobQueue(processor, 2);

    await queue.start();
    // The pump may start at most `concurrency` jobs; wait for them to enter the
    // processor, then confirm it never exceeds the limit.
    await waitFor(() => active === 2);
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));

    expect(queue.size).toBeLessThanOrEqual(4);
    expect(active).toBe(2);

    gate.resolve();
    await queue.drain();

    expect(maxActive).toBe(2);
    expect(processor).toHaveBeenCalledTimes(4);
    const rows = await prisma.job.findMany({ where: { id: { in: ids } } });
    expect(rows.every((r) => r.status === 'RUNNING')).toBe(true);
  });

  it('stop() prevents further pumping', async () => {
    const ids = await seedJobs(2);
    const processor = jest.fn(async (_jobId: string) => {});
    const queue = new JobQueue(processor, 1);

    queue.stop();
    queue.enqueue(ids[0] as string);
    queue.enqueue(ids[1] as string);
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));

    expect(processor).not.toHaveBeenCalled();
    expect(queue.size).toBe(2);
  });
});
