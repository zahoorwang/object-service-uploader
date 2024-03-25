import { Command } from 'commander';

declare global {
  type Constructor<T, Arguments extends unknown[] = any[]> = new (...arguments: Arguments) => T;

  type CommandModule = {
    file: string;
    name: string;
    intro: string;
    example: string;
    commandify: () => Command;
    Endpoint: Constructor<Endpoint>;
    Uploader: Constructor<Uploader>;
  };

  interface Endpoint<S extends Endpoint.Struct = Endpoint.Struct> {
    readonly data: S;
    readonly url: string;

    has(endpoint: string): boolean;
    get(region: string, ...args: any[]): string;
    remote(sync?: boolean): Promise<void>;
    printf(format?: 'table' | 'json'): string;
  }

  namespace Endpoint {
    type Struct = { name: string };
    type Mapped<S extends Struct> = { [region: string]: S };
  }

  interface Uploader<S extends Uploader.Struct = Uploader.Struct, P extends Uploader.Struct = Uploader.Struct> {
    readonly options: S;

    set<K extends Uploader.Keys<S>>(prop: K, value: Uploader.Value<S, K>): this;
    get<K extends Uploader.Keys<S>>(prop: K, defaultValue?: Uploader.RValue<S, K>): Uploader.Value<S, K>;
    putting(files: string[]): Promise<Uploader.RPut[]>;
    putting(options: Uploader.Put<P>): Promise<Uploader.RPut[]>;
  }

  namespace Uploader {
    type Struct = Record<string, any>;

    type Keys<S extends Struct> = Extract<keyof S, string>;

    type Value<S extends Struct, K extends Keys<S>> = S[K];

    /**
     * Required Value
     */
    type RValue<S extends Struct, K extends Keys<S>> = Exclude<Value<S, K>, undefined>;

    type Put<O extends Struct = Struct> = {
      files: string[] | O[];
      access?: string;
      retry?: number;
      concurrency?: number;
      before?: () => void | Promise<void>;
      puttingProgress?: (index: number, total: number, result: RPut) => void;
      accessPathProcessor?: (options: { file: string; name?: string; access?: string }) => string;
    };

    type RPut = { name: string; link: string; file: string; error?: any };
  }
}

export {};
