#!/usr/bin/env node --no-warnings=ExperimentalWarning

import { join } from 'node:path';
import { statSync as stat, existsSync as exists } from 'node:fs';

import dotenv from 'dotenv';
import { expand as dotenvExpand } from 'dotenv-expand';

import { globby } from 'globby';
import { program } from 'commander';

import pkg from '../package.json' assert { type: 'json' };

import { dirname } from './core/dirname';

import { lsify } from './cli/ls';
import { regionify } from './cli/region';
import { colorintro, configure, headline, is } from './cli/utils';

let subs: CommandModule[];

function env() {
  const file = join(process.cwd(), '.env');
  if (!(exists(file) && stat(file).isFile())) return;
  dotenvExpand(dotenv.config({ path: file, encoding: 'utf8' }));
}

async function subcommand() {
  if (subs?.length) return;
  const cwd = dirname(import.meta.url);
  const files = await globby(['channel-*/command.*'], { cwd, absolute: true, onlyFiles: true });
  const format = (file: string) => import(file).then(module => (is(module) ? { ...module, file: file.replace(cwd, '').replace(/^\/?/, '').replace(/\.js$/, '') } : (null as any))).catch(() => null as any);
  subs = (await Promise.all<CommandModule>(files.map(file => format(file)))).filter(Boolean);
}

async function commandify() {
  program
    .name('osu')
    .usage('[command] [options]')
    .configureHelp(configure)
    .addHelpText('before', `\n${headline(`compatible with storage services from multiple vendors\n\n${colorintro(subs.map(sub => sub.intro))}`)}\n`)
    .helpOption('-h, --help', 'output usage information')
    .version(pkg.version, '-v, --version', 'output the current version')
    .helpCommand(false);

  program.addCommand(lsify(subs), { isDefault: true });
  program.addCommand(regionify(subs));
  subs.forEach(({ commandify }) => (program.addCommand(commandify()), void 0));
  await program.parseAsync();
}

(async () => {
  env();
  await subcommand();
  await commandify();
})();
