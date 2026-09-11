import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ADSENSE_CLIENT_ID, ADSENSE_MAIN_SLOT_ID } from '@/constants/Ads';

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

function ensureAdSenseScript() {
  if (typeof document === 'undefined') return;
  if (document.querySelector('script[src^="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]')) return;
  const script = document.createElement('script');
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.dataset.productivityAppAdsense = 'true';
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`;
  document.head.appendChild(script);
}

export function showGlobalInterstitialAd() {
  // AdSense does not provide an AdMob-style imperative interstitial API.
}

/** Displays one manually placed responsive AdSense unit on an approved content route. */
interface WebAdDisplayProps {
  onBannerHeightChange?: (height: number) => void;
}

/** Returns true when the web app is running on a local development hostname. */
function isLocalDevelopmentHost(): boolean {
  if (typeof window === 'undefined') return false;
  return ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
}

export default function WebAdDisplay({ onBannerHeightChange }: WebAdDisplayProps) {
  const requested = useRef(false);
  const showLocalhostPlaceholder = __DEV__ && isLocalDevelopmentHost();

  useEffect(() => {
    if (showLocalhostPlaceholder || requested.current || typeof window === 'undefined') return;
    ensureAdSenseScript();
    requested.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (error) {
      console.warn('Unable to request AdSense banner', error);
    }
  }, [showLocalhostPlaceholder]);

  if (showLocalhostPlaceholder) {
    return (
      <View style={[styles.container, styles.localhostPlaceholder]} accessibilityLabel="Ad preview: ads are not served on localhost">
        <Text style={styles.localhostPlaceholderText}>Ad preview</Text>
        <Text style={styles.localhostPlaceholderDetail}>Ads are not served on localhost</Text>
      </View>
    );
  }

  return (
    <View
      style={styles.container}
      accessibilityLabel="Advertisement"
      onLayout={(event) => onBannerHeightChange?.(event.nativeEvent.layout.height)}
    >
      {React.createElement('ins', {
        className: 'adsbygoogle',
        style: { display: 'block', width: '100%' },
        'data-ad-client': ADSENSE_CLIENT_ID,
        'data-ad-slot': ADSENSE_MAIN_SLOT_ID,
        'data-ad-format': 'auto',
        'data-full-width-responsive': 'true',
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 728,
    paddingVertical: 12,
    alignSelf: 'center',
    justifyContent: 'center',
  },
  localhostPlaceholder: {
    minHeight: 90,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#94A3B8',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    gap: 4,
  },
  localhostPlaceholderText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '700',
  },
  localhostPlaceholderDetail: {
    color: '#64748B',
    fontSize: 12,
  },
});
