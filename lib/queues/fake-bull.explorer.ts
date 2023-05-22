import { ProcessCallbackFunction } from 'bull';
import { getQueueToken, NO_QUEUE_FOUND } from '@nestjs/bull-shared';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  createContextId,
  DiscoveryService,
  MetadataScanner,
  ModuleRef,
} from '@nestjs/core';
import { Module } from '@nestjs/core/injector/module';
import { Injector } from '@nestjs/core/injector/injector';
import { BullQueueEventOptions, ProcessOptions } from '@nestjs/bull';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { BullMetadataAccessor } from '@nestjs/bull/dist/bull-metadata.accessor';
import { FakeQueue } from './fake-queue';

@Injectable()
export class FakeBullExplorer implements OnModuleInit {
  private readonly logger = new Logger('BullModule');
  private readonly injector = new Injector();

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly discoveryService: DiscoveryService,
    private readonly metadataAccessor: BullMetadataAccessor,
    private readonly metadataScanner: MetadataScanner,
  ) {}

  onModuleInit() {
    this.explore();
  }

  explore() {
    const providers: InstanceWrapper[] = this.discoveryService
      .getProviders()
      .filter((wrapper: InstanceWrapper) =>
        this.metadataAccessor.isQueueComponent(
          // NOTE: Regarding the ternary statement below,
          // - The condition `!wrapper.metatype` is because when we use `useValue`
          // the value of `wrapper.metatype` will be `null`.
          // - The condition `wrapper.inject` is needed here because when we use
          // `useFactory`, the value of `wrapper.metatype` will be the supplied
          // factory function.
          // For both cases, we should use `wrapper.instance.constructor` instead
          // of `wrapper.metatype` to resolve processor's class properly.
          // But since calling `wrapper.instance` could degrade overall performance
          // we must defer it as much we can. But there's no other way to grab the
          // right class that could be annotated with `@Processor()` decorator
          // without using this property.
          !wrapper.metatype || wrapper.inject
            ? wrapper.instance?.constructor
            : wrapper.metatype,
        ),
      );

    providers.forEach((wrapper: InstanceWrapper) => {
      const { instance, metatype } = wrapper;
      const isRequestScoped = !wrapper.isDependencyTreeStatic();
      const { name: queueName } =
        this.metadataAccessor.getQueueComponentMetadata(
          // NOTE: We are relying on `instance.constructor` to properly support
          // `useValue` and `useFactory` providers besides `useClass`.
          instance.constructor || metatype,
        );

      const queueToken = getQueueToken(queueName);
      const bullQueue = this.getFakeQueue(queueToken, queueName);

      this.metadataScanner.scanFromPrototype(
        instance,
        Object.getPrototypeOf(instance),
        (key: string) => {
          if (this.metadataAccessor.isProcessor(instance[key])) {
            const metadata = this.metadataAccessor.getProcessMetadata(
              instance[key],
            );
            this.handleProcessor(
              instance,
              key,
              bullQueue,
              wrapper.host,
              isRequestScoped,
              metadata,
            );
          } else if (this.metadataAccessor.isListener(instance[key])) {
            const metadata = this.metadataAccessor.getListenerMetadata(
              instance[key],
            );
            this.handleListener(instance, key, wrapper, bullQueue, metadata);
          }
        },
      );
    });
  }

  getFakeQueue(queueToken: string, queueName: string): FakeQueue {
    try {
      return this.moduleRef.get<FakeQueue>(queueToken, { strict: false });
    } catch (err) {
      this.logger.error(NO_QUEUE_FOUND(queueName));
      throw err;
    }
  }

  handleProcessor(
    instance: object,
    key: string,
    queue: FakeQueue,
    moduleRef: Module,
    isRequestScoped: boolean,
    options?: ProcessOptions,
  ) {
    let args: unknown[] = [options?.name, options?.concurrency];

    if (isRequestScoped) {
      const callback: ProcessCallbackFunction<unknown> = async (
        ...args: unknown[]
      ) => {
        const contextId = createContextId();

        if (this.moduleRef.registerRequestByContextId) {
          // Additional condition to prevent breaking changes in
          // applications that use @nestjs/bull older than v7.4.0.
          const jobRef = args[0];
          this.moduleRef.registerRequestByContextId(jobRef, contextId);
        }

        const contextInstance = await this.injector.loadPerContext(
          instance,
          moduleRef,
          moduleRef.providers,
          contextId,
        );
        return contextInstance[key].call(contextInstance, ...args);
      };
      args.push(callback);
    } else {
      args.push(
        instance[key].bind(instance) as ProcessCallbackFunction<unknown>,
      );
    }

    args = args.filter((item) => item !== undefined);
    queue.process.call(queue, ...args);
  }

  handleListener(
    instance: object,
    key: string,
    wrapper: InstanceWrapper,
    queue: FakeQueue,
    options: BullQueueEventOptions,
  ) {
    if (!wrapper.isDependencyTreeStatic()) {
      this.logger.warn(
        `Warning! "${wrapper.name}" class is request-scoped and it defines an event listener ("${wrapper.name}#${key}"). Since event listeners cannot be registered on scoped providers, this handler will be ignored.`,
      );
      return;
    }

    queue.process(options.eventName, instance[key].bind(instance));
  }
}
