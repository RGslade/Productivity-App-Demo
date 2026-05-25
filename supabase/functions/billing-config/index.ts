type RevenueCatPlatform = 'ios' | 'android';

type RevenueCatConfigRequest = {
  platform?: RevenueCatPlatform;
  useTestKey?: boolean;
  use_test_key?: boolean;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function isRevenueCatPlatform(platform: string | undefined): platform is RevenueCatPlatform {
  return platform === 'ios' || platform === 'android';
}

function getRevenueCatSdkKey(platform: RevenueCatPlatform, useTestKey: boolean) {
  if (useTestKey) {
    const testKey = Deno.env.get(
      platform === 'ios' ? 'REVENUECAT_TEST_SDK_KEY_IOS' : 'REVENUECAT_TEST_SDK_KEY_ANDROID',
    )?.trim();

    if (testKey) return testKey;
  }

  return Deno.env.get(
    platform === 'ios' ? 'REVENUECAT_SDK_KEY_IOS' : 'REVENUECAT_SDK_KEY_ANDROID',
  )?.trim() ?? '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as RevenueCatConfigRequest;
    const platform = body.platform;

    if (!isRevenueCatPlatform(platform)) {
      return new Response(JSON.stringify({ error: 'UNSUPPORTED_PLATFORM' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const useTestKey = body.useTestKey ?? body.use_test_key ?? false;
    const sdkKey = getRevenueCatSdkKey(platform, useTestKey);

    if (!sdkKey) {
      return new Response(JSON.stringify({ error: 'REVENUECAT_SDK_KEY_MISSING' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ sdkKey }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'REVENUECAT_CONFIG_ERROR',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
