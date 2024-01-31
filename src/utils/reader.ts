import { readFileSync as read } from 'node:fs';

export function reader(file: string, format: 'json' | 'text' = 'text') {
  const text = read(file, 'utf8');

  if (format === 'json') {
    try {
      return JSON.parse(text);
    } catch {
      return {};
    }
  }

  return text;
}
