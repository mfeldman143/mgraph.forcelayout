import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

export default [
  // ES Module build - keeps externals
  {
    input: 'index.js',
    output: {
      file: 'dist/mgraph.forcelayout.esm.js',
      format: 'es'
    },
    plugins: [nodeResolve()],
    external: ['mgraph.events', 'mgraph.merge', 'mgraph.random']
  },
  // UMD build - bundles everything
  {
    input: 'index.js',
    output: [
      {
        file: 'dist/mgraph.forcelayout.umd.js',
        format: 'umd',
        name: 'mgraphCreateLayout',
        exports: 'default'
      },
      {
        file: 'dist/mgraph.forcelayout.umd.min.js',
        format: 'umd',
        name: 'mgraphCreateLayout',
        exports: 'default',
        plugins: [terser()]
      }
    ],
    plugins: [nodeResolve()]
    // No external array = bundle everything
  }
];