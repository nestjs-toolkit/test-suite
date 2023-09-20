import { InjectOptions } from 'light-my-request';
import { AssertResponseHttp } from '../responses/assert-response-http';
import { AbstractClient } from './abstract.client';

export class HttpClient extends AbstractClient {
  public async request(
    opts: InjectOptions | string,
  ): Promise<AssertResponseHttp> {
    const _opts: InjectOptions =
      typeof opts === 'string'
        ? { url: opts, headers: this.config.headers }
        : {
            ...opts,
            headers: Object.assign({}, this.config.headers, opts.headers),
          };

    const response = await this.app.inject(_opts);

    this.reset();
    return new AssertResponseHttp(response);
  }
}
