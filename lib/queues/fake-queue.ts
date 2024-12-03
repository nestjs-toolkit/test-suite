import { Collection } from 'collect.js';
import { JobId, JobOptions } from 'bull';
import { Provider } from '@nestjs/common';
import { BullQueueEvents, getQueueToken } from '@nestjs/bull';
import { FakeJob } from './fake-job';

// REF: https://docs.nestjs.com/techniques/queues#event-listeners
interface FakeQueueHandlers {
  [BullQueueEvents.ERROR]?: (error: Error) => void;
  [BullQueueEvents.FAILED]?: (job: FakeJob, err: Error) => void;
  [BullQueueEvents.ACTIVE]?: (job: FakeJob) => void;
  [BullQueueEvents.COMPLETED]?: (job: FakeJob, result: any) => void;
}

export class FakeQueue {
  private readonly handlers: FakeQueueHandlers = {};

  get name(): string {
    return this.queueName;
  }

  constructor(
    private readonly queueName: string,
    private readonly storage: Collection<FakeJob>,
  ) {}

  add(jobName: string, data: any, opts?: JobOptions): Promise<FakeJob> {
    const job = this.addSync(jobName, data, opts);
    return Promise.resolve(job);
  }

  addBulk(
    jobs: Array<{
      name?: string | undefined;
      data: any;
      opts?: Omit<JobOptions, 'repeat'> | undefined;
    }>,
  ): Promise<Array<FakeJob>> {
    const result = jobs.map((job) =>
      this.add(job.name, job.data, job.opts as any),
    );
    return Promise.all(result);
  }

  getJob(jobId: JobId): Promise<FakeJob | null> {
    const job = this.storage.get(jobId);
    return Promise.resolve(job || null);
  }

  removeJobs(pattern: string): Promise<void> {
    this.storage.forget(pattern);
    return Promise.resolve();
  }

  addSync(jobName: string, data: any, opts?: JobOptions): FakeJob {
    const id: JobId = opts?.jobId || `${this.storage.count() + 1}`;

    const job = new FakeJob({
      id,
      data,
      opts,
      name: jobName,
      queueName: this.queueName,
      queue: this as any,
    });

    this.storage.put(job.id, job);
    return job;
  }

  process(key: string, fn: (job: FakeJob) => void): void {
    this.handlers[key] = fn;
  }

  async handler(job: FakeJob): Promise<FakeJob> {
    const handler = this.handlers[job.name];

    if (!handler) {
      throw new Error(
        `No handler for job ${job.name}, from queue ${this.queueName}`,
      );
    }

    await job.moveToActive();
    this.handlers[BullQueueEvents.ACTIVE]?.(job);

    try {
      const result = await handler(job);

      await job.moveToCompleted(result);
      this.handlers[BullQueueEvents.COMPLETED]?.(job, result);
    } catch (err) {
      this.handlers[BullQueueEvents.FAILED]?.(job, err);
      await job.saveAttempt(err);

      const attempts = job.opts?.attempts || 1;

      if (attempts > job.attemptsMade) {
        await job.retry();
        return this.handler(job);
      } else {
        await job.moveToFailed(err);
      }
    }

    return job;
  }

  getProvider(): Provider {
    return {
      provide: getQueueToken(this.queueName),
      useValue: this,
    };
  }
}
