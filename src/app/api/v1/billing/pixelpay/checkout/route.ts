import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

interface PixelPayCheckoutBody {
  plan: string;
  amount: number;
  currency: string;
  organizationId: string;
}

function buildPixelPaySignature(params: Record<string, string>): string {
  const sortedEntries = Object.entries(params).sort(([a], [b]) => a.localeCompare(b));
  const payload = sortedEntries.map(([key, value]) => `${key}=${value}`).join('&');
  return createHash('md5').update(`${payload}${process.env.PIXELPAY_SECRET_KEY ?? 'demo-secret'}`).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PixelPayCheckoutBody;
    const orderId = `order-${Date.now()}`;
    const params = {
      _key_id: process.env.PIXELPAY_KEY_ID ?? 'demo-key',
      _order_id: orderId,
      _order_amount: String(body.amount),
      _order_currency: body.currency,
      _order_description: `Maya Lex IA ${body.plan}`,
      _customer_name: body.organizationId,
    };

    const signature = buildPixelPaySignature(params);
    const url = new URL(process.env.PIXELPAY_ENDPOINT ?? 'https://checkout.pixelpay.example/hosted');
    Object.entries({ ...params, _signature: signature }).forEach(([key, value]) => url.searchParams.set(key, value));

    return NextResponse.json({ url: url.toString(), orderId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
