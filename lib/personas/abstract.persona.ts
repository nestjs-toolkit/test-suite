import { ObjectId } from 'bson';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { AbstractAppTestSuite } from '../abstract-app-test-suite';
import { GqlClient, HttpClient } from '../clients';
import { UserPerson } from '../types';

export abstract class AbstractPersona<User extends UserPerson<any> = any> {
  public jwt: string;
  public user: User;
  public suite: AbstractAppTestSuite;
  public context = new Map<string, any>();
  public defaultHeaders: Record<string, string> = {};
  public authHeader = { header: 'Authorization', prefix: 'Bearer ' };

  protected abstract isAuthorized(): boolean;

  protected abstract getInstanceSuite(): AbstractAppTestSuite;

  get gql(): GqlClient {
    if (this.isAuthorized()) {
      return this.suite
        .makeGql()
        .setHeaders(this.getDefaultHeaders())
        .header(
          this.authHeader.header,
          `${this.authHeader.prefix || ''}${this.getJwt()}`,
        );
    }

    return this.suite.makeGql().setHeaders(this.getDefaultHeaders());
  }

  get http(): HttpClient {
    if (this.isAuthorized()) {
      return this.suite
        .makeHttp()
        .setHeaders(this.getDefaultHeaders())
        .header(
          this.authHeader.header,
          `${this.authHeader.prefix || ''}${this.getJwt()}`,
        );
    }

    return this.suite.makeHttp().setHeaders(this.getDefaultHeaders());
  }

  get userId(): ObjectId {
    if (!this.user?.id) {
      throw new Error('Cannot get user id');
    }

    return new ObjectId(this.user.id);
  }

  public setDefaultHeaders(headers: Record<string, string>) {
    this.defaultHeaders = headers;
  }

  public getDefaultHeaders(): Record<string, string> {
    return this.defaultHeaders;
  }

  public async init() {
    this.suite = this.getInstanceSuite();

    await this.suite.init();

    await this.onInit();
  }

  public async close() {
    await this.suite.close();
  }

  public extendApp<T extends AbstractPersona>(person: T): T {
    person.suite = this.suite;
    person.context = this.context;
    return person;
  }

  public getProvider<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | string | symbol,
    options?: { strict: boolean },
  ): TResult {
    return this.suite.app.get(typeOrToken, options);
  }

  // public getModel<T>(modelName: string): Model<T> {
  //   return this.getProvider(getModelToken(modelName));
  // }

  public setUserSub(sub: string) {
    if (!this.user) {
      throw new Error('User is not set');
    }

    this.setUser({
      ...this.user,
      id: sub,
    });
  }

  public setUser(user: User) {
    this.jwt = null;
    this.user = Object.assign({}, user) as User;
  }

  public getUserId(): ObjectId {
    return new ObjectId(this.user.id);
  }

  public getUser(): User {
    if (!this.user) {
      throw new Error('User is not set');
    }

    return this.user;
  }

  protected getJwt(): string {
    if (!this.jwt) {
      this.jwt = this.generateJWT();
    }

    return this.jwt;
  }

  protected generateJWT(): string {
    const user = this.getUser();

    // return this.auth.signJwt(user).accessToken;
    return 'xxx.yyy.' + user.id;
  }

  protected async onInit(): Promise<void> {
    return Promise.resolve();
  }
}
