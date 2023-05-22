import { Collection } from 'collect.js';
import { ModuleRef } from '@nestjs/core';
import { getQueueToken } from '@nestjs/bull';
import { NO_QUEUE_FOUND } from '@nestjs/bull-shared';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { FAKE_QUEUE_STORAGE_TOKEN } from './constants';
import { FakeJob, FakeJobProps } from './fake-job';
import { FakeQueue } from './fake-queue';

@Injectable()
export class FakeQueuesService {
  private readonly logger = new Logger(FakeQueuesService.name);
  constructor(
    @Inject(FAKE_QUEUE_STORAGE_TOKEN)
    private readonly storage: Collection<FakeJob>,
    private readonly moduleRef: ModuleRef,
  ) {}

  lastJob<D = any>(name: string): FakeJob<D> {
    return this.storage.where('name', name).last();
  }

  countJob(name: string): number {
    return this.storage.where('name', name).count();
  }

  addJob<T>(props: FakeJobProps<T>): FakeJob<T> {
    const queue = this.getFakeQueue(props.queueName);
    return queue.addSync(props.name, props.data, props.opts);
  }

  async handlerJob<R = any>(job: FakeJob): Promise<R> {
    const queue = this.getFakeQueue(job.queueName);
    return queue.handler(job).then((job) => job.result);
  }

  count(): number {
    return this.storage.count();
  }

  clear(): void {
    this.storage.each((job) => this.storage.forget(job.id));
  }

  getFakeQueue(queueName: string): FakeQueue {
    const queueToken = getQueueToken(queueName);

    try {
      return this.moduleRef.get<FakeQueue>(queueToken, { strict: false });
    } catch (err) {
      this.logger.error(NO_QUEUE_FOUND(queueName));
      throw err;
    }
  }
}
