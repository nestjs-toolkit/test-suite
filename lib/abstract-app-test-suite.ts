import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { TestingModule } from '@nestjs/testing';
import { HttpClient, GqlClient } from './clients';

export abstract class AbstractAppTestSuite {
  public app: NestFastifyApplication;
  public moduleFixture: TestingModule;

  protected abstract createTestingModule(): Promise<TestingModule>;

  public async init() {
    this.moduleFixture = await this.createTestingModule();

    this.app = this.createNestApplication();

    await this.beforeInitApp();
    await this.app.init();
    await this.afterInitApp();
    await this.app.getHttpAdapter().getInstance().ready();
  }

  protected async beforeInitApp() {
    return Promise.resolve();
  }

  protected async afterInitApp() {
    return Promise.resolve();
  }

  public async close() {
    await this.app.close();
  }

  public get<TType>(name: any): TType {
    return this.moduleFixture.get<TType>(name);
  }

  protected createNestApplication(): NestFastifyApplication {
    return this.moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
  }

  public makeHttp(): HttpClient {
    return new HttpClient(this.app);
  }

  public makeGql(): GqlClient {
    return new GqlClient(this.app);
  }
}
