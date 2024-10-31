import { get } from 'lodash';
import { ObjectId } from 'bson';
import { Response } from 'light-my-request';
import {
  nestedProperty,
  nestedPropertyVal,
  notNestedProperty,
} from './helpers';

type ValidationType = any;

export class AssertResponseGql {
  constructor(public response: Response) {}

  public get body() {
    return this.response.json();
  }

  public get bodyRaw() {
    try {
      const body = this.response.json();
      return JSON.stringify(body, null, 2);
    } catch (e) {
      return this.response.body;
    }
  }

  public get validation(): ValidationType[] {
    return this.body.errors[0]?.extensions?.validation || [];
  }

  public get firstResult() {
    if (!this.body.data) {
      throw new Error('Empty data');
    }

    const key = Object.keys(this.body.data)[0];

    if (!key) {
      console.error(`empty firstResult`, this.body);
    }

    return this.body.data[key];
  }

  public dump(): AssertResponseGql {
    console.log('===DUMP===', this.bodyRaw);
    return this;
  }

  public assertHasErrors(): AssertResponseGql {
    if (this.body.errors && this.body.errors.length) {
      return this;
    }

    this.dump();
    throw new Error(`Expected response ERROR but return OK`);
  }

  public assertNoErrors(): AssertResponseGql {
    if (this.body.errors && this.body.errors.length) {
      this.dump();
      console.error('Failed->assertNoErrors', this.body.errors);
      throw new Error(`Expected response OK but return ERROR`);
    }

    return this;
  }

  public assertResult(text: string): AssertResponseGql {
    expect(this.firstResult).toBe(text);
    return this;
  }

  public assertResultContain(text: string): AssertResponseGql {
    expect(this.firstResult).toContain(text);
    return this;
  }

  public assertResultNull(): AssertResponseGql {
    expect(this.firstResult).toBeNull();
    return this;
  }

  public assertResultTruthy(): AssertResponseGql {
    expect(this.firstResult).toBeTruthy();
    return this;
  }

  public assertException(): AssertResponseGql {
    this.assertStatusHttp(400);
    return this;
  }

  public assertNoException(): AssertResponseGql {
    let extensions;
    if (
      this.body.errors &&
      this.body.errors[0] &&
      this.body.errors[0].extensions &&
      this.body.errors[0].extensions.exception
    ) {
      extensions = this.body.errors[0].extensions;
    }

    if (this.response.statusCode !== 200) {
      console.error('assertNoException', extensions);
      this.dump();
      throw new Error(
        `Expected HTTP 200 but return ${this.response.statusCode}`,
      );
    }

    return this;
  }

  public assertStatusHttp(expectdStatus): AssertResponseGql {
    expect(this.response.statusCode).toBe(expectdStatus);
    return this;
  }

  public assertMessage(message: string): AssertResponseGql {
    return this.toBe('message', message);
  }

  public toBeNull(key): AssertResponseGql {
    expect(get(this.firstResult, key)).toBeDefined();
    expect(get(this.firstResult, key)).toBeNull();
    return this;
  }

  public toBeNotNull(key: string): AssertResponseGql {
    expect(get(this.firstResult, key)).toBeDefined();
    expect(get(this.firstResult, key)).not.toBeNull();
    return this;
  }

  public toBeExists(key: string): AssertResponseGql {
    nestedProperty(this.firstResult, key);
    return this;
  }

  public toBeNotExists(key: string): AssertResponseGql {
    notNestedProperty(this.firstResult, key);
    return this;
  }

  public toHaveLength(
    key: string,
    expectedQuantity: number,
  ): AssertResponseGql {
    const result = key ? get(this.firstResult, key) : this.firstResult;
    expect(result).toHaveLength(expectedQuantity);
    return this;
  }

  public toBeUndefined(key: string): AssertResponseGql {
    expect(this.getData(key)).toBeUndefined();
    return this;
  }

  public toBeDefined(key: string): AssertResponseGql {
    expect(this.getData(key)).toBeDefined();
    return this;
  }

  public toBe(key: string, expected): AssertResponseGql {
    expect(this.getData(key)).toBe(expected);
    return this;
  }

  public toEqual(key: string, expected): AssertResponseGql {
    expect(this.getData(key)).toEqual(expected);
    return this;
  }

  public toBeGreaterThan(
    key: string,
    expected: number | bigint,
  ): AssertResponseGql {
    expect(this.getData(key)).toBeGreaterThan(expected);
    return this;
  }

  public toBeGreaterThanOrEqual(
    key: string,
    expected: number | bigint,
  ): AssertResponseGql {
    expect(this.getData(key)).toBeGreaterThanOrEqual(expected);
    return this;
  }

  public toBeObjectId(key: string): AssertResponseGql {
    expect(ObjectId.isValid(this.getData(key))).toBeTruthy();
    return this;
  }

  public toMatch(key: string, expected: RegExp): AssertResponseGql {
    expect(this.getData(key)).toMatch(expected);
    return this;
  }

  public toContain(key: string, expected): AssertResponseGql {
    expect(this.getData(key)).toContain(expected);
    return this;
  }

  public toStrictEqual(key: string, expected): AssertResponseGql {
    expect(this.getData(key)).toStrictEqual(expected);
    return this;
  }

  public getData<T = any>(key?: string, defaultValue?: any): T {
    if (!key) {
      return this.firstResult;
    }

    return get(this.firstResult, key, defaultValue);
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
    nestedPropertyVal(this.body, 'errors.0.extensions.code', code);

    return this;
  }

  public assertErrorMessage(code: string): AssertResponseGql {
    this.assertHasErrors();
    nestedPropertyVal(this.body, 'errors.0.message', code);

    return this;
  }
}
