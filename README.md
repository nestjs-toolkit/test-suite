## Descrição

Suíte de testes para NestJS com Fastify.

## Instalação

```bash
$ yarn add -D @nestjs-toolkit/test-suite
```

## Setup

Criação de uma suíte de testes:

o `MainSuite` é a class que ira construir sua aplicação NestJs. Nesse exemplo nosso modulo principal é o `CalcModule`.

Obs: Tmb é possível criar uma suite de testes sem módulo, ou até mesmo fazendo override de um módulo existente.

Veja mais em [criação de teste end-to-end](https://docs.nestjs.com/fundamentals/testing#end-to-end-testing).

```typescript
import {Test, TestingModule} from '@nestjs/testing';
import {AbstractAppTestSuite} from '@nestjs-toolkit/test-suite';

export class MainSuite extends AbstractAppTestSuite {
    protected async createTestingModule(): Promise<TestingModule> {
        const module = Test.createTestingModule({
            imports: [AppModule],
        });

        return module.compile();
    }

    protected async beforeInitApp(): Promise<void> {
        // override
        await super.beforeInitApp();
    }

    async close(): Promise<void> {
        // override
        await super.close();
    }
}

```

Criação da classe pesona ira facilitar a criação de testes e2e:

```typescript
import {ObjectId} from 'bson';
import jsonwebtoken from 'jsonwebtoken';
import {AbstractPersona} from '@nestjs-toolkit/test-suite/personas';
import {AbstractAppTestSuite} from '@nestjs-toolkit/test-suite';
import {MainSuite} from './main-suite';

export type FakeUser = {
    id: number,
    email: string,
    roles: string[]
};

export class UserPersona extends AbstractPersona<FakeUser> {
    public user: FakeUser = {
        id: 1,
        email: 'user@demo.com',
        roles: [],
    };

    protected async onInit(): Promise<void> {
        await super.onInit();
        // override
        // this.context.set('factory', new Foo());
    }

    protected isAuthorized(): boolean {
        return true;
    }

    protected getInstanceSuite(): AbstractAppTestSuite {
        // Important aqui é injetar a class MainSuite
        return new MainSuite();
    }

    protected generateJWT(): string {
        // Aqui ira montar o token que sera injetado no header das requisições
        return jsonwebtoken.sign({fake: 1, ...this.user}, 'secret');
    }
}

```

Como usar:

```typescript
describe('CalcController (e2e)', () => {
    const userPersona = new UserPersona();

    beforeAll(async () => {
        await userPersona.init();
    });

    afterAll(async () => {
        await userPersona.close();
    });

    describe('/calc/sum (POST)', function () {
        it('Success', async () => {
            const response = await userPersona.http.request({
                url: '/calc/sum',
                method: 'POST',
                payload: {a: 1, b: 2},
            });

            response.dump().assertNoErrors().toBe('result', 3);
        });

        it('BadRequest', async () => {
            const response = await userPersona.http.request({
                url: '/calc/sum',
                method: 'POST',
                payload: {a: 1},
            });

            response
                .dump()
                .assertHasErrors()
                .assertStatusHttp(400)
                .assertErrorCode('CALC_VALIDATION')
                .assertMessage('a and b are required');
        });
    });
});
```

## Teste

```bash
# unit tests
$ yarn test

# test coverage
$ yarn test:cov
```

## Licença

[MIT](LICENSE)
