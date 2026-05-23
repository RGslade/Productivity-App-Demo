import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';
import MobileAds, {
  AdEventType,
  BannerAd,
  BannerAdSize,
  InterstitialAd,
  //
  type InterstitialAd as InterstitialAdType,
} from 'react-native-google-mobile-ads';

import { adMobService } from '@/services/adMobService';

//
let globalInterstitial: InterstitialAdType | null = null;
//
let isGlobalInterstitialLoaded = false;
//
let mobileAdsInitialisePromise: Promise<void> | null = null;

/** Initialises Google Mobile Ads once for the app runtime. */
//
function initialiseMobileAds() {
  //
  if (!mobileAdsInitialisePromise) {
    mobileAdsInitialisePromise = MobileAds().initialize().then(() => undefined);
  }
  return mobileAdsInitialisePromise;
}

/** Creates the shared interstitial instance after its runtime unit id is loaded. */
//
function configureGlobalInterstitial(adUnitId: string) {
  //
  if (globalInterstitial || !adUnitId) return globalInterstitial;

  //
  const interstitial = InterstitialAd.createForAdRequest(adUnitId);
  globalInterstitial = interstitial;

  interstitial.addAdEventListener(AdEventType.LOADED, () => {
    isGlobalInterstitialLoaded = true;
  });

  interstitial.addAdEventListener(AdEventType.CLOSED, () => {
    isGlobalInterstitialLoaded = false;
    interstitial.load();
  });

  interstitial.addAdEventListener(AdEventType.ERROR, () => {
    isGlobalInterstitialLoaded = false;
  });

  return globalInterstitial;
}

/** Displays the global interstitial ad when loaded and queues the next load. */
//
export function showGlobalInterstitialAd() {
  //
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return;
  }

  //
  if (isGlobalInterstitialLoaded) {
    globalInterstitial?.show();
    return;
  }

  adMobService.getConfig()
    .then(async (config) => {
      //
      if (!config?.interstitialAdUnitId) return;
      await initialiseMobileAds();
      //
      const interstitial = configureGlobalInterstitial(config.interstitialAdUnitId);
      interstitial?.load();
    })
    .catch((error) => {
      console.error('Unable to load interstitial ad config', error);
    });
}

/** Displays the global banner ad for users who have not removed ads. */
//
export default function MyBanner() {
  //
  const [adInitialised, setAdInitialised] = useState(false);
  //
  const [bannerAdUnitId, setBannerAdUnitId] = useState<string | null>(null);
  //
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  //
  useEffect(() => {
    //
    let mounted = true;

    adMobService.getConfig()
      .then(async (config) => {
        //
        if (!mounted || !config?.bannerAdUnitId) {
          console.warn('Ad banner is disabled because no ad unit id is configured.');
          return;
        }

        await initialiseMobileAds();

        //
        if (!mounted) return;

        setBannerAdUnitId(config.bannerAdUnitId);
        setAdInitialised(true);

        //
        if (config.interstitialAdUnitId) {
          configureGlobalInterstitial(config.interstitialAdUnitId)?.load();
        }
      })
      .catch((error) => {
        console.error('Unable to initialise ad banner', error);
      });

    //
    return () => {
      mounted = false;
    };
  }, []);

  //
  useEffect(() => {
    //
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    //
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    //
    const showSub = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true);
    });

    //
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
    });

    //
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  //
  if (!adInitialised || keyboardVisible || !bannerAdUnitId) {
    return null;
  }

  //
  return (
    <BannerAd
      unitId={bannerAdUnitId}
      size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
      requestOptions={{ requestNonPersonalizedAdsOnly: false }}
    />
  );
}
