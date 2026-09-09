/**
 * lib/flags/flags.ts
 *
 * Vercel Flags SDK (v4+) with entity-based targeting for Maya Lex hybrid router.
 * Uses flag.run({ identify: ... }) to pass explicit user context for dashboard targeting.
 *
 * Entity: Supabase authenticated user.id (stable UUID)
 * Optional: email attribute for dashboard labels (not for targeting logic)
 *
 * Usage in API routes (app/api/chat/route.ts):
 *   import { mayaLexHybridRouter } from '@/lib/flags/flags';
 *   const flagValue = await mayaLexHybridRouter.run({
 *     identify: {
 *       user: { id: supabaseUserId }
 *     }
 *   });
 */

import { flag } from 'flags/next';
import { vercelAdapter } from '@flags-sdk/vercel';

/**
 * Entity type for Vercel Flags targeting (v4+).
 * Matches dashboard entity definition.
 */
export type MayaLexFlagEntities = {
  user?: {
    id: string;
    email?: string;
  };
};

/**
 * Feature flag: maya-lex-hybrid-router-v2
 *
 * Controls orchestration path selection:
 * - false (OFF): Legacy parallel orchestration (Promise.all)
 * - true (ON): Hardened sequential orchestration (server-decided web search)
 *
 * Targeting:
 * - Dashboard rules target by user.id
 * - Default: false (safe default, legacy path)
 *
 * Evaluation:
 * - flag.run({ identify: { user: { id: "..." } } }) passes explicit context
 * - Vercel adapter reads dashboard configuration for environment + targeting
 */
export const mayaLexHybridRouter = flag<boolean, MayaLexFlagEntities>({
  key: 'maya-lex-hybrid-router-v2',
  description: 'Canary: Hardened sequential RAG-Web orchestration (OFF=Legacy, ON=Hardened)',
  adapter: vercelAdapter(),

  // Metadata for Vercel Toolbar
  options: [
    { value: false, label: 'Legacy (Promise.all)' },
    { value: true, label: 'Hardened (Sequential)' },
  ],
});
