import path from 'node:path';

import PQueue from 'p-queue';
import Client, { UploadFileParams } from 'cos-nodejs-sdk-v5';

import { omit } from '../cli/utils';
import { fail, warn } from '../core/echo';
import { Uploader } from '../core/uploader';

import { TencentEndpoint } from './endpoint';

type TencentPutPrepare = {
  file: string;
  name?: string;
  access?: string;
  bucket?: string;
  region?: string;
  accessPathProcessor?: (options: { file: string; name?: string; access?: string }) => string;
  options?: Omit<UploadFileParams, 'Bucket' | 'Region' | 'FilePath' | 'Key'>;
};

const regex = /\S+\.cos\.\S+\.myqcloud\.com/i;

export class TencentUploader extends Uploader<Tencent.Options, TencentPutPrepare> implements Uploader<Tencent.Options, TencentPutPrepare> {
  public constructor(options?: Partial<Tencent.Options>) {
    super({
      SecretId: '',
      SecretKey: '',
      Protocol: 'https',
      Timeout: 60000,
      FileParallelLimit: 1,
      ChunkParallelLimit: 1,
      ChunkRetryTimes: 0,
      ChunkSize: 1024 * 1024 * 8,
      Proxy: '',
      Bucket: '',
      Region: 'ap-beijing',
      Domain: '{Bucket}.cos.{Region}.myqcloud.com',
      ...options
    });

    this.ensure('Timeout', this.#_timeout);
    this.ensure('Region', this.#_region);
  }

  public override putting(files: string[]): Promise<Uploader.RPut[]>;
  public override putting(options: Uploader.Put<TencentPutPrepare>): Promise<Uploader.RPut[]>;
  public override async putting(options: unknown): Promise<Uploader.RPut[]> {
    if (!this.options.SecretId) throw new Error(fail(`TencentUploader required "SecretId" option`));
    if (!this.options.SecretKey) throw new Error(fail(`TencentUploader required "SecretKey" option`));

    const objects: Uploader.Put<TencentPutPrepare> = Array.isArray(options) ? { files: options } : (options as Uploader.Put<TencentPutPrepare>);

    if (!objects.files.length) return console.log(warn(`no upload, the list of files is empty`)), [];

    objects.access = objects.access ?? '';
    'retry' in objects && (objects.retry = Math.round(Math.max(objects.retry ?? 0, 0)));
    'concurrency' in objects && (objects.concurrency = Math.round(Math.max(objects.concurrency ?? 1, 1)));
    objects.accessPathProcessor ??= ({ file, name, access }) => {
      return (name || path.posix.normalize(path.join(access || '', path.relative(process.cwd(), file)))).replace(/^\//, '');
    };
    objects.files = objects.files.map(it => {
      if (typeof it === 'string') {
        return {
          file: it,
          options: {
            Bucket: this.options.Bucket,
            Region: this.options.Region,
            Key: objects.accessPathProcessor?.({ name: '', file: it, access: objects.access! }),
            FilePath: it
          } as any
        };
      } else {
        const Bucket = it.bucket ?? this.options.Bucket ?? '';
        const Region = it.region ?? this.options.Region ?? '';
        const access = it.access ?? objects.access ?? '';
        const accessPathProcessor = (it.accessPathProcessor ?? objects.accessPathProcessor)!;
        return {
          file: it.file,
          options: {
            ...it.options,
            Bucket,
            Region,
            Key: accessPathProcessor({ file: it.file, name: it.name, access }),
            FilePath: it.file
          } as any
        };
      }
    });
    await objects.before?.();

    const client = new Client(
      omit(
        {
          ...this.options,
          Domain: '{Bucket}.cos.{Region}.myqcloud.com',
          ChunkRetryTimes: objects.retry ?? this.options.ChunkRetryTimes,
          FileParallelLimit: objects.concurrency ?? this.options.FileParallelLimit,
          ChunkParallelLimit: objects.concurrency ?? this.options.ChunkParallelLimit
        },
        ['Bucket', 'Region']
      )
    );
    const queue = new PQueue({ concurrency: objects.concurrency ?? this.options.FileParallelLimit, autoStart: false });
    objects.files.forEach(it => queue.add(() => this.#_upload(client, (it.options as any)!)), void 0);

    const progressing = () => {
      return new Promise<Uploader.RPut[]>(resolve => {
        let completed = 0;
        const total = queue.size;
        const results: Uploader.RPut[] = [];

        queue.on('completed', (result: Uploader.RPut) => {
          completed += 1;
          results.push(result);
          objects.puttingProgress?.(completed, total, result);
          completed === total && resolve(results);
        });
        queue.start();
      });
    };

    return await progressing();
  }

  async #_upload(client: Client, options: UploadFileParams) {
    const protocol = (this.options.Protocol || 'http').replace(/:$/, '');
    const location = (value: string) => {
      if (this.options.Domain && !regex.test(this.options.Domain)) {
        return value.replace(regex, this.options.Domain);
      }
      return value;
    };
    const result = await client
      .uploadFile(options)
      .then(response => {
        // @ts-ignore
        // url 响应结果为当 Client 中的 Domain 属性值为指定值时
        const { Location, url } = response;
        return { file: options.FilePath, name: options.Key, link: url ? url : `${protocol}://${location(Location)}`, error: false };
      })
      .catch(error => ({ file: options.FilePath, name: options.Key, link: '', error }));
    return result;
  }

  #_timeout(value: Uploader.Value<Tencent.Options, 'Timeout'>) {
    this.property('Timeout', Math.round(Math.max(value || 0, 0)));
  }

  #_region(value: Uploader.Value<Tencent.Options, 'Region'>) {
    const endpoint = new TencentEndpoint();
    const hasRegion = Object.keys(endpoint.data).includes(value || '');
    if (!hasRegion) return console.log(warn(`"${value}" not in TencentUploader region/domain`));
    this.property('Region', value);
    this.options.Domain || this.property('Domain', '{Bucket}.cos.{Region}.myqcloud.com');
  }
}
