import chalk from 'chalk-template';

export const succ = (message?: string) => chalk`{green ✔ ${message || ''}}`;

export const warn = (message?: string) => chalk`{yellow ℹ ${message || ''}}`;

export const fail = (message?: string) => chalk`{#c91f37 ✖ ${message || ''}}`;
