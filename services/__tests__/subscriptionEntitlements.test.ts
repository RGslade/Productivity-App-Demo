import { deriveSubscriptionProfile } from '@/services/subscriptionService';

jest.mock('react-native-purchases', () => ({}));
jest.mock('react-native-purchases-ui', () => ({}));

function customerInfo(overrides: Record<string, unknown> = {}) {
  return {
    entitlements: { all: {}, active: {} },
    allPurchasedProductIdentifiers: [],
    ...overrides,
  } as any;
}

describe('RevenueCat purchase access', () => {
  it('keeps ads visible when only a token pack is owned', () => {
    const profile = deriveSubscriptionProfile(customerInfo({
      allPurchasedProductIdentifiers: ['lifenest_tokens_500'],
    }));

    expect(profile.isPremium).toBe(false);
    expect(profile.hasRemoveAds).toBe(false);
    expect(profile.isAdFree).toBe(false);
  });

  it('removes ads without granting subscription access for Remove Ads plus tokens', () => {
    const profile = deriveSubscriptionProfile(customerInfo({
      allPurchasedProductIdentifiers: ['lifenest_tokens_500', 'removeads'],
    }));

    expect(profile.isPremium).toBe(false);
    expect(profile.hasRemoveAds).toBe(true);
    expect(profile.isAdFree).toBe(true);
  });

  it('recognises an active Remove Ads entitlement without treating it as Pro', () => {
    const removeAdsEntitlement = {
      isActive: true,
      willRenew: false,
      productIdentifier: 'removeads',
    };
    const profile = deriveSubscriptionProfile(customerInfo({
      entitlements: {
        all: { 'Remove Ads': removeAdsEntitlement },
        active: { 'Remove Ads': removeAdsEntitlement },
      },
      allPurchasedProductIdentifiers: ['lifenest_tokens_1000'],
    }));

    expect(profile.isPremium).toBe(false);
    expect(profile.hasRemoveAds).toBe(true);
    expect(profile.isAdFree).toBe(true);
  });

  it('gives both monthly subscription access and ad-free access for an active Pro entitlement', () => {
    const proEntitlement = {
      isActive: true,
      willRenew: true,
      productIdentifier: 'monthly',
      store: 'PLAY_STORE',
    };
    const profile = deriveSubscriptionProfile(customerInfo({
      entitlements: {
        all: { 'Demo Pro': proEntitlement },
        active: { 'Demo Pro': proEntitlement },
      },
      allPurchasedProductIdentifiers: ['monthly', 'lifenest_tokens_500'],
    }));

    expect(profile.isPremium).toBe(true);
    expect(profile.isAdFree).toBe(true);
  });

  it('ignores a token pack incorrectly attached to the Pro entitlement', () => {
    const tokenEntitlement = {
      isActive: true,
      willRenew: false,
      productIdentifier: 'lifenest_tokens_1000',
    };
    const profile = deriveSubscriptionProfile(customerInfo({
      entitlements: {
        all: { 'Demo Pro': tokenEntitlement },
        active: { 'Demo Pro': tokenEntitlement },
      },
      allPurchasedProductIdentifiers: ['lifenest_tokens_1000'],
    }));

    expect(profile.isPremium).toBe(false);
    expect(profile.hasRemoveAds).toBe(false);
    expect(profile.isAdFree).toBe(false);
    expect(profile.status).toBe('inactive');
  });
});




