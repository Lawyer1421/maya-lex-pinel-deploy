export interface PixelPayChargeRequest {
  amount: number;
  currency: 'HNL' | 'USD';
  plan: 'pro' | 'academico';
  organizationId: string;
}

export interface PixelPayChargeResponse {
  success: boolean;
  checkoutUrl?: string;
  orderId?: string;
  error?: string;
}

export async function createPixelPayCharge(request: PixelPayChargeRequest): Promise<PixelPayChargeResponse> {
  const endpoint = process.env.PIXELPAY_ENDPOINT ?? 'https://checkout.pixelpay.example/hosted';
  const keyId = process.env.PIXELPAY_KEY_ID;
  const secretKey = process.env.PIXELPAY_SECRET_KEY;

  if (!keyId || !secretKey) {
    return {
      success: false,
      error: 'PixelPay credentials are not configured.',
    };
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keyId,
        secretKey,
        amount: request.amount,
        currency: request.currency,
        plan: request.plan,
        organizationId: request.organizationId,
      }),
    });

    const data = await response.json() as { checkoutUrl?: string; orderId?: string; error?: string };
    return {
      success: response.ok,
      checkoutUrl: data.checkoutUrl,
      orderId: data.orderId,
      error: data.error,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown PixelPay error',
    };
  }
}
