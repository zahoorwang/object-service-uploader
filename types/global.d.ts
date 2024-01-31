declare global {
  var SILENT: boolean;

  // type Class<T, Arguments extends unknown[] = any[]> = {
  //   prototype: Pick<T, keyof T>;
  //   new (...arguments: Arguments): T;
  // };

  // type Constructor<T, Arguments extends unknown[] = any[]> = new (...arguments: Arguments) => T;

  type UploaderPutHandle<Expands = object> = {
    file: string;

    /**
     * Bucket root path, overwrite global `options.root`
     */
    root?: string;

    /**
     * Upload file name with pathname from `file`, excludes `options.cwd`, and join `root` prefix
     */
    name?: string | ((options: { file: string; cwd: string; root: string }) => string);
  } & Expands;

  interface UploaderUploaded {
    name: string;
    link: string;
    file: string;
    error: boolean;
  }

  type UploaderOptions<Expands> = {
    /**
     * The current working directory of CLI
     *
     * @default process.cwd()
     */
    cwd?: string;

    /**
     * Bucket root path
     *
     * @default ''
     */
    root?: string;

    /**
     * Used by auto retry send request count when request error is net error or timeout, minimum: 0
     *
     * @default 0
     */
    retry?: number;

    /**
     * Concurrency limit, minimum: 1, maximum: CPU's count
     *
     * @default 1
     */
    concurrency?: number;
  } & Expands;

  interface UploaderProcessor<Arg, Put, Endpoint extends EndpointProcessor> {
    get endpoint(): Endpoint;

    putting(file: string): Promise<void | UploaderUploaded>;
    putting(files: string[]): Promise<void | UploaderUploaded[]>;
    putting(object: UploaderPutHandle<Put>): Promise<void | UploaderUploaded>;
    putting(objects: UploaderPutHandle<Put>[]): Promise<void | UploaderUploaded[]>;

    setOptions(options?: Partial<UploaderOptions<Arg>>): void;
  }

  interface EndpointProcessor {
    readonly REMOTE: string;

    remote(): Promise<void>;
    synchronize(): Promise<void>;
    output(format?: 'table' | 'json'): void;
  }
}

export {};
