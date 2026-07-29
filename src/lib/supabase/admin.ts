import { createHash, timingSafeEqual } from 'crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface ParsedApiKey {
  publicId: string;
  secret: string;
}

export function parseApiKey(apiKey: string): ParsedApiKey | null {
  const match = apiKey.trim().match(/^ak_live_([a-zA-Z0-9]+)\.([a-zA-Z0-9._:-]+)$/);
  if (!match) {
    return null;
  }

  return { publicId: match[1], secret: match[2] };
}

export function verifyServerApiKey(candidateKey: string, expectedKey: string): boolean {
  const candidateParsed = parseApiKey(candidateKey);
  const expectedParsed = parseApiKey(expectedKey);

  if (!candidateParsed || !expectedParsed) {
    return false;
  }

  const candidateHash = createHash('sha256').update(candidateParsed.secret).digest();
  const expectedHash = createHash('sha256').update(expectedParsed.secret).digest();

  if (candidateHash.length !== expectedHash.length) {
    return false;
  }

  return timingSafeEqual(candidateHash, expectedHash);
}

export function createSupabaseAdminClient(): SupabaseClient {
  if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
    void import('server-only');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase admin no configurado. Revisa NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
