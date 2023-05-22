import { Collection } from 'collect.js';
import { DiscoveryModule } from '@nestjs/core';
import { DynamicModule, Module } from '@nestjs/common';
import { Provider } from '@nestjs/common/interfaces/modules/provider.interface';
import { BullMetadataAccessor } from '@nestjs/bull/dist/bull-metadata.accessor';
import { FakeQueuesService } from './fake-queues.service';
import { FakeBullExplorer } from './fake-bull.explorer';
import { FAKE_QUEUE_STORAGE_TOKEN } from './constants';
import { FakeQueue } from './fake-queue';
import { FakeJob } from './fake-job';

@Module({})
export class FakeQueuesModules {
  static forRoot({ queues = [] }: { queues: string[] }): DynamicModule {
    const storage = new Collection<FakeJob>({});

    const providers: Provider[] = queues.map((queue) =>
      new FakeQueue(queue, storage).getProvider(),
    );

    providers.push({
      provide: FAKE_QUEUE_STORAGE_TOKEN,
      useValue: storage,
    });

    providers.push(FakeQueuesService);

    return {
      module: FakeQueuesModules,
      imports: [DiscoveryModule],
      providers: [...providers, FakeBullExplorer, BullMetadataAccessor],
      exports: providers,
      global: true,
    };
  }
}
