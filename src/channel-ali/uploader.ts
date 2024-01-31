import Client from 'ali-oss';
import PQueue from 'p-queue';
import { red, yellow, italic, gray, inverse } from 'picocolors';

import { cpus } from '@utils/cpu';
import { Uploader } from '@core/uploader';
import { silent, fail, warn } from '@utils/logger';

import { Endpoint } from './endpoint';

export type AliUploaderOptions = Client.Options;

export default class AliUploader extends Uploader<AliUploaderOptions, Endpoint> implements UploaderProcessor<AliUploaderOptions, Client.PutObjectOptions, Endpoint> {
  #_endpoint: Endpoint = new Endpoint();

  #_options: UploaderOptions<AliUploaderOptions> = { accessKeyId: '', accessKeySecret: '' };

  constructor(args: Partial<UploaderOptions<AliUploaderOptions>> = {}) {
    super();
    this.setOptions(args);
  }

  public override get endpoint() {
    return this.#_endpoint;
  }

  async #upload(client: Client, options: UploaderPutHandle<Client.PutObjectOptions>): Promise<UploaderUploaded> {
    const { file, root, name: filename, ...opts } = { root: '', ...options };
    const name = this.bucketify({ cwd: this.#_options.cwd!, file, root, name: filename });

    // FIX: 什么时候 ali-oss 依赖的 urllib 从 2.41.0 升级了，什么时候去掉这个 warn 覆盖
    // 主要是这里了：https://github.com/node-modules/urllib/blob/2.41.0/lib/urllib.js#L513
    const primitive = console.warn;
    console.warn = (..._args: any[]) => {};

    const result = await client
      .put(name, file, opts)
      .then(response => ({ file, name: response.name, link: response.url, error: false }))
      .catch(error => {
        silent(red(error));
        warn(yellow(`AliUploader failed to upload file "${file}"`));
        return { file, name: name.replace(/^\//, ''), link: '', error: true };
      });

    // 还原 warn 覆盖
    console.warn = primitive;
    return result;
  }

  public async putting(file: string): Promise<void | UploaderUploaded>;
  public async putting(files: string[]): Promise<void | UploaderUploaded[]>;
  public async putting(object: UploaderPutHandle<Client.PutObjectOptions>): Promise<void | UploaderUploaded>;
  public async putting(objects: UploaderPutHandle<Client.PutObjectOptions>[]): Promise<void | UploaderUploaded[]>;
  public async putting(value: unknown): Promise<any> {
    if (!this.#_options.accessKeyId) return fail(italic(red(`AliUploader required ${inverse('accessKeyId')} option`)));
    if (!this.#_options.accessKeySecret) return fail(italic(red(`AliUploader required ${inverse('accessKeySecret')} option`)));
    if (!this.#_options.region && !this.#_options.endpoint) return fail(italic(red(`AliUploader required ${inverse('region')} or ${inverse('endpoint')} option`)));

    const multiple = Array.isArray(value);
    const objects: UploaderPutHandle<Client.PutObjectOptions>[] = (multiple ? value : [value]).map(it => (typeof it === 'string' ? { file: it } : it));
    objects.forEach(o => silent(`${inverse(yellow('OSS'))} Found file: ${gray(o.file)}`));
    if (objects.length) {
      const { cwd: _, root, retry: __, concurrency, ...options } = this.#_options;
      const client = new Client(options);
      const queue = new PQueue({ concurrency, autoStart: false });
      objects.forEach(it => (queue.add(() => this.#upload(client, { root: it.root || root, ...it })), void 0));
      const result = await this.progressing('OSS', queue);
      return multiple ? result : result?.[0];
    } else {
      warn(yellow(`AliUploader is not running and no files have been uploaded`));
    }
  }

  public override setOptions(options: Partial<UploaderOptions<AliUploaderOptions>> = {}) {
    this.#_options = { cwd: process.cwd(), root: '', region: 'oss-cn-hangzhou', retry: 0, retryMax: 0, concurrency: 1, timeout: 60000, ...this.#_options, ...options };

    const region = this.#_options.region || 'oss-cn-hangzhou';
    const retry = Math.floor(this.#_options.retry || this.#_options.retryMax || 0);
    const concurrency = Math.floor(this.#_options.concurrency || 1);

    this.#_options.region = region;
    this.#_options.endpoint ||= this.#_endpoint.get(region, Boolean(this.#_options.internal));
    this.#_options.retry = this.#_options.retryMax = retry < 0 ? 0 : retry;
    this.#_options.concurrency = concurrency < 1 ? 1 : cpus < concurrency ? cpus : concurrency;
  }
}
