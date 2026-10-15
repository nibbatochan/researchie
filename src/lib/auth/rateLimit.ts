// A small in-memory limiter for repeated failures (wrong invite codes). On a serverless host each instance
// keeps its own count, so this slows down a guesser rather than stopping a determined one; the invite code
// should be long and random for that reason.

export interface FailureLimiter {
  /** True when this key has used up its allowed failures in the current window. */
  blocked(key: string): boolean;
  /** Record one failure for this key. */
  fail(key: string): void;
  reset(key: string): void;
}

export function makeFailureLimiter(maxFailures: number, windowMs: number, now: () => number = Date.now): FailureLimiter {
  const failures = new Map<string, number[]>();

  const recent = (key: string): number[] => {
    const cutoff = now() - windowMs;
    const kept = (failures.get(key) ?? []).filter((t) => t > cutoff);
    if (kept.length) failures.set(key, kept);
    else failures.delete(key);
    return kept;
  };

  return {
    blocked: (key) => recent(key).length >= maxFailures,
    fail: (key) => {
      const kept = recent(key);
      kept.push(now());
      failures.set(key, kept);
      // Keep the map from growing without end under a flood of different addresses.
      if (failures.size > 5000) failures.delete(failures.keys().next().value as string);
    },
    reset: (key) => void failures.delete(key),
  };
}
