type AdMobPlatform = 'ios' | 'android';

type AdMobConfigRequest = {
  platform?: string;
  useTestAds?: boolean;
  use_test_ads?: boolean;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const googleTestAdUnitIds: Record<AdMobPlatform, { bannerAdUnitId: string; interstitialAdUnitId: string }> = {
  android: {
    bannerAdUnitId: 'ca-app-pub-3940256099942544/6300978111',
    interstitialAdUnitId: 'ca-app-pub-3940256099942544/1033173712',
  },
  ios: {
    bannerAdUnitId: 'ca-app-pub-3940256099942544/2934735716',
    interstitialAdUnitId: 'ca-app-pub-3940256099942544/4411468910',
  },
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function normalisePlatform(value: unknown): AdMobPlatform | null {
  if (value === 'ios' || value === 'android') {
    return value;
  }

  return null;
}

function getSecret(name: string) {
  return Deno.env.get(name)?.trim() ?? '';
}

function getProductionAdUnitIds(platform: AdMobPlatform) {
  if (platform === 'ios') {
    return {
      bannerAdUnitId: getSecret('ADMOB_BANNER_IOS'),
      interstitialAdUnitId: getSecret('ADMOB_INTERSTITIAL_IOS'),
      requiredSecrets: ['ADMOB_BANNER_IOS', 'ADMOB_INTERSTITIAL_IOS'],
    };
  }

  return {
    bannerAdUnitId: getSecret('ADMOB_BANNER_ANDROID'),
    interstitialAdUnitId: getSecret('ADMOB_INTERSTITIAL_ANDROID'),
    requiredSecrets: ['ADMOB_BANNER_ANDROID', 'ADMOB_INTERSTITIAL_ANDROID'],
  };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'METHOD_NOT_ALLOWED' }, 405);
  }

  try {
    const payload = (await request.json().catch(() => ({}))) as AdMobConfigRequest;
    const platform = normalisePlatform(payload.platform);
    const useTestAds = payload.useTestAds === true || payload.use_test_ads === true;

    if (!platform) {
      return jsonResponse({ error: 'INVALID_PLATFORM' }, 400);
    }

    if (useTestAds) {
      const testIds = googleTestAdUnitIds[platform];

      return jsonResponse({
        bannerAdUnitId: testIds.bannerAdUnitId,
        banner_ad_unit_id: testIds.bannerAdUnitId,
        interstitialAdUnitId: testIds.interstitialAdUnitId,
        interstitial_ad_unit_id: testIds.interstitialAdUnitId,
        useTestAds: true,
        use_test_ads: true,
      });
    }

    const config = getProductionAdUnitIds(platform);
    const missingSecrets = config.requiredSecrets.filter((name) => !getSecret(name));

    if (missingSecrets.length > 0) {
      return jsonResponse(
        {
          error: 'ADMOB_CONFIG_MISSING',
          missingSecrets,
        },
        500,
      );
    }

    return jsonResponse({
      bannerAdUnitId: config.bannerAdUnitId,
      banner_ad_unit_id: config.bannerAdUnitId,
      interstitialAdUnitId: config.interstitialAdUnitId,
      interstitial_ad_unit_id: config.interstitialAdUnitId,
      useTestAds: false,
      use_test_ads: false,
    });
  } catch (error) {
    console.error('ad-config failed', error);

    return jsonResponse(
      {
        error: 'ADMOB_CONFIG_FAILED',
      },
      500,
    );
  }
});
