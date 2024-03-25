import { globby } from 'globby';
import { SingleBar } from 'cli-progress';
import { Command, Option } from 'commander';

import { succ, warn } from '../core/echo';
import { configure, printf, single } from '../cli/utils';

import { AliEndpoint as Endpoint } from './endpoint';
import { AliUploader as Uploader } from './uploader';

export const name = 'oss';

export const intro = 'Ali Cloud Object Storage Service (OSS)';

export const example = `osu oss -f data/**/* --access-key-id xxxx --access-key-secret xxxx`;

export function commandify() {
  const oss = new Command(name);

  oss
    .usage('[options]')
    .configureHelp(configure)
    .addOption(new Option('-f, --file <globify...>', 'find objects that will to be uploaded, support glob format'))
    .addOption(new Option('--exclude <globify...>', 'exclude items that do not need to be uploaded').env('OSU_EXCLUDE'))
    .addOption(new Option('--access <string>', 'the bucket access root').env('OSU_OSS_ACCESS'))
    .addOption(new Option('--access-key-id <string>', 'access id you create').env('OSU_OSS_ACCESS_KEY_ID'))
    .addOption(new Option('--access-key-secret <string>', 'access secret you create').env('OSU_OSS_ACCESS_KEY_SECRET'))
    .addOption(new Option('--bucket <string>', 'the default bucket you want to access').env('OSU_OSS_BUCKET'))
    .addOption(new Option('--region <string>', 'the bucket data region location').default('oss-cn-hangzhou').env('OSU_OSS_REGION'))
    .addOption(new Option('--internal', 'access OSS with aliyun internal network or not, default is false. If your servers are running on aliyun too, you can set true to save lot of money').env('OSU_OSS_INTERNAL'))
    .addOption(new Option('--endpoint <string>', 'oss region domain. It takes priority over region').env('OSU_OSS_ENDPOINT'))
    .addOption(new Option('--secure', 'instruct OSS client to use HTTPS (secure: true) or HTTP (secure: false) protocol').default(true).env('OSU_OSS_SECURE'))
    .addOption(new Option('--timeout <number>', 'instance level timeout for all operations').default(60000).env('OSU_OSS_TIMEOUT'))
    .addOption(new Option('--cname', 'use custom domain name').env('OSU_OSS_CNAME'))
    .addOption(new Option('--retry <number>', 'number of failed retries').argParser(parseFloat).default(0).env('OSU_OSS_RETRY'))
    .addOption(new Option('--concurrency <number>', 'number of uploader concurrency times').argParser(parseFloat).default(1).env('OSU_CONCURRENCY'))
    .addOption(new Option('--progress <mode>', 'uploading progress display mode').default('list').choices(['list', 'bar']).env('OSU_OSS_PROGRESS'))
    .action(async (opts: any) => {
      const { file, exclude, access, retry, progress, concurrency, ...options } = opts;
      const errors: Uploader.RPut[] = [];
      const files = await globby(file, { ignore: exclude, onlyFiles: true, absolute: true });
      const bar: SingleBar | undefined = progress === 'bar' ? single(name, files.length) : undefined;

      printf('');

      await new Uploader(options)
        .putting({
          files,
          access,
          puttingProgress(index, total, result) {
            result.error && errors.push(result);

            if (progress === 'list') {
              result.error || console.log(succ(`Done: ${result.file} ==> ${result.link}`));
            } else {
              bar?.update(index);
              index === total && bar?.stop();
            }
          }
        })
        .catch(error => console.log(typeof error === 'string' ? error : error.message));

      printf('');
      errors.length && printf(...errors.map(it => warn(`Not Upload: ${it.file}`)), '');
    });

  return oss;
}

export { Endpoint, Uploader };
