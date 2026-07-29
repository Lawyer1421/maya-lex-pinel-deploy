import { createClient } from '@supabase/supabase-js';
import { createSupabaseBrowserClient as createBrowserClientCompat } from '@/src/lib/supabase/browser';
export { createSupabaseAdminClient, verifyServerApiKey, parseApiKey } from '@/src/lib/supabase/admin';

export function createServerSupabaseClient() {
  // Las URLs y los JWT jamás contienen espacios en blanco: cualquier espacio,
  // tabulación o salto de línea proviene de un copy/paste al guardar la
  // variable (imposible de releer si es de tipo "sensitive" en Vercel) y hace
  // que Headers.set lance TypeError en cada request. Se elimina siempre.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\s+/g, '');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/\s+/g, '');

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase no configurado. Revisa NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function createBrowserSupabaseClient() {
  return createBrowserClientCompat();
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
          email:              string | null;
          tier:               'free' | 'pro' | 'academico' | 'admin';
          status:             'pending' | 'active' | 'cancelled' | 'past_due' | 'trialing';
          current_period_end: string | null;
          created_at:         string;
          updated_at:         string;
        };
        Insert: {
          user_identifier:    string;
          paypal_sub_id?:     string | null;
          paypal_payer_id?:   string | null;
          email?:             string | null;
          tier?:              'free' | 'pro' | 'academico' | 'admin';
          status?:            'pending' | 'active' | 'cancelled' | 'past_due' | 'trialing';
          current_period_end?: string | null;
        };
        Update: {
          paypal_sub_id?:     string | null;
          paypal_payer_id?:   string | null;
          email?:             string | null;
          tier?:              'free' | 'pro' | 'academico' | 'admin';
          status?:            'pending' | 'active' | 'cancelled' | 'past_due' | 'trialing';
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
      organizations: {
        Row: {
          id: string;
          billing_tier: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          billing_tier?: string | null;
          updated_at?: string | null;
        };
        Update: {
          billing_tier?: string | null;
          updated_at?: string | null;
        };
      };
      pending_orders: {
        Row: {
          id: string;
          order_id: string;
          organization_id: string;
          tier: string;
          amount: number;
          currency: string;
          status: string;
          created_at: string;
        };
        Insert: {
          order_id: string;
          organization_id: string;
          tier: string;
          amount: number;
          currency?: string;
          status?: string;
        };
        Update: {
          status?: string;
          amount?: number;
          currency?: string;
          tier?: string;
        };
      };
    };
  };
};
