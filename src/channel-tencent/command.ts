import { globby } from 'globby';
import chalk from 'chalk-template';
import { SingleBar } from 'cli-progress';
import { Command, Option } from 'commander';

import { succ, warn } from '../core/echo';
import { configure, printf, single } from '../cli/utils';

import { TencentEndpoint as Endpoint } from './endpoint';
import { TencentUploader as Uploader } from './uploader';

export const name = 'cos';

export const intro = 'Tencent Cloud Object Storage (COS)';

export const example = `osu cos -f data/**/*`;

export function commandify() {
  const cos = new Command(name);

  cos
    .usage('[options]')
    .configureHelp(configure)
    .requiredOption('-f, --file <globify...>', 'find objects that will to be uploaded, support glob format')
    .addOption(new Option('--exclude <globify...>', 'exclude items that do not need to be uploaded').env('OSU_COS_EXCLUDE'))
    .addOption(new Option('--secret-id <string>', 'access id you create').env('OSU_COS_SECRET_ID'))
    .addOption(new Option('--secret-key <string>', 'access secret you create').env('OSU_COS_SECRET_KEY'))
    .addOption(new Option('--bucket <string>', 'the bucket you want to access').env('OSU_COS_BUCKET'))
    .addOption(new Option('--access <string>', `the bucket you want to access's root path`).env('OSU_COS_ACCESS'))
    .addOption(new Option('--region <string>', 'the bucket data region location').default('ap-beijing').env('OSU_COS_REGION'))
    .addOption(new Option('--endpoint <string>', 'COS region domain. It takes priority over region').env('OSU_COS_ENDPOINT'))
    .addOption(new Option('--secure', 'instruct COS client to use HTTPS (secure: true) or HTTP (secure: false) protocol').default(true).env('OSU_COS_SECURE'))
    .addOption(new Option('--timeout <number>', 'instance level timeout for all operations').default(60000).env('OSU_COS_TIMEOUT'))
    .addOption(new Option('--retry <number>', 'number of failed retries').argParser(parseFloat).default(0).env('OSU_COS_RETRY'))
    .addOption(new Option('--concurrency <number>', 'number of uploader concurrency times').argParser(parseFloat).default(1).env('OSU_COS_CONCURRENCY'))
    .addOption(new Option('--progress <mode>', 'uploading progress display mode').default('list').choices(['list', 'bar']).env('OSU_COS_PROGRESS'))
    .action(async (opts: any) => {
      const { file, exclude, access, retry, progress, concurrency, ...options } = opts;

      const errors: Uploader.RPut[] = [];
      const files = await globby(file, { ignore: exclude, onlyFiles: true, absolute: true });
      const bar: SingleBar | undefined = progress === 'bar' ? single(name) : undefined;

      printf('');

      await new Uploader({
        SecretId: options.secretId || '',
        SecretKey: options.secretKey || '',
        Protocol: options.secure ? 'https' : 'http',
        Timeout: options.timeout,
        FileParallelLimit: concurrency,
        ChunkParallelLimit: concurrency,
        ChunkRetryTimes: retry,
        Bucket: options.bucket || '',
        Region: options.region,
        Domain: options.endpoint || '{Bucket}.cos.{Region}.myqcloud.com'
      })
        .putting({
          files,
          access,
          before() {
            bar?.start(files.length, 0);
          },
          puttingProgress(index, total, result) {
            result.error && errors.push(result);

            if (progress === 'list') {
              result.error || console.log(succ(`Done: ${chalk`{gray ${result.file}}`} ==> ${chalk`{white ${result.link}}`}`));
            } else {
              bar?.update(index);
              index === total && bar?.stop();
            }
          }
        })
        .catch(error => console.log(typeof error === 'string' ? error : error.message));

      printf('');
      errors.length && printf(...errors.map(it => warn(`Not Upload: ${it.file} ${chalk`{#c91f37 ${it.error}}`}`)), '');
    });

  return cos;
}

export { Endpoint, Uploader };
