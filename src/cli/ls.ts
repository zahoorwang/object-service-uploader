import chalk from 'chalk-template';
import { Command, Option } from 'commander';

import { colorintro, headline, printf, sorryline } from './utils';

export function lsify(subs: CommandModule[]) {
  const ls = new Command('ls');

  ls.description('show all uploader vendor list')
    .addOption(new Option('-n, --name <string>', 'specify uploader vendor with examples').choices(subs.length ? subs.map(sub => sub.name) : []))
    .action((opts: { name?: string }) => {
      if (opts.name) {
        const sub = subs.find(it => it.name === opts.name)!;
        printf(
          printf.EMPTY, //
          headline(chalk`for {#725e82 ${sub.intro}}`),
          printf.EMPTY,
          sub.example ? chalk`${sub.example}` : sorryline(`${opts.name!.toUpperCase()} no examples available`),
          printf.EMPTY
        );
      } else {
        printf(
          printf.EMPTY, //
          headline(),
          printf.EMPTY,
          colorintro(subs.map(sub => sub.intro)) || sorryline('no vendor support currently available'),
          printf.EMPTY
        );
      }
    });

  return ls;
}
