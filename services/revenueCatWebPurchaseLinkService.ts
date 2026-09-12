import { Linking, Platform } from 'react-native';

import { PROJECT_SUPPORT_EMAIL } from '@/constants/ProjectInfo';
import {
  buildRevenueCatWebPurchaseLinkUrl,
  RevenueCatWebPurchaseScreen,
} from '@/constants/RevenueCatWebPurchaseLinks';
import { showAlert } from '@/hooks/dataHandler';
import { addCrashBreadcrumb, logError } from '@/services/crashLogger';

type OpenRevenueCatHostedPurchasesOptions = {
  appUserId?: string | null;
  email?: string | null;
  screen: RevenueCatWebPurchaseScreen;
  source: string;
};

/** Opens the hosted RevenueCat all-products purchase screen on web only. */
export async function openRevenueCatHostedPurchases(options: OpenRevenueCatHostedPurchasesOptions) {
  if (Platform.OS !== 'web') return false;

  const appUserId = options.appUserId?.trim();
  if (!appUserId) {
    logError('openRevenueCatHostedPurchases', new Error('APP_USER_ID_MISSING'), { source: options.source });
    showAlert('Sign in required', 'Please sign in again before purchasing.');
    return true;
  }

  try {
    const checkoutUrl = buildRevenueCatWebPurchaseLinkUrl({
      appUserId,
      screen: options.screen,
      email: options.email,
      productKind: options.screen,
    });

    addCrashBreadcrumb('revenuecat_hosted_purchases_open', {
      source: options.source,
      screen: options.screen,
      hasEmail: Boolean(options.email),
    });

    await Linking.openURL(checkoutUrl);
  } catch (error) {
    if (error instanceof Error && error.message === 'DEMO_PURCHASES_UNAVAILABLE') {
      showAlert('Purchases unavailable', 'Purchases are disabled in this demonstration build.');
      return true;
    }

    logError('openRevenueCatHostedPurchases.openURL', error, { source: options.source });
    showAlert(
      'Could not open checkout',
      `Please try again. If this keeps happening, contact support at ${PROJECT_SUPPORT_EMAIL}.`,
    );
  }

  return true;
}
