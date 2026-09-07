import { env } from '../config/env';
import { prisma } from '../db/client';

export type JobProcessor = (jobId: string) => Promise<void>;

export class JobQueue {
  private readonly processor: JobProcessor;
  private readonly concurrency: number;
  private readonly pending: string[] = [];
  private running = 0;
  private stopped = true;

  constructor(processor: JobProcessor, concurrency: number) {
    this.processor = processor;
    this.concurrency = concurrency;
  }

  async start(): Promise<void> {
    this.stopped = false;
    await this.requeueOrphans();
    this.pump();
  }

  stop(): void {
    this.stopped = true;
  }

  enqueue(jobId: string): void {
    this.pending.push(jobId);
    this.pump();
  }

  async drain(): Promise<void> {
    while (this.pending.length > 0 || this.running > 0) {
      await new Promise((resolve) => setImmediate(resolve));
    }
  }

  get size(): number {
    return this.pending.length + this.running;
  }

  private async requeueOrphans(): Promise<void> {
    await prisma.job.updateMany({
      where: { status: 'RUNNING' },
      data: { status: 'PENDING' },
    });

    const pendingJobs = await prisma.job.findMany({
      where: { status: 'PENDING' },
      select: { id: true },
    });

    for (const job of pendingJobs) {
      this.pending.push(job.id);
    }
  }

  private pump(): void {
    while (!this.stopped && this.running < this.concurrency && this.pending.length > 0) {
      const id = this.pending.shift();
      if (id === undefined) {
        break;
      }
      this.running += 1;
      void this.claimAndRun(id).finally(() => {
        this.running -= 1;
        this.pump();
      });
    }
  }

  private async claimAndRun(id: string): Promise<void> {
    const claimed = await prisma.job.updateMany({
      where: { id, status: 'PENDING' },
      data: { status: 'RUNNING', startedAt: new Date(), attempts: { increment: 1 } },
    });

    if (claimed.count === 0) {
      return;
    }

    try {
      await this.processor(id);
    } catch (err) {
      await prisma.job.updateMany({
        where: { id, status: 'RUNNING' },
        data: {
          status: 'FAILED',
          errorCode: 'INTERNAL',
          errorMessage: err instanceof Error ? err.message : String(err),
          finishedAt: new Date(),
        },
      });
    }
  }
}

let instance: JobQueue | undefined;
let processorRef: JobProcessor = async () => {
  throw new Error('no job processor registered');
};

export function setJobProcessor(p: JobProcessor): void {
  processorRef = p;
}

export function getJobQueue(): JobQueue {
  if (instance === undefined) {
    instance = new JobQueue((id) => processorRef(id), env.ROUTE_WORKER_CONCURRENCY);
  }
  return instance;
}
