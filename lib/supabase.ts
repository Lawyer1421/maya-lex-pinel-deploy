import { createClient } from '@supabase/supabase-js';

// Cliente para uso en el servidor (API routes) — usa service role key
export function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Supabase no configurado. Revisa NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local'
    );
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Cliente para uso en el navegador (componentes cliente)
export function createBrowserSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase no configurado. Revisa NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local'
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

// Tipos de base de datos
export type Database = {
  public: {
    Tables: {
      queries_log: {
        Row: {
          id: string;
          user_identifier: string;
          query_date: string;
          query_count: number;
          tier: 'free' | 'pro' | 'admin';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_identifier: string;
          query_date?: string;
          query_count?: number;
          tier?: 'free' | 'pro' | 'admin';
        };
        Update: {
          query_count?: number;
          tier?: 'free' | 'pro' | 'admin';
        };
      };
      conversations: {
        Row: {
          id: string;
          user_identifier: string;
          mode: string;
          messages: unknown[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_identifier: string;
          mode: string;
          messages: unknown[];
        };
        Update: {
          messages?: unknown[];
        };
      };
    };
  };
};
