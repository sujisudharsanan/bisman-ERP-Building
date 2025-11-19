import { describe, it, expect, vi, beforeAll } from 'vitest';
import { buildContext } from '@/lib/contextBuilder';

describe('contextBuilder', () => {
  beforeAll(() => {
    // In a real test, seed DB and insert roles/allowed modules and sources
  });

  it('returns allowedModules array and snippets array', async () => {
    const ctx = await buildContext('dev-user-1');
    expect(Array.isArray(ctx.allowedModules)).toBe(true);
    expect(Array.isArray(ctx.snippets)).toBe(true);
  });
});
