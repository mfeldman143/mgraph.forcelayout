// test/es-module.test.js
import { test, expect } from 'vitest';
import createLayout from '../index.js';

test('package exports an ES‑module function', () => {
  expect(typeof createLayout).toBe('function');
});
