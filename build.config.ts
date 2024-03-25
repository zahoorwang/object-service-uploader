// import { writeFileSync } from 'node:fs';
// import { relative, posix, join, extname } from 'node:path';

// import keys from 'sort-object-keys';
import { defineBuildConfig as define } from 'unbuild';

import pkg from './package.json';

// const omit = <T extends Record<PropertyKey, unknown>, F extends (keyof T)[]>(value: T, props: F): Omit<T, F[number]> => {
//   const result = { ...value };
//   props.forEach(prop => delete result[prop]);
//   return result;
// };

const outDir = './dist';

export default define([
  {
    name: pkg.name,
    entries: [{ builder: 'mkdist', format: 'esm', input: './src', outDir }],
    clean: true,
    rollup: { inlineDependencies: true, resolve: { extensions: ['.ts', '.tsx'] }, esbuild: { minify: true, jsx: 'automatic' } },
    declaration: false,
    externals: Object.keys(pkg.devDependencies),
    failOnWarn: false
    // hooks: {
    //   async 'mkdist:entry:build'(_ctx, entry, { writtenFiles }) {
    //     const out = entry.outDir!;
    //     const exts = ['.ts', '.js', '.mjs'];

    //     const exports = Object.fromEntries(
    //       Object.entries(
    //         writtenFiles
    //           .map(file => {
    //             const ext = extname(file).toLowerCase();
    //             if (!exts.includes(ext)) return null as unknown as { export: string; [name: string]: string };
    //             const prop = ['types', 'require', 'import'][exts.indexOf(ext)];
    //             const output = posix.normalize(join(outDir, relative(out, file)));
    //             if (excludes.map(e => output.includes(e)).includes(true)) return null as unknown as { export: string; [name: string]: string };
    //             return { [prop]: `./${output}`, export: output.replace(/^dist/i, '.').replace(/(\.d\.ts|\.js|\.mjs)|(\/?index)/gi, '') };
    //           })
    //           .filter(Boolean)
    //           .reduce((previous, current) => {
    //             previous[current.export] = previous[current.export] ?? [];
    //             previous[current.export].push(current);
    //             return previous;
    //           }, {})
    //       )
    //         .map(([p, r]) => [p, (r as any[]).reduce((a, b) => keys(omit({ ...a, ...b }, ['export']), ['require', 'import', 'types']), {})])
    //         .sort((a, b) => a[0].localeCompare(b[0]))
    //     );

    //     pkg.exports = exports;
    //     writeFileSync('./package.json', JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    //   }
    // }
  },
  {
    name: pkg.name + ' (d.ts)',
    entries: [{ input: './src/index', outDir, format: 'cjs' }],
    rollup: { esbuild: { minify: true } },
    declaration: true,
    externals: Object.keys(pkg.devDependencies)
  }
]);
