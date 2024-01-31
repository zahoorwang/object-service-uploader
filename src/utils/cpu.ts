import os from 'node:os';

export const cpus: number = os.cpus().length;
