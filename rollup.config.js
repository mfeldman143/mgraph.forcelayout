// rollup.config.js
import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

export default [
  // ES Module build
  {
    input: 'index.js',
    output: {
      file: 'dist/mgraph.forcelayout.esm.js',
      format: 'es',
      sourcemap: true
    },
    plugins: [nodeResolve()],
    external: ['mgraph.events', 'mgraph.merge', 'mgraph.random']
  },
  // UMD build
  {
    input: 'index.js',
    output: [
      {
        file: 'dist/mgraph.forcelayout.umd.js',
        format: 'umd',
        name: 'mgraphCreateLayout',
        exports: 'default',
        sourcemap: true
      },
      {
        file: 'dist/mgraph.forcelayout.umd.min.js',
        format: 'umd',
        name: 'mgraphCreateLayout',
        exports: 'default',
        sourcemap: true,
        plugins: [terser()]
      }
    ],
    plugins: [nodeResolve()]
    // No external dependencies = bundle everything
  }
];