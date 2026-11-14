import { describe, expect, it } from 'vitest';
import { evaluateLoginAttempt } from './login-rate-limit';

describe('login rate limit window', () => {
  it('allows ten attempts and rejects further attempts until the window expires', () => {
    const startedAt = 1_000_000;
    let state: { attempts: number; windowStartedAt: number } | null = null;

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const result = evaluateLoginAttempt(state, startedAt + attempt);
      expect(result.allowed).toBe(true);
      if (result.allowed) state = result.state;
    }

    const blocked = evaluateLoginAttempt(state, startedAt + 10);
    expect(blocked).toMatchObject({ allowed: false, retryAfterSeconds: 900 });

    const afterWindow = evaluateLoginAttempt(state, startedAt + 15 * 60 * 1000);
    expect(afterWindow).toMatchObject({
      allowed: true,
      state: { attempts: 1, windowStartedAt: startedAt + 15 * 60 * 1000 },
    });
  });
});
