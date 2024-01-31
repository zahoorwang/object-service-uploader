import { normalize, resolve } from 'node:path';

import got from 'got';
import table from 'tty-table';
import { gray } from 'picocolors';
import * as cheerio from 'cheerio';

import { reader } from '@utils/reader';
import { writer } from '@utils/writer';

type Cached = {
  name: string;
  domain: string;
};

export class Endpoint implements EndpointProcessor {
  private static _instance: Endpoint | null = null;

  public readonly REMOTE: string = 'https://cloud.tencent.com/document/product/436/6224';

  private readonly LOCAL: string = normalize(resolve(__dirname, '../../', 'data/tencent.json'));

  #_cache: { [region: string]: Cached } = {};

  #_header: table.Header[] = [
    { value: 'Name', color: 'magenta', headerColor: 'magenta', align: 'left', headerAlign: 'left' },
    { value: 'Region', color: 'yellow', headerColor: 'yellow', align: 'left', headerAlign: 'left' },
    { value: 'Domain', color: 'blue', headerColor: 'blue', align: 'left', headerAlign: 'left' }
  ];

  constructor() {
    return (Endpoint._instance ??= (this.#local(), this));
  }

  #local(): void {
    this.#_cache = reader(this.LOCAL, 'json');
  }

  public get(region: string): string {
    return this.#_cache[region]?.domain ?? '';
  }

  public output(format: 'table' | 'json' = 'table') {
    const list = Object.entries(this.#_cache).map(([region, data]) => {
      const { name, domain } = data;
      return { name, region, domain };
    });

    if (format === 'json') {
      console.log(list);
    } else {
      const columns = list.map(({ name, region, domain }) => [name, region, domain || gray('不支持')]);
      console.log(table(this.#_header, columns).render());
      console.log(gray(`\n   Table data from: ${this.REMOTE}\n`));
    }
  }

  public async remote(): Promise<void> {
    const html = (await got.get(this.REMOTE).catch(() => ({ body: '' }))).body;
    if (!html) return;

    const $ = cheerio.load(html);
    const data: { [region: string]: Cached } = {};

    $('div.table-container table > tbody > tr').each((_, el) => {
      const [, , name, region, domain] = $(el)
        .find('td')
        .map((__, td) => $(td).text().replace('（已售罄）', ''))
        .toArray();

      if (!(region.includes('地域简称') || name.includes('金融'))) {
        data[region] = { name, domain };
      }
    });

    this.#_cache = data;
  }

  public async synchronize(): Promise<void> {
    await this.remote();
    writer(this.LOCAL, JSON.stringify(this.#_cache, null, 2));
  }
}
