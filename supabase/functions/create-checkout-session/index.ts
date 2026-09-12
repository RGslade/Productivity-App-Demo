import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      },
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
    const priceId = Deno.env.get('STRIPE_PRICE_ID');

    if (!stripeSecret) {
      return new Response('Missing STRIPE_SECRET_KEY', { status: 500 });
    }

    if (!priceId) {
      return new Response('Missing STRIPE_PRICE_ID', { status: 500 });
    }

    const stripe = new Stripe(stripeSecret, {
      apiVersion: '2023-10-16',
    });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: user.email!,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: 'leavingthenest://subscribe?result=success',
      cancel_url: 'leavingthenest://subscribe?result=cancel',
      subscription_data: {
        metadata: {
          auth_user_id: user.id,
        },
      },
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (err) {
    console.error('create-checkout-session error:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
});
