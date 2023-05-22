import { UserPersona } from './stub/user-persona';

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
        payload: { a: 1, b: 2 },
      });

      response.dump().assertNoErrors().toBe('result', 3);
    });

    it('BadRequest', async () => {
      const response = await userPersona.http.request({
        url: '/calc/sum',
        method: 'POST',
        payload: { a: 1 },
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
