import { describe, it, expect } from 'vitest';

describe('chat guardrail', () => {
  it('should refuse unauthorized module requests (scaffold)', async () => {
    // This is a scaffold: in real test, spin up the Next server or call the handler directly.
    // Here we assert the expected refusal string constant.
    const refusal = 'Sorry, that module is not available for your role.';
    expect(refusal.includes('not available')).toBe(true);
  });
});
