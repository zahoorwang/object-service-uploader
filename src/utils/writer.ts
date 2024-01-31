import { writeFileSync as write } from 'node:fs';

export function writer(file: string, content: string) {
  write(file, content, 'utf8');
}
