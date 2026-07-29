import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface ManualTransferBody {
  plan: string;
  amount: number;
  currency: string;
  note: string;
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = (await req.json()) as ManualTransferBody;

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const orderId = `transfer-${Date.now()}`;
    await supabaseAdmin.from('pending_orders').insert({
      order_id: orderId,
      organization_id: 'manual-user',
      tier: body.plan,
      amount: body.amount,
      currency: body.currency,
      status: 'PENDING_VERIFICATION',
    });

    await supabaseAdmin.from('audit_events').insert({
      audit_id: orderId,
      stage: 'billing',
      event_type: 'manual_transfer_requested',
      payload: { plan: body.plan, amount: body.amount, currency: body.currency, note: body.note },
    });

    return NextResponse.json({
      success: true,
      message: 'Su transferencia fue registrada y enviada para verificación.',
      orderId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
