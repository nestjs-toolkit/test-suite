import { ObjectId } from 'bson';
import jsonwebtoken from 'jsonwebtoken';
import { AbstractPersona } from '../../lib/personas';
import { AbstractAppTestSuite } from '../../lib';
import { MainSuite } from './main-suite';
import { FakeUser } from './types';

export class UserPersona extends AbstractPersona<FakeUser> {
  public user: FakeUser = {
    id: new ObjectId().toString(),
    email: 'user@demo.com',
    roles: [],
  };

  protected async onInit(): Promise<void> {
    await super.onInit();
    // this.context.set('factory', new ModelFactory());
  }

  protected isAuthorized(): boolean {
    return true;
  }

  protected getInstanceSuite(): AbstractAppTestSuite {
    return new MainSuite();
  }

  protected generateJWT(): string {
    return jsonwebtoken.sign({ fake: 1, ...this.user }, 'secret');
  }
}
