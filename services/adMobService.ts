import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

import { supabase } from '@/lib/supabase';
import { BackendFunctions } from '@/constants/backendResources';

//
type AdMobConfigResponse = {
  bannerAdUnitId?: string;
  banner_ad_unit_id?: string;
  interstitialAdUnitId?: string;
  interstitial_ad_unit_id?: string;
  useTestAds?: boolean;
  use_test_ads?: boolean;
};

//
export type AdMobConfig = {
  bannerAdUnitId: string;
  interstitialAdUnitId: string;
  useTestAds: boolean;
};

//
let cachedConfigPromise: Promise<AdMobConfig | null> | null = null;

/** Returns true when the current platform can render native Google Mobile Ads. */
//
function isAdMobPlatform() {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

/** Gets the platform payload value expected by the ad config edge function. */
//
function getAdMobPlatform() {
  return Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'unknown';
}

/** Returns local Google test ad unit ids for development fallback only. */
//
function getDevelopmentAdMobConfig(): AdMobConfig | null {
  //
  if (!__DEV__ || !isAdMobPlatform()) return null;

  //
  const bannerAdUnitId =
    Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS?.trim()
      : process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID?.trim();
  //
  const interstitialAdUnitId =
    Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS?.trim()
      : process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID?.trim();

  //
  if (bannerAdUnitId && !interstitialAdUnitId) {
    console.warn('Local development AdMob interstitial unit ID is missing. Falling back to Google interstitial test unit ID.');
  } else if (!bannerAdUnitId && interstitialAdUnitId) {
    console.warn('Local development AdMob banner unit ID is missing. Falling back to Google banner test unit ID.');
  }

  return {
    bannerAdUnitId: bannerAdUnitId || TestIds.BANNER,
    interstitialAdUnitId: interstitialAdUnitId || TestIds.INTERSTITIAL,
    useTestAds: !bannerAdUnitId && !interstitialAdUnitId,
  };
}

/** Normalises the edge function response into the app's ad config shape. */
//
function normaliseAdMobConfig(response: AdMobConfigResponse): AdMobConfig | null {
  //
  const bannerAdUnitId = (response.bannerAdUnitId ?? response.banner_ad_unit_id ?? '').trim();
  //
  const interstitialAdUnitId = (response.interstitialAdUnitId ?? response.interstitial_ad_unit_id ?? '').trim();

  //
  if (!bannerAdUnitId && !interstitialAdUnitId) {
    return null;
  }

  return {
    bannerAdUnitId,
    interstitialAdUnitId,
    useTestAds: response.useTestAds ?? response.use_test_ads ?? false,
  };
}

//
class AdMobService {
  /** Fetches and caches native ad unit ids for the current platform. */
  async getConfig(): Promise<AdMobConfig | null> {
    //
    if (!isAdMobPlatform()) return null;
    //
    if (cachedConfigPromise) return cachedConfigPromise;

    cachedConfigPromise = this.fetchConfig();
    return cachedConfigPromise;
  }

  /** Calls the backend ad config endpoint and falls back to test ads during local development. */
  private async fetchConfig(): Promise<AdMobConfig | null> {
    //
    const platform = getAdMobPlatform();
    //
    if (platform === 'unknown') return null;

    //
    try {
      //
      const { data, error } = await supabase.functions.invoke(BackendFunctions.adConfig, {
        body: {
          platform,
          useTestAds: __DEV__,
        },
      });

      //
      if (error) {
        throw new Error(error.message || 'ADMOB_CONFIG_FETCH_FAILED');
      }

      //
      const config = normaliseAdMobConfig((data as AdMobConfigResponse) ?? {});
      //
      if (config) return config;

      throw new Error('ADMOB_CONFIG_EMPTY');
    } catch (error) {
      //
      const developmentConfig = getDevelopmentAdMobConfig();
      //
      if (developmentConfig) {
        console.warn('Using local Google test ads because AdMob config could not be loaded.', error);
        return developmentConfig;
      }

      console.error('AdMob config function failed', error);
      return null;
    }
  }
}

//
export const adMobService = new AdMobService();
//
export default adMobService;
