import { normalize, resolve } from 'node:path';

import got from 'got';
import table from 'tty-table';
import { gray } from 'picocolors';
import * as cheerio from 'cheerio';

import { reader } from '@utils/reader';
import { writer } from '@utils/writer';

type Cached = {
  name: string;
  endpoint: string;
  internal: string;
};

export class Endpoint implements EndpointProcessor {
  private static _instance: Endpoint | null = null;

  public readonly REMOTE: string = 'https://help.aliyun.com/zh/oss/user-guide/regions-and-endpoints';

  private readonly LOCAL: string = normalize(resolve(__dirname, '../../', 'data/ali.json'));

  #_cache: { [region: string]: Cached } = {};

  #_header: table.Header[] = [
    { value: 'Name', color: 'magenta', headerColor: 'magenta', align: 'left', headerAlign: 'left' },
    { value: 'Region', color: 'yellow', headerColor: 'yellow', align: 'left', headerAlign: 'left' },
    { value: 'Endpoint', color: 'blue', headerColor: 'blue', align: 'left', headerAlign: 'left' },
    { value: 'Internal Endpoint', color: 'green', headerColor: 'green', align: 'left', headerAlign: 'left' }
  ];

  constructor() {
    return (Endpoint._instance ??= (this.#local(), this));
  }

  #local(): void {
    this.#_cache = reader(this.LOCAL, 'json');
  }

  public get(region: string, internal: boolean = false): string {
    return this.#_cache[region]?.[internal ? 'internal' : 'endpoint'] ?? '';
  }

  public output(format: 'table' | 'json' = 'table') {
    const list = Object.entries(this.#_cache).map(([region, data]) => {
      const { name, endpoint, internal } = data;
      return { name, region, endpoint, internal };
    });

    if (format === 'json') {
      console.log(list);
    } else {
      const columns = list.map(({ name, region, endpoint, internal }) => [name, region, endpoint, internal || gray('不支持')]);
      console.log(table(this.#_header, columns).render());
      console.log(gray(`\n   Table data from: ${this.REMOTE}\n`));
    }
  }

  public async remote(): Promise<void> {
    const html = (await got.get(this.REMOTE).catch(() => ({ body: '' }))).body;
    if (!html) return;

    const $ = cheerio.load(html);
    const data: { [region: string]: Cached } = {};

    $('section > table > tbody > tr').each((_, el) => {
      const [name, region, endpoint, internal] = $(el)
        .find('td')
        .map((__, td) =>
          $(td)
            .find('p')
            .first()
            .text()
            .replace(/(①|不支持)/gi, '')
        )
        .toArray();

      if (!(name.includes('Region') || name.includes('金融'))) {
        data[region] = { name, endpoint, internal };
      }
    });

    this.#_cache = data;
  }

  public async synchronize(): Promise<void> {
    await this.remote();
    writer(this.LOCAL, JSON.stringify(this.#_cache, null, 2));
  }
}
