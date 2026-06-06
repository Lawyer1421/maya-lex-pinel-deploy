import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-ssr';

export async function POST() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'));
}
