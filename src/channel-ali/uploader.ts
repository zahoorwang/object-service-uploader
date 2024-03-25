import path from 'node:path';

import ms from 'ms';
import PQueue from 'p-queue';
import Client, { Options, PutObjectOptions } from 'ali-oss';

import { fail, warn } from '../core/echo';
import { Uploader } from '../core/uploader';

import { AliEndpoint } from './endpoint';

type AliPutPrepare = {
  file: string;
  name?: string;
  access?: string;
  accessPathProcessor?: (options: { file: string; name?: string; access?: string }) => string;
  options?: PutObjectOptions;
};

export class AliUploader extends Uploader<Options, AliPutPrepare> implements Uploader<Options, AliPutPrepare> {
  public constructor(options?: Partial<Options>) {
    super({
      accessKeyId: '',
      accessKeySecret: '',
      bucket: '',
      region: 'oss-cn-hangzhou',
      internal: false,
      endpoint: new AliEndpoint().get('oss-cn-hangzhou', false),
      secure: true,
      timeout: 60000,
      cname: false,
      ...options
    });

    this.ensure('region', this.#_region);
    this.ensure('internal', this.#_internal);
    this.ensure('endpoint', this.#_endpoint);
    this.ensure('timeout', this.#_timeout);
  }

  public override putting(files: string[]): Promise<Uploader.RPut[]>;
  public override putting(options: Uploader.Put<AliPutPrepare>): Promise<Uploader.RPut[]>;
  public override async putting(options: unknown): Promise<Uploader.RPut[]> {
    if (!this.options.accessKeyId) throw new Error(fail(`AliUploader required "accessKeyId" option`));
    if (!this.options.accessKeySecret) throw new Error(fail(`AliUploader required "accessKeySecret" option`));
    if (!this.options.region && !this.options.endpoint) throw new Error(fail(`AliUploader required "region" or "endpoint" option`));

    const objects: Uploader.Put<AliPutPrepare> = Array.isArray(options) ? { files: options } : (options as Uploader.Put<AliPutPrepare>);

    if (!objects.files.length) return console.log(warn(`no upload, the list of files is empty`)), [];

    objects.access = objects.access ?? '';
    objects.retry = Math.round(Math.max(objects.retry ?? 0, 0));
    objects.concurrency = Math.round(Math.max(objects.concurrency ?? 1, 1));
    objects.accessPathProcessor ??= ({ file, name, access }) => {
      return (name || path.posix.normalize(path.join(access || '', path.relative(process.cwd(), file)))).replace(/^\//, '');
    };
    objects.files = objects.files.map(it => {
      if (typeof it === 'string') {
        return { file: it, name: objects.accessPathProcessor?.({ name: '', file: it, access: objects.access! }) };
      } else {
        const access = it.access ?? objects.access ?? '';
        const accessPathProcessor = (it.accessPathProcessor ?? objects.accessPathProcessor)!;
        return { file: it.file, name: accessPathProcessor({ file: it.file, name: it.name, access })!, options: it.options };
      }
    });
    await objects.before?.();

    // @ts-ignore
    // retryMax 是 OSS Client 的属性，没有在 d.ts 文件描述，源码中翻出来的
    const client = new Client({ ...this.options, retryMax: objects.retry });
    const queue = new PQueue({ concurrency: objects.concurrency, autoStart: false });
    objects.files.forEach(it => queue.add(() => this.#_upload(client, it.name!, it.file, it.options)), void 0);

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

  async #_upload(client: Client, name: string, file: string, options?: PutObjectOptions) {
    // FIX: 什么时候 ali-oss 依赖的 urllib 从 2.41.0 升级了，什么时候去掉这个 warn 覆盖
    // 主要是这里了：https://github.com/node-modules/urllib/blob/2.41.0/lib/urllib.js#L513
    const primitive = console.warn;
    console.warn = (..._args: any[]) => {};

    const result: Uploader.RPut = await client
      .put(name, file, options)
      .then(response => ({ file, name: response.name, link: response.url, error: false }))
      .catch(error => ({ file, name, link: '', error }));

    // 还原 warn 覆盖
    console.warn = primitive;
    return result;
  }

  #_timeout(value: Uploader.Value<Options, 'timeout'>) {
    const data = typeof value === 'string' ? ms(value) : value;
    this.property('timeout', Math.round(Math.max(data || 0, 0)));
  }

  #_region(value: Uploader.Value<Options, 'region'>) {
    const endpoint = new AliEndpoint();
    const hasRegion = Object.keys(endpoint.data).includes(value || '');
    if (!hasRegion) return console.log(warn(`"${value}" not in AliUploader region/endpoint`));
    this.property('region', value);
    endpoint.has(this.get('endpoint') || '') && this.property('endpoint', endpoint.get(value!, this.get('internal')!));
  }

  #_internal(value: Uploader.Value<Options, 'internal'>) {
    this.property('internal', Boolean(value));
    this.property('endpoint', new AliEndpoint().get(this.get('region')!, Boolean(value)));
  }

  #_endpoint(value: Uploader.Value<Options, 'endpoint'>) {
    this.property('endpoint', value ? value : new AliEndpoint().get(this.get('region')!, this.get('internal')!));
  }
}
