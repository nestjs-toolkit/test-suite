import fs from 'fs';
import FormData from 'form-data';
import { DocumentNode } from 'graphql';
import { AssertResponseGql } from '../responses/assert-response-gql';
import { AbstractClient } from './abstract.client';

export class GqlClient extends AbstractClient {
  protected config: any = {
    uri: '/graphql',
    user: null,
    headers: {
      Accept: 'application/json',
    },
  };

  public async request<Vars = any>(
    query: string | DocumentNode,
    variables?: Vars,
    headers?: any,
  ): Promise<AssertResponseGql> {
    const input = {
      query: typeof query === 'string' ? query : query.loc.source.body,
      variables,
    };

    this.config.headers = Object.assign({}, this.config.headers, headers);

    const response = await this.app.inject({
      method: 'POST',
      url: this.config.uri,
      headers: this.config.headers,
      payload: input,
    });

    this.reset();
    return new AssertResponseGql(response);
  }

  public async requestUpload<Vars = any>(
    query: string | DocumentNode,
    variables: Vars,
    attaches: { variable: string; path: string; filename?: string }[],
    headers?: any,
  ): Promise<AssertResponseGql> {
    const map = attaches.reduce((r, n, i) => {
      r[i] = [`variables.${n.variable}`];
      return r;
    }, {});

    const operations = {
      query: typeof query === 'string' ? query : query.loc.source.body,
      variables,
    };

    this.config.headers = Object.assign({}, this.config.headers, headers);

    const form = new FormData();
    form.append('operations', JSON.stringify(operations));
    form.append('map', JSON.stringify(map));

    attaches.forEach((n, i) => {
      form.append(i.toString(), fs.createReadStream(n.path), {
        filename: n.filename,
      });
    });

    const response = await this.app.inject({
      method: 'POST',
      url: this.config.uri,
      headers: form.getHeaders(this.config.headers),
      payload: form,
    });

    this.reset();
    return new AssertResponseGql(response);
  }
}
