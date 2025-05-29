// test/es-module.test.js
import { test, expect } from 'vitest';
import createLayout from '../index.js'; // Assuming index.js is the ES module entry point

test('mgraph.forcelayout can be imported as an ES module', () => {
  expect(typeof createLayout).toBe('function');
});
