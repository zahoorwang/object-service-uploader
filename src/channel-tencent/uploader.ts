import PQueue from 'p-queue';
import Client from 'cos-nodejs-sdk-v5';
import { red, yellow, italic, gray, inverse } from 'picocolors';

import { cpus } from '@utils/cpu';
import { Uploader } from '@core/uploader';
import { silent, fail, warn } from '@utils/logger';

import { Endpoint } from './endpoint';

export type TencentUploaderOptions = Client.COSOptions & Partial<Pick<Client.UploadFileParams, 'Bucket' | 'Region'>>;

export default class TencentUploader
  extends Uploader<TencentUploaderOptions, Endpoint>
  implements UploaderProcessor<TencentUploaderOptions, Partial<Client.UploadFileParams>, Endpoint>
{
  #_endpoint: Endpoint = new Endpoint();

  #_options: UploaderOptions<TencentUploaderOptions> = { SecretId: '', SecretKey: '' };

  constructor(args: Partial<UploaderOptions<TencentUploaderOptions>> = {}) {
    super();
    this.setOptions(args);
  }

  public override get endpoint() {
    return this.#_endpoint;
  }

  async #upload(client: Client, options: UploaderPutHandle<Partial<Client.UploadFileParams>>): Promise<UploaderUploaded> {
    const { file, root, name: filename, Key, ...opts } = { root: '', ...options };
    const name = this.bucketify({ cwd: this.#_options.cwd!, file, root, name: Key || filename });
    const protocol = (this.#_options.Protocol || 'http').replace(/:$/, '');

    const result = await client
      .uploadFile({ ...opts, Key: name } as any)
      .then(response => ({ file, name, link: `${protocol}://${response.Location}`, error: false }))
      .catch(error => {
        silent(red(error));
        warn(yellow(`TencentUploader failed to upload file "${file}"`));
        return { file, name: name.replace(/^\//, ''), link: '', error: true };
      });

    return result;
  }

  public async putting(file: string): Promise<void | UploaderUploaded>;
  public async putting(files: string[]): Promise<void | UploaderUploaded[]>;
  public async putting(object: UploaderPutHandle<Partial<Client.UploadFileParams>>): Promise<void | UploaderUploaded>;
  public async putting(objects: UploaderPutHandle<Partial<Client.UploadFileParams>>[]): Promise<void | UploaderUploaded[]>;
  public async putting(value: unknown): Promise<any> {
    if (!this.#_options.SecretId) return fail(italic(red(`TencentUploader required ${inverse('SecretId')} option`)));
    if (!this.#_options.SecretKey) return fail(italic(red(`TencentUploader required ${inverse('SecretKey')} option`)));

    const multiple = Array.isArray(value);
    const objects: UploaderPutHandle<Client.UploadFileParams>[] = (multiple ? value : [value]).map(it =>
      typeof it === 'string'
        ? { file: it, FilePath: it, Bucket: this.#_options.Bucket, Region: this.#_options.Region }
        : { Bucket: it.Bucket || this.#_options.Bucket, Region: it.Region || this.#_options.Region, ...it, file: it.FilePath || it.file, FilePath: it.FilePath || it.file }
    );
    objects.forEach(o => silent(`${inverse(yellow('CBS'))} Found file: ${gray(o.file)}`));
    if (objects.length) {
      const { cwd: _, root, retry: __, concurrency, Bucket: ___, Region: ____, ...options } = this.#_options;
      const client = new Client(options);
      const queue = new PQueue({ concurrency, autoStart: false });
      objects.forEach(it => (queue.add(() => this.#upload(client, { root: it.root ?? root, ...it })), void 0));
      const result = await this.progressing('COS', queue);
      return multiple ? result : result?.[0];
    } else {
      warn(yellow(`TencentUploader is not running and no files have been uploaded`));
    }
  }

  public override setOptions(options: Partial<UploaderOptions<TencentUploaderOptions>> = {}): void {
    this.#_options = {
      cwd: process.cwd(),
      root: '',
      retry: 0,
      concurrency: 1,
      Protocol: 'https',
      Timeout: 60000,
      ChunkParallelLimit: 8,
      ChunkSize: 1024 * 1024 * 8,
      Proxy: '',
      ...this.#_options,
      ...options
    };

    const region = this.#_options.Region || 'ap-beijing';
    const bucket = this.#_options.Bucket || '';
    const retry = Math.floor(this.#_options.retry || 0);
    const concurrency = Math.floor(this.#_options.concurrency || 1);

    this.#_options.Region = region;
    this.#_options.Bucket = bucket;
    this.#_options.retry = this.#_options.ChunkRetryTimes = retry < 0 ? 0 : retry;
    this.#_options.concurrency = this.#_options.FileParallelLimit = concurrency < 1 ? 1 : cpus < concurrency ? cpus : concurrency;
  }
}
