import { Platform } from 'react-native';
import Constants from 'expo-constants';
import settingsService from '@/services/settingsService';

export type MandatoryUpdateState = {
  isRequired: boolean;
  minimumVersion: string | null;
  currentVersion: string;
  storeUrl: string | null;
};

const ANDROID_MIN_VERSION_KEY = 'min_supported_version_android';
const IOS_MIN_VERSION_KEY = 'min_supported_version_ios';
const ANDROID_STORE_URL_KEY = 'force_update_store_url_android';
const IOS_STORE_URL_KEY = 'force_update_store_url_ios';

/** Normalises a version string into numeric parts for comparison. */
function toVersionParts(version: string): number[] {
  return version
    .split('.')
    .map((part) => Number.parseInt(part.replace(/[^0-9]/g, ''), 10))
    .map((part) => (Number.isFinite(part) ? part : 0));
}

/** Compares two dotted version strings and returns -1, 0, or 1. */
function compareVersions(a: string, b: string): number {
  const aParts = toVersionParts(a);
  const bParts = toVersionParts(b);
  const maxLength = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < maxLength; i += 1) {
    const aValue = aParts[i] ?? 0;
    const bValue = bParts[i] ?? 0;

    if (aValue < bValue) return -1;
    if (aValue > bValue) return 1;
  }

  return 0;
}

/** Returns the current platform AppConfig keys used for force-update policy. */
function getPlatformConfigKeys() {
  if (Platform.OS === 'ios') {
    return {
      minVersionKey: IOS_MIN_VERSION_KEY,
      storeUrlKey: IOS_STORE_URL_KEY,
    };
  }

  return {
    minVersionKey: ANDROID_MIN_VERSION_KEY,
    storeUrlKey: ANDROID_STORE_URL_KEY,
  };
}

/** Returns the fallback Google Play URL from the current Android package id. */
function getAndroidFallbackStoreUrl(): string | null {
  const androidPackageId = Constants.expoConfig?.android?.package || 'com.example.productivitymobileapp';

  return `https://play.google.com/store/apps/details?id=${androidPackageId}`;
}

class AppUpdateService {
  /** Returns mandatory-update state for the active platform and app version. */
  async getMandatoryUpdateState(currentVersion: string): Promise<MandatoryUpdateState> {
    if (Platform.OS === 'web') {
      return {
        isRequired: false,
        minimumVersion: null,
        currentVersion,
        storeUrl: null,
      };
    }

    try {
      const { minVersionKey, storeUrlKey } = getPlatformConfigKeys();
      const [minimumVersion, configuredStoreUrl] = await Promise.all([
        settingsService.getAppConfigValue(minVersionKey),
        settingsService.getAppConfigValue(storeUrlKey),
      ]);

      const storeUrl = configuredStoreUrl || (Platform.OS === 'android' ? getAndroidFallbackStoreUrl() : null);
      const isRequired = Boolean(minimumVersion && compareVersions(currentVersion, minimumVersion) < 0);

      return {
        isRequired,
        minimumVersion,
        currentVersion,
        storeUrl,
      };
    } catch (error) {
      console.error('appUpdateService.getMandatoryUpdateState', error);
      return {
        isRequired: false,
        minimumVersion: null,
        currentVersion,
        storeUrl: Platform.OS === 'android' ? getAndroidFallbackStoreUrl() : null,
      };
    }
  }
}

export const appUpdateService = new AppUpdateService();
export default appUpdateService;
