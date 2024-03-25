import { readFileSync, writeFileSync } from 'node:fs';

import got from 'got';

export abstract class Endpoint<S extends Endpoint.Struct> {
  #_data: Endpoint.Mapped<S> = {};

  protected constructor(protected readonly file: string, public readonly url: string) {
    this.update(JSON.parse(readFileSync(this.file, 'utf8') || '{}'));
  }

  public get data() {
    return { ...this.#_data };
  }

  public async remote(sync?: boolean): Promise<void> {
    const html = (await got.get(this.url).catch(() => ({ body: '' }))).body;
    html && this.update(await this.parsing(html), sync);
  }

  public abstract has(endpoint: string): boolean;

  public abstract get(region: string, ...args: any[]): string;

  public abstract printf(format?: 'table' | 'json'): string;

  protected abstract parsing(html: string): Promise<Endpoint.Mapped<S>>;

  protected update(data: Endpoint.Mapped<S>, sync?: boolean): void {
    this.#_data = { ...data };
    sync && writeFileSync(this.file, JSON.stringify(this.data, null, 2) + '\n', 'utf8');
  }
}
