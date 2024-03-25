import { getProperty, setProperty } from 'dot-prop';

export abstract class Uploader<S extends Uploader.Struct, P extends Uploader.Struct> {
  #_options: S = {} as any;
  #_ensures: { [name in Uploader.Keys<S>]?: (value: Uploader.Value<S, Uploader.Keys<S>>) => void } = {};

  protected constructor(options: Partial<S>) {
    this.#_options = { ...options } as any;
  }

  public get options() {
    return { ...this.#_options };
  }

  public set<K extends Uploader.Keys<S>>(prop: K, value: Uploader.Value<S, K>): this {
    return typeof this.#_ensures?.[prop] === 'function' ? this.#_ensures[prop]!(value) : this.property(prop, value), this;
  }

  public get<K extends Uploader.Keys<S>>(prop: K, defaultValue?: Uploader.RValue<S, K>): Uploader.Value<S, K> {
    return getProperty(this.#_options, prop, defaultValue);
  }

  public abstract putting(files: string[]): Promise<Uploader.RPut[]>;
  public abstract putting(options: Uploader.Put<P>): Promise<Uploader.RPut[]>;

  protected ensure<K extends Uploader.Keys<S>>(prop: K, fn: (value: Uploader.Value<S, K>) => void) {
    (this.#_ensures as any)[prop] = fn.bind(this);
  }

  protected property<K extends Uploader.Keys<S>>(prop: K, value: Uploader.Value<S, K>) {
    setProperty(this.#_options, prop, value);
  }
}
