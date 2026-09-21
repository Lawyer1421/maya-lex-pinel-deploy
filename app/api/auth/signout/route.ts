import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-ssr';

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  const origin = new URL(request.url).origin;
  return NextResponse.redirect(new URL('/', origin));
}
