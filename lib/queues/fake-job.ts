import { Job, JobId, JobOptions, JobStatus, Queue } from 'bull';

export type FakeJobProps<T = any> = {
  id: JobId;
  name: string;
  data: T;
  opts?: JobOptions;
  queueName: string;
  attemptsMade?: number;
  timestamp?: number;
};

export class FakeJob<T = any> implements Job<T> {
  public id: number | string;
  public attemptsMade: number;
  public name: string;
  public queueName: string;
  public data: T;
  public opts: JobOptions;
  public status: JobStatus | 'stuck' = 'waiting';
  public timestamp: number;
  public stacktrace: string[] = [];
  public returnvalue: any;
  public failedReason?: string;
  public finishedOn?: number;
  public retriedOn?: number;
  public processedOn: null;
  public logs: string[] = [];
  public queue: Queue<T>;

  private _progress = 0;

  get result(): any {
    return this.returnvalue;
  }

  constructor(props: FakeJobProps<T>) {
    this.id = props.id;
    this.attemptsMade = props.attemptsMade || 0;
    this.name = props.name;
    this.queueName = props.queueName;
    this.data = props.data;
    this.opts = props.opts || {};
    this.timestamp = props.timestamp || Date.now();
  }

  progress(): any;
  progress(value: any): Promise<void>;
  progress(value?: any): any | Promise<void> {
    if (value) {
      this._progress = value;
      return Promise.resolve();
    }

    return this._progress;
  }

  log(row: string): Promise<any> {
    this.logs.push(row);
    return Promise.resolve(null);
  }

  isCompleted(): Promise<boolean> {
    return Promise.resolve(this.status === 'completed');
  }

  isFailed(): Promise<boolean> {
    return Promise.resolve(this.status === 'failed');
  }

  isDelayed(): Promise<boolean> {
    return Promise.resolve(this.status === 'delayed');
  }

  isActive(): Promise<boolean> {
    return Promise.resolve(this.status === 'active');
  }

  isWaiting(): Promise<boolean> {
    return Promise.resolve(this.status === 'waiting');
  }

  isPaused(): Promise<boolean> {
    return Promise.resolve(this.status === 'paused');
  }

  isStuck(): Promise<boolean> {
    return Promise.resolve(this.status === 'stuck');
  }

  getState(): Promise<JobStatus | 'stuck'> {
    return Promise.resolve(this.status);
  }

  update(data: T): Promise<void> {
    console.log(`FakeJob::update[${this.name}]`, data);
    throw new Error('Method not implemented.');
  }

  remove(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  retry(): Promise<void> {
    this.failedReason = null;
    this.finishedOn = null;
    this.processedOn = null;
    this.retriedOn = Date.now();

    return Promise.resolve();
  }

  discard(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  async saveAttempt(err) {
    this.attemptsMade++;

    if (this.opts.stackTraceLimit) {
      this.stacktrace = this.stacktrace.slice(0, this.opts.stackTraceLimit - 1);
    }

    this.stacktrace.push(err.stack);
    this.failedReason = err.message;
  }

  finished(): Promise<any> {
    throw new Error('Method not implemented.');
  }

  moveToActive(): Promise<void> {
    this.status = 'active';
    return Promise.resolve();
  }

  moveToCompleted(returnValue?: any): Promise<[any, JobId]> {
    this.finishedOn = Date.now();
    this.status = 'completed';
    this.returnvalue = returnValue;
    return Promise.resolve([returnValue, this.id]);
  }

  moveToFailed(errorInfo: { message: string }): Promise<[any, JobId]> {
    this.finishedOn = Date.now();
    this.status = 'failed';
    this.failedReason = errorInfo?.message || 'Unknown reason';
    return Promise.resolve([errorInfo, this.id]);
  }

  promote(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  lockKey(): string {
    throw new Error('Method not implemented.');
  }

  releaseLock(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  takeLock(): Promise<number | false> {
    throw new Error('Method not implemented.');
  }

  toJSON(): {
    id: JobId;
    name: string;
    data: T;
    opts: JobOptions;
    progress: number;
    delay: number;
    timestamp: number;
    attemptsMade: number;
    failedReason: any;
    retriedOn: any;
    stacktrace: string[];
    logs: string[];
    returnvalue: any;
    finishedOn: number;
    processedOn: number;
    status: JobStatus | 'stuck';
  } {
    return {
      id: this.id,
      name: this.name,
      data: this.data,
      opts: this.opts,
      progress: this._progress,
      delay: 0,
      timestamp: this.timestamp,
      attemptsMade: this.attemptsMade,
      failedReason: this.failedReason,
      retriedOn: this.retriedOn,
      finishedOn: this.finishedOn,
      processedOn: this.processedOn,
      stacktrace: this.stacktrace,
      returnvalue: this.returnvalue,
      logs: this.logs,
      status: this.status,
    };
  }

  extendLock(duration: number): Promise<number> {
    throw new Error('Method not implemented.');
  }
}
