import { normalize, relative } from 'node:path';

export function unixify(from: string, to: string) {
  return relative(normalize(from), normalize(to))
    .replace(/\\/g, '/')
    .replace(/\.\.\//g, '');
}
