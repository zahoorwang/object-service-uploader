import { resolve } from 'node:path';

import { load as htmlify } from 'cheerio';

import { Endpoint } from '../core/endpoint';
import { jsonify, tableify } from '../core/formatter';

export class AliEndpoint extends Endpoint<Ali.Struct> implements Endpoint<Ali.Struct> {
  static #_inst: AliEndpoint;

  public constructor() {
    if (AliEndpoint.#_inst) return AliEndpoint.#_inst;

    super(
      resolve(import.meta.dirname, '../../data', 'ali.json'), //
      'https://help.aliyun.com/zh/oss/user-guide/regions-and-endpoints' //
    );
    return (AliEndpoint.#_inst = this);
  }

  public override get(region: string, internal: boolean = false): string {
    return this.data[region]?.[internal ? 'internal' : 'endpoint'] ?? '';
  }

  public override has(endpoint: string): boolean {
    return Object.values(this.data)
      .map(it => [it.endpoint, it.internal].filter(Boolean))
      .flat()
      .includes(endpoint);
  }

  public override printf(format: 'table' | 'json' = 'table'): string {
    return format === 'table'
      ? tableify<Ali.Struct>(this.data, ['Name', 'Region', 'Endpoint', 'Internal Endpoint'], ([region, { name, endpoint, internal }]) => [name, region, endpoint, internal])
      : jsonify<Ali.Struct>(this.data, ([region, { name, endpoint, internal }]) => ({ name, region, endpoint, internal }));
  }

  protected override async parsing(html: string): Promise<Endpoint.Mapped<Ali.Struct>> {
    const data: Endpoint.Mapped<Ali.Struct> = {};

    const $ = htmlify(html);
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

      if (name.includes('Region') || name.includes('金融')) return;

      data[region] = { name, endpoint, internal };
    });

    return data;
  }
}
