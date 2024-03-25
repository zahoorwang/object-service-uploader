import { Command, Option } from 'commander';

import { configure, printf } from './utils';

const wrapper = (sub: CommandModule, sync?: boolean) =>
  new Promise<Endpoint>(resolve => {
    const endpoint = new sub.Endpoint();
    sync && endpoint.remote(true);
    resolve(endpoint);
  });

export function regionify(subs: CommandModule[]) {
  const region = new Command('region');

  region
    .description(`show all vendor's region/endpoint list`)
    .configureHelp(configure)
    .addOption(new Option('-n, --name <string>', `specify uploader vendor`).choices(subs.length ? subs.map(sub => sub.name) : []))
    .addOption(new Option('-s, --sync', 'synchronize data remotely'))
    .addOption(new Option('-f, --format <string>', 'format').choices(['table', 'json']).default('table'))
    .action(async (opts: { format: 'table' | 'json'; name?: string; sync?: boolean; file?: string }) => {
      if (opts.name) {
        const sub = subs.find(it => it.name === opts.name)!;
        const endpoint = await wrapper(sub, opts.sync);
        printf(printf.EMPTY, endpoint.printf(opts.format), printf.EMPTY);
      } else {
        printf(...(await Promise.all(subs.map(sub => wrapper(sub, opts.sync).then(endpoint => [printf.EMPTY, sub.intro, endpoint.printf(opts.format), printf.EMPTY])))).flat());
      }
    });

  return region;
}
