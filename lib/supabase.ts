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
          tier: 'free' | 'pro' | 'academico' | 'admin';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_identifier: string;
          query_date?: string;
          query_count?: number;
          tier?: 'free' | 'pro' | 'academico' | 'admin';
        };
        Update: {
          query_count?: number;
          tier?: 'free' | 'pro' | 'academico' | 'admin';
          updated_at?: string;
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
      subscriptions: {
        Row: {
          id:                 string;
          user_identifier:    string;
          paypal_sub_id:      string | null;
          paypal_payer_id:    string | null;
          tier:               'free' | 'pro' | 'academico' | 'admin';
          status:             'active' | 'cancelled' | 'past_due' | 'trialing';
          current_period_end: string | null;
          created_at:         string;
          updated_at:         string;
        };
        Insert: {
          user_identifier:    string;
          paypal_sub_id?:     string | null;
          paypal_payer_id?:   string | null;
          tier?:              'free' | 'pro' | 'academico' | 'admin';
          status?:            'active' | 'cancelled' | 'past_due' | 'trialing';
          current_period_end?: string | null;
        };
        Update: {
          paypal_sub_id?:     string | null;
          paypal_payer_id?:   string | null;
          tier?:              'free' | 'pro' | 'academico' | 'admin';
          status?:            'active' | 'cancelled' | 'past_due' | 'trialing';
          current_period_end?: string | null;
          updated_at?:        string;
        };
      };
      paypal_events: {
        Row: {
          transmission_id: string;
          event_type:      string;
          processed_at:    string;
        };
        Insert: {
          transmission_id: string;
          event_type:      string;
        };
        Update: Record<string, never>;
      };
    };
  };
};
