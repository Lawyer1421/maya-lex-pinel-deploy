/**
 * lib/flags/flags.ts
 *
 * Vercel Flags SDK declarations for Maya Lex hybrid router canary.
 * Flag definitions using @vercel/flags/next.
 *
 * Usage in API routes (app/api/chat/route.ts):
 *   import { mayadLexHybridRouter } from '@/lib/flags/flags';
 *   const evaluated = await mayadLexHybridRouter();
 *
 * Usage in React Server Components:
 *   import { mayadLexHybridRouter } from '@/lib/flags/flags';
 *   const flagValue = await mayadLexHybridRouter();
 */

import { flag } from '@vercel/flags/next';

/**
 * Feature flag: maya-lex-hybrid-router-v2
 *
 * Controls orchestration path selection:
 * - false (OFF): Legacy parallel orchestration (Promise.all)
 * - true (ON): Hardened sequential orchestration (server-decided web search)
 *
 * Default: false (safe default, legacy path)
 */
export const mayaLexHybridRouter = flag<boolean>({
  key: 'maya-lex-hybrid-router-v2',
  description: 'Canary: Hardened sequential RAG-Web orchestration (OFF=Legacy, ON=Hardened)',

  /**
   * Decide function: determines flag value at request time.
   * Called by Vercel Flags adapter with request context (when configured).
   *
   * In Vercel production:
   *   - Adapter reads dashboard configuration
   *   - Applies targeting rules (segment, percentage, user targeting)
   *   - Returns true or false based on rules
   *
   * In local development (no adapter):
   *   - Returns default value (false)
   *   - Can be overridden via FLAGS override mechanism
   */
  decide() {
    // Default to false (legacy path) for safety
    // When Vercel Flags dashboard is configured, this will be overridden by adapter
    return false;
  },

  // Optional: Metadata for Vercel Toolbar
  options: [
    { value: false, label: 'Legacy (Promise.all)' },
    { value: true, label: 'Hardened (Sequential)' },
  ],
});
