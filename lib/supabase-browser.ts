/**
 * Supabase Browser Client — solo para Client Components ('use client')
 * No importa next/headers — compatible con el bundle del navegador.
 */
import { createBrowserClient } from '@supabase/ssr';

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
