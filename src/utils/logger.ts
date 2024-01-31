import { yellow, red, inverse, gray, white, green } from 'picocolors';

export function silent(...optionals: any[]) {
  global.SILENT || console.log(inverse(gray(`[OSU]`)), ...optionals);
}

export function info(...optionals: any[]) {
  console.log(inverse(white(`[OSU]`)), ...optionals);
}

export function warn(...optionals: any[]) {
  console.log(inverse(yellow(`[OSU]`)), ...optionals);
}

export function error(...optionals: any[]) {
  console.log(inverse(red(`[OSU]`)), ...optionals);
}

// export function succ(...optionals: any[]) {
//   console.log(green('✔'), ...optionals);
// }

export function fail(...optionals: any[]) {
  console.log(red('✕'), ...optionals);
}
