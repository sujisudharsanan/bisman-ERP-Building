/**
 * Global runtime guard for React components.
 * Ensures we never render an undefined/invalid element during SSR/prerender.
 */

export function safeComponent(Comp: any, name: string, source?: string) {
  const isValid =
    !!Comp && (
      typeof Comp === 'function' ||
      typeof Comp === 'object' ||
      typeof Comp === 'string'
    );

  if (!isValid) {
    // Do not throw to keep prerendering alive; log with rich context instead.
    try {
      // eslint-disable-next-line no-console
      console.error('[FATAL] Invalid React element', { name, source, CompType: typeof Comp });
    } catch {}
    // Return a no-op component
    return () => null;
  }

  return Comp;
}

export default safeComponent;
