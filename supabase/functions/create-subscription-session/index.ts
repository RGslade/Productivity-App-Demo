export type SubscriptionSession = {
  provider: 'google_play' | 'apple_iap';
  user_id: number;
  product_id: string;
  checkout_url: string | null;
  status: 'pending_configuration';
};

export function startGooglePlaySubscription(
  userId: number,
  productId = 'GOOGLE_PLAY_PRODUCT_ID_PLACEHOLDER',
): SubscriptionSession {
  return {
    provider: 'google_play',
    user_id: userId,
    product_id: productId,
    checkout_url: 'GOOGLE_PLAY_CHECKOUT_URL_PLACEHOLDER',
    status: 'pending_configuration',
  };
}

export function startAppleIapSubscription(
  userId: number,
  productId = 'APPLE_IAP_PRODUCT_ID_PLACEHOLDER',
): SubscriptionSession {
  void userId;
  void productId;
  throw new Error('APPLE_IAP_NOT_CONFIGURED');
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'METHOD_NOT_ALLOWED' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const provider = body?.provider;
    const userId = Number(body?.user_id ?? body?.userId);
    const productId = typeof body?.product_id === 'string'
      ? body.product_id
      : typeof body?.productId === 'string'
        ? body.productId
        : undefined;

    if (!Number.isFinite(userId)) {
      return new Response(JSON.stringify({ error: 'USER_ID_REQUIRED' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (provider === 'google_play') {
      return new Response(JSON.stringify(startGooglePlaySubscription(userId, productId)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (provider === 'apple_iap') {
      startAppleIapSubscription(userId, productId);
    }

    return new Response(JSON.stringify({ error: 'UNSUPPORTED_PROVIDER' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'SUBSCRIPTION_SESSION_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
