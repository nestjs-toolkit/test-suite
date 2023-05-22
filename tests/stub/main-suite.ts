import { Test, TestingModule } from '@nestjs/testing';
import { FakeQueuesModules } from '../../lib/queues';
import { AbstractAppTestSuite } from '../../lib';
import { CalcModule } from './app/calc.module';
import { QUEUE_GAME } from './app/contants';

export class MainSuite extends AbstractAppTestSuite {
  protected async createTestingModule(): Promise<TestingModule> {
    const module = Test.createTestingModule({
      imports: [
        CalcModule,
        // FakeQueuesModules.forRoot({
        //   queues: [QUEUE_GAME],
        // }),
      ],
    });

    return module.compile();
  }

  protected async beforeInitApp(): Promise<void> {
    // await this.app.register(MercuriusUpload, {
    //   maxFileSize: 40000000, // 40 MB
    //   maxFiles: 7,
    // });

    await super.beforeInitApp();
  }

  async close(): Promise<void> {
    await super.close();
  }
}
