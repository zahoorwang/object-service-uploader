import { fileURLToPath } from 'node:url';
import { dirname as dir } from 'node:path';

export const dirname = (url: string | URL) => {
  return dir(fileURLToPath(url));
};
