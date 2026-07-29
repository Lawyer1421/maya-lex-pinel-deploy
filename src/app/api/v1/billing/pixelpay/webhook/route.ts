import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { status?: string; order_id?: string; organization_id?: string; tier?: string };
    if (body.status !== 'approved') {
      return NextResponse.json({ received: true });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    if (body.organization_id && body.tier) {
      await supabaseAdmin.from('organizations').upsert({
        id: body.organization_id,
        billing_tier: body.tier,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    }

    if (body.order_id && body.organization_id) {
      await supabaseAdmin.from('pending_orders').insert({
        order_id: body.order_id,
        organization_id: body.organization_id,
        tier: body.tier ?? 'pro',
        amount: 0,
        currency: 'HNL',
        status: 'approved',
      });
    }

    return NextResponse.json({ received: true, updated: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
