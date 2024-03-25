import { Help } from 'commander';
import chalk from 'chalk-template';
import { SingleBar } from 'cli-progress';

export const is = (value: any): value is CommandModule => !['name', 'intro', 'commandify', 'Endpoint', 'Uploader'].map(prop => prop in value).includes(false);

export const configure: Partial<Help> = {
  optionTerm(option) {
    return option.short ? option.flags : `    ${option.flags}`;
  }
};

export const headline = (message?: string) => chalk`{white.bold Object Service Uploader} ({#003472 osu})${message ? `, ${message}` : ''}`;

export const sorryline = (message?: string) => chalk`{#c91f37 Sorry${message ? `, ${message}` : ''}}`;

const intro = ['#75664d', '#b35c44', '#7bcfa6', '#ef7a82', '#edd1d8'];

export const colorintro = (list: string[]) => (list.length ? [`Vendor support:`, ...list.map((line, i) => chalk`  - {${intro[i % intro.length]} ${line}}`)].join('\n') : '');

export const printf = Object.assign((...args: string[]) => args.map(it => console.log(it)), { EMPTY: '' });

export const single = (name: string) => {
  return new SingleBar({
    format: chalk`{#c91f37 ${name.toUpperCase()}}` + chalk` {#4c8dae ${'{bar}'}}` + ` | {percentage}% | {value}/{total} files uploaded`,
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true
  });
};

export const omit = <T extends Record<PropertyKey, unknown>, F extends (keyof T)[]>(value: T, props: F): Omit<T, F[number]> => {
  const result = { ...value };
  props.forEach(prop => delete result[prop]);
  return result;
};
