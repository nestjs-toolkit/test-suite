import { AssertResponseGql } from './assert-response-gql';
import { nestedPropertyVal } from './helpers';

type ValidationType = any;

export class AssertResponseHttp extends AssertResponseGql {
  public get validation(): ValidationType[] {
    return this.body.validation || [];
  }

  public get firstResult() {
    if (!this.body) {
      throw new Error('Empty data');
    }

    return this.body;
  }

  public assertHasErrors(): AssertResponseGql {
    if (!this.statusOK()) {
      return this;
    }

    this.dump();
    throw new Error(`Expected ERROR but not return`);
  }

  public assertNoErrors(): AssertResponseGql {
    if (this.statusOK()) {
      return this;
    }

    this.dump();
    console.error('Failed->assertNoErrors', this.response.statusCode);
    throw new Error(`Expected not ERROR but return`);
  }

  public assertException(): AssertResponseGql {
    this.assertStatusHttp(400);
    return this;
  }

  public statusOK(): boolean {
    return this.response.statusCode === 200 || this.response.statusCode === 201;
  }

  public assertNoException(): AssertResponseGql {
    if (this.statusOK()) {
      return this;
    }

    this.dump();
    throw new Error(`Expected HTTP 200 but return ${this.response.statusCode}`);
  }

  public expectedFailedInputValidation(
    field: string,
    rule?: string,
    message?: string,
  ): AssertResponseGql {
    const fields = this.validation.filter((f) => f.field === field);

    if (!fields.length) {
      console.log({
        dump: `[expectedFailedInputValidation] NOT FOUND FIELD ERROR`,
        field,
        rule,
        validations: this.validation,
      });
    }

    expect(fields.length).toBeGreaterThan(0);

    if (!rule) {
      return this;
    }

    const result = fields.find((f) => f.validation === rule);

    if (!result) {
      console.log({
        dump: '[expectedFailedInputValidation] NOT FOUND RULES FOR FIELD',
        field,
        rule,
        validations: fields,
      });
    }

    // `Expect error on field: ${field} with rule: ${rule}`,
    expect(result).toBeDefined();

    if (message) {
      expect(result.message).toBe(message);
    }

    return this;
  }

  public expectedValidationError(): AssertResponseGql {
    return this.assertErrorCode('validation_failed');
  }

  public assertErrorCode(code: string): AssertResponseGql {
    this.assertHasErrors();
    nestedPropertyVal(this.body, 'code', code);

    return this;
  }

  public assertErrorMessage(code: string): AssertResponseGql {
    this.assertHasErrors();
    nestedPropertyVal(this.body, 'message', code);

    return this;
  }
}
