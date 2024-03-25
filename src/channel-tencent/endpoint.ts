import { resolve } from 'node:path';

import { load as htmlify } from 'cheerio';

import { Endpoint } from '../core/endpoint';
import { jsonify, tableify } from '../core/formatter';

export class TencentEndpoint extends Endpoint<Tencent.Struct> implements Endpoint<Tencent.Struct> {
  static #_inst: TencentEndpoint;

  public constructor() {
    if (TencentEndpoint.#_inst) return TencentEndpoint.#_inst;

    super(
      resolve(import.meta.dirname, '../../data', 'tencent.json'), //
      'https://cloud.tencent.com/document/product/436/6224' //
    );
    return (TencentEndpoint.#_inst = this);
  }

  public override get(region: string): string {
    return this.data[region]?.domain ?? '';
  }

  public override has(endpoint: string): boolean {
    return !Object.values(this.data)
      .map(it => /(\S+).cos.(\S+).myqcloud.com/gi.test(endpoint))
      .includes(false);
  }

  public override printf(format: 'table' | 'json' = 'table'): string {
    return format === 'table'
      ? tableify<Tencent.Struct>(this.data, ['Name', 'Region', 'Domain'], ([region, { name, domain }]) => [name, region, domain])
      : jsonify<Tencent.Struct>(this.data, ([region, { name, domain }]) => ({ name, region, domain }));
  }

  protected override async parsing(html: string): Promise<Endpoint.Mapped<Tencent.Struct>> {
    const data: Endpoint.Mapped<Tencent.Struct> = {};

    const $ = htmlify(html);
    $('div.table-container table > tbody > tr').each((_, el) => {
      const [, , name, region, domain] = $(el)
        .find('td')
        .map((__, td) => $(td).text().replace('（已售罄）', ''))
        .toArray();

      if (region.includes('地域简称') || name.includes('金融')) return;

      data[region] = { name, domain };
    });

    return data;
  }
}
