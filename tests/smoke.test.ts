import { describe, it, expect } from 'vitest';

// Task 1 smoke test: confirms the Vitest toolchain runs. Real tests arrive with
// the data layer (Task 2) and features.
describe('toolchain', () => {
  it('runs the test runner', () => {
    expect(1 + 1).toBe(2);
  });
});
