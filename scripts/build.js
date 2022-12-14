#! /usr/bin/env node

import esbuild from 'esbuild';
import { fileURLToPath } from 'url';

await esbuild.build({
  loader: {
    '.ts': 'ts',
  },
  sourcemap: 'linked',
  format: 'esm',
  bundle: true,
  tsconfig: fileURLToPath(new URL('../tsconfig.build.json', import.meta.url)),
  outdir: 'dist/',
  entryPoints: [fileURLToPath(new URL('../src/drawflow.ts', import.meta.url))],
});

