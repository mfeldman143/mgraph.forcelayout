// jest.config.cjs
module.exports = {
    preset: 'ts-jest/presets/default-esm',
    testEnvironment: 'node',
    // Tell Jest to treat .ts files as ESM:
    extensionsToTreatAsEsm: ['.ts'],
    globals: {
      'ts-jest': {
        useESM: true,
      },
    },
  };
  