import path from 'node:path';

import PQueue from 'p-queue';
import { SingleBar } from 'cli-progress';
import { green, yellow, magenta, inverse } from 'picocolors';

import { unixify } from '@utils/unixify';

export abstract class Uploader<Arg, Endpoint extends EndpointProcessor> {
  public abstract get endpoint(): Endpoint;

  public abstract setOptions(options?: Partial<UploaderOptions<Arg>>): void;

  protected bucketify(options: { cwd: string; file: string; root?: string; name?: string | ((options: { file: string; cwd: string; root: string }) => string) }) {
    const { cwd, file, root = '', name: filename } = options;
    return !filename ? path.posix.join(root.replace(/\\/g, '/'), unixify(cwd, file)) : typeof filename === 'string' ? filename : filename({ file, cwd: cwd, root });
  }

  protected async progressing(method: string, queue: PQueue): Promise<UploaderUploaded[]> {
    return new Promise<UploaderUploaded[]>(resolve => {
      const progress = new SingleBar({
        format: `${inverse(magenta('[OSU]'))} ${yellow(method)} | ${green('{bar}')} | {percentage}% | {value}/{total} files uploaded`,
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true
      });

      let completed = 0;
      const total = queue.size;
      const results: UploaderUploaded[] = [];

      progress.start(total, completed);
      queue.on('completed', (result: UploaderUploaded) => {
        results.push(result);
        progress.update((completed += 1));
        completed === total && (progress.stop(), resolve(results));
      });
      queue.start();
    });
  }
}
