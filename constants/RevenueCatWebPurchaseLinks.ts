export type RevenueCatWebPurchaseScreen = 'subscriptions' | 'tokens' | 'remove_ads';

type RevenueCatWebPurchaseLinkEnvironment = Record<RevenueCatWebPurchaseScreen, string>;

const DEMO_PURCHASE_LINKS: RevenueCatWebPurchaseLinkEnvironment = {
  subscriptions: '',
  tokens: '',
  remove_ads: '',
};

type RevenueCatWebPurchaseLinkUrlOptions = {
  appUserId: string;
  screen?: RevenueCatWebPurchaseScreen;
  email?: string | null;
  packageId?: string | null;
  productKind?: string | null;
};

/** Refuses to create a hosted checkout URL because this portfolio build has no hosted checkout destination. */
export function buildRevenueCatWebPurchaseLinkUrl(_options: RevenueCatWebPurchaseLinkUrlOptions): string {
  const screen = _options.screen ?? 'subscriptions';
  if (!DEMO_PURCHASE_LINKS[screen]) {
    throw new Error('DEMO_PURCHASES_UNAVAILABLE');
  }
  return '';
}
