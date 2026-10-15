import test from 'node:test';
import assert from 'node:assert/strict';
import { makeFailureLimiter } from '../src/lib/auth/rateLimit.ts';

test('blocks after the allowed failures, per key, and recovers after the window', () => {
  let t = 1_000_000;
  const limiter = makeFailureLimiter(3, 60_000, () => t);
  assert.equal(limiter.blocked('a'), false);
  limiter.fail('a'); limiter.fail('a');
  assert.equal(limiter.blocked('a'), false);
  limiter.fail('a');
  assert.equal(limiter.blocked('a'), true);
  assert.equal(limiter.blocked('b'), false); // another address is not affected
  t += 59_000;
  assert.equal(limiter.blocked('a'), true);
  t += 2_000; // the failures are now older than the window
  assert.equal(limiter.blocked('a'), false);
});

test('reset clears a key, and old failures do not pile up', () => {
  let t = 0;
  const limiter = makeFailureLimiter(2, 1000, () => t);
  limiter.fail('x'); limiter.fail('x');
  assert.equal(limiter.blocked('x'), true);
  limiter.reset('x');
  assert.equal(limiter.blocked('x'), false);
  for (let i = 0; i < 10; i++) { limiter.fail('y'); t += 2000; } // each failure expires before the next
  assert.equal(limiter.blocked('y'), false);
});
