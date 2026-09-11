import {
  CustomerInfo,
  LogLevel,
  Offering,
  Offerings,
  Package,
  Purchases,
  ReservedCustomerAttribute,
  Store,
  VirtualCurrencies,
} from '@revenuecat/purchases-js';

import {
  LIFENEST_TOKEN_1000_PRODUCT_IDENTIFIERS,
  LIFENEST_TOKEN_100_PRODUCT_IDENTIFIERS,
  LIFENEST_TOKEN_500_PRODUCT_IDENTIFIERS,
  MONTHLY_PRODUCT_IDENTIFIERS,
  REMOVE_ADS_PRODUCT_IDENTIFIERS,
  REVENUECAT_ENTITLEMENT_ID,
  LIFENEST_REVENUECAT_TOKEN_CODE,
  YEARLY_PRODUCT_IDENTIFIERS,
} from '@/constants/subscription';
import { supabase } from '@/lib/supabase';

export type SubscriptionProvider = 'google_play' | 'apple_iap' | 'stripe' | 'revenuecat_billing' | 'paddle';
export type RevenueCatProductKind =
  | 'monthly'
  | 'yearly'
  | 'remove_ads'
  | 'lifenest_tokens_100'
  | 'lifenest_tokens_500'
  | 'lifenest_tokens_1000'
  | 'unknown';

type WebProduct = {
  identifier: string;
  title?: string;
  price: number;
  priceString?: string;
  currencyCode?: string;
};

export type WebRevenueCatPackage = Package & {
  product: WebProduct;
};

type RevenueCatConfigResponse = {
  sdkKey?: string;
  sdk_key?: string;
};

const CURRENCY_SYMBOL_TO_CODE: Record<string, string> = {
  'Â£': 'GBP',
  '$': 'USD',
  'â‚¬': 'EUR',
  'Â¥': 'JPY',
  'â‚¹': 'INR',
};

const LOCAL_DEVELOPMENT_REVENUECAT_WEB_KEY = process.env.EXPO_PUBLIC_REVENUECAT_WEB_SDK_KEY?.trim() ?? '';
let cachedApiKey: string | null = null;
let configuredAppUserId: string | null = null;

/** Returns true when the RevenueCat Web SDK has completed configuration. */
function isRevenueCatConfigured() {
  return Purchases.isConfigured();
}

/** Detects whether a RevenueCat app user id is an anonymous SDK-generated id. */
export function isAnonymousRevenueCatAppUserId(appUserId: string | null | undefined) {
  if (!appUserId) return false;
  return appUserId.startsWith('$RCAnonymousID:');
}

/** Normalises product identifiers for case-insensitive comparison. */
function normaliseProductIdentifier(identifier: string) {
  return identifier.trim().toLowerCase();
}

/** Checks if the product id matches exactly or matches the id before a base plan suffix. */
function matchesKnownProductId(identifier: string, knownIds: readonly string[]) {
  const normalised = normaliseProductIdentifier(identifier);
  const baseProductId = normalised.split(':')[0];
  return knownIds.some((known) => {
    const normalisedKnown = normaliseProductIdentifier(known);
    return normalised === normalisedKnown || baseProductId === normalisedKnown;
  });
}

/** Resolves the app product kind from a RevenueCat product identifier. */
export function getRevenueCatProductKind(identifier: string): RevenueCatProductKind {
  if (matchesKnownProductId(identifier, MONTHLY_PRODUCT_IDENTIFIERS)) return 'monthly';
  if (matchesKnownProductId(identifier, YEARLY_PRODUCT_IDENTIFIERS)) return 'yearly';
  if (matchesKnownProductId(identifier, REMOVE_ADS_PRODUCT_IDENTIFIERS)) return 'remove_ads';
  if (matchesKnownProductId(identifier, LIFENEST_TOKEN_100_PRODUCT_IDENTIFIERS)) return 'lifenest_tokens_100';
  if (matchesKnownProductId(identifier, LIFENEST_TOKEN_500_PRODUCT_IDENTIFIERS)) return 'lifenest_tokens_500';
  if (matchesKnownProductId(identifier, LIFENEST_TOKEN_1000_PRODUCT_IDENTIFIERS)) return 'lifenest_tokens_1000';
  return 'unknown';
}

/** Returns true when the product kind is a LifeNest consumable token bundle. */
export function isLifeNestTokenProductKind(kind: RevenueCatProductKind) {
  return kind === 'lifenest_tokens_100' || kind === 'lifenest_tokens_500' || kind === 'lifenest_tokens_1000';
}

/** Maps a LifeNest consumable product kind to its granted token count. */
export function getLifeNestTokenAmountForProductKind(kind: RevenueCatProductKind) {
  if (kind === 'lifenest_tokens_100') return 100;
  if (kind === 'lifenest_tokens_500') return 500;
  if (kind === 'lifenest_tokens_1000') return 1000;
  return 0;
}

/** Reads an optional local RevenueCat web SDK key for development builds only. */
function getLocalDevelopmentApiKey() {
  if (!__DEV__) return '';
  return LOCAL_DEVELOPMENT_REVENUECAT_WEB_KEY;
}

/** Gets the RevenueCat public web SDK key from local env or Supabase config. */
async function getRevenueCatApiKey(): Promise<string> {
  if (cachedApiKey) return cachedApiKey;

  const localDevelopmentKey = getLocalDevelopmentApiKey();
  if (localDevelopmentKey) {
    cachedApiKey = localDevelopmentKey;
    return localDevelopmentKey;
  }

  const { data, error } = await supabase.functions.invoke('revenuecat-config', {
    body: {
      platform: 'web',
      useTestKey: __DEV__,
    },
  });

  if (error) {
    console.error('RevenueCat web config function failed', error);
    throw new Error(error.message || 'REVENUECAT_CONFIG_FETCH_FAILED');
  }

  const response = (data as RevenueCatConfigResponse) ?? {};
  const apiKey = (response.sdkKey ?? response.sdk_key ?? '').trim();
  cachedApiKey = apiKey;
  return apiKey;
}

/** Ensures the fetched SDK key matches one of RevenueCat Web SDK's public key prefixes. */
function validateRevenueCatApiKey(apiKey: string) {
  if (!apiKey) {
    throw new Error('REVENUECAT_WEB_API_KEY_MISSING');
  }

  if (apiKey.startsWith('test_') && !__DEV__) {
    throw new Error('REVENUECAT_API_KEY_TEST_KEY_IN_PRODUCTION');
  }

  if (
    !apiKey.startsWith('rcb_') &&
    !apiKey.startsWith('strp_') &&
    !apiKey.startsWith('pdl_') &&
    !apiKey.startsWith('test_')
  ) {
    throw new Error('REVENUECAT_WEB_API_KEY_PLATFORM_MISMATCH');
  }
}

/** Returns the singleton SDK instance after configuration. */
function getPurchases() {
  if (!isRevenueCatConfigured()) {
    throw new Error('REVENUECAT_WEB_NOT_CONFIGURED');
  }
  return Purchases.getSharedInstance();
}

/** Maps RevenueCat's web store names into the app's provider values. */
function mapStoreToProvider(store?: Store | string | null): SubscriptionProvider | null {
  switch (store) {
    case 'play_store':
      return 'google_play';
    case 'app_store':
    case 'mac_app_store':
      return 'apple_iap';
    case 'stripe':
      return 'stripe';
    case 'rc_billing':
      return 'revenuecat_billing';
    case 'paddle':
      return 'paddle';
    default:
      return null;
  }
}

/** Converts a date-like RevenueCat value to the app's persisted ISO string format. */
function toIsoString(value: Date | string | null | undefined) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Adds a native-compatible product shape to a web package for shared UI helpers. */
function normalisePackage(pkg: Package): WebRevenueCatPackage {
  const product = pkg.webBillingProduct;
  return Object.assign(pkg, {
    product: {
      identifier: product.identifier,
      title: product.title,
      price: product.price.amountMicros / 1_000_000,
      priceString: product.price.formattedPrice,
      currencyCode: product.price.currency,
    },
  });
}

/** Returns the configured Pro entitlement from a RevenueCat customer info payload. */
export function getProEntitlement(customerInfo: CustomerInfo | null) {
  if (!customerInfo) return null;
  const entitlement = (
    customerInfo.entitlements.all[REVENUECAT_ENTITLEMENT_ID] ??
    customerInfo.entitlements.active[REVENUECAT_ENTITLEMENT_ID] ??
    null
  );

  const productIdentifier = entitlement?.productIdentifier;
  const productKind = productIdentifier ? getRevenueCatProductKind(productIdentifier) : 'unknown';
  if (productKind === 'remove_ads' || isLifeNestTokenProductKind(productKind)) {
    console.warn('[RevenueCat] ignoring non-subscription product attached to Pro entitlement', {
      productIdentifier,
      productKind,
    });
    return null;
  }

  return entitlement;
}

/** Returns true when the configured Pro entitlement is active. */
export function isProEntitlementActive(customerInfo: CustomerInfo | null) {
  return getProEntitlement(customerInfo)?.isActive ?? false;
}

function getRemoveAdsEntitlement(customerInfo: CustomerInfo | null) {
  const entitlements = Object.values(customerInfo?.entitlements?.all ?? {});
  return entitlements.find(
    (entitlement) => entitlement.isActive && getRevenueCatProductKind(entitlement.productIdentifier ?? '') === 'remove_ads'
  ) ?? null;
}

/** Derives app subscription flags from RevenueCat web customer info. */
export function deriveSubscriptionProfile(customerInfo: CustomerInfo | null) {
  const entitlement = getProEntitlement(customerInfo);
  const removeAdsEntitlement = getRemoveAdsEntitlement(customerInfo);
  const nonSubscriptionProductIds = customerInfo?.nonSubscriptionTransactions?.map((transaction) => transaction.productIdentifier) ?? [];
  const hasRemoveAds = nonSubscriptionProductIds.some((id) => getRevenueCatProductKind(id) === 'remove_ads') || Boolean(removeAdsEntitlement);
  const isPremium = entitlement?.isActive ?? false;
  const productId = entitlement?.productIdentifier ?? nonSubscriptionProductIds.find((id) => getRevenueCatProductKind(id) === 'remove_ads') ?? null;

  let status: 'inactive' | 'active' | 'cancelled' = 'inactive';
  if (entitlement?.isActive) {
    status = entitlement.willRenew ? 'active' : 'cancelled';
  } else if (hasRemoveAds) {
    status = 'active';
  }

  return {
    isPremium,
    hasRemoveAds,
    isAdFree: isPremium || hasRemoveAds,
    provider: mapStoreToProvider(entitlement?.store ?? null),
    productId,
    entitlementProductId: entitlement?.productIdentifier ?? null,
    removeAdsProductId: removeAdsEntitlement?.productIdentifier ?? nonSubscriptionProductIds.find((id) => getRevenueCatProductKind(id) === 'remove_ads') ?? null,
    subscriptionStartedAt: toIsoString(entitlement?.originalPurchaseDate ?? entitlement?.latestPurchaseDate ?? null),
    status,
    managementUrl: customerInfo?.managementURL ?? null,
    entitlement,
  };
}

/** Returns a safe customer info debug snapshot for web builds. */
export function getCustomerInfoDebugSnapshot(customerInfo: CustomerInfo | null) {
  const activeSubscriptions = Array.from(customerInfo?.activeSubscriptions ?? []);
  const nonSubscriptionProductIds = customerInfo?.nonSubscriptionTransactions?.map((transaction) => transaction.productIdentifier) ?? [];
  const proEntitlement = getProEntitlement(customerInfo);

  return {
    hasCustomerInfo: Boolean(customerInfo),
    appUserId: customerInfo?.originalAppUserId ?? null,
    entitlementKeys: Object.keys(customerInfo?.entitlements?.all ?? {}),
    activeEntitlementKeys: Object.keys(customerInfo?.entitlements?.active ?? {}),
    hasProEntitlementRecord: Boolean(customerInfo?.entitlements?.all?.[REVENUECAT_ENTITLEMENT_ID]),
    proEntitlementIsActive: proEntitlement?.isActive ?? false,
    proEntitlementWillRenew: proEntitlement?.willRenew ?? null,
    proEntitlementProductIdentifier: proEntitlement?.productIdentifier ?? null,
    activeSubscriptions,
    allPurchasedProductIdentifiers: [...activeSubscriptions, ...nonSubscriptionProductIds],
    managementUrl: customerInfo?.managementURL ?? null,
  };
}

/** Chooses a LifeNest token virtual currency from a RevenueCat response. */
export function resolveLifeNestVirtualCurrency(virtualCurrencies: VirtualCurrencies | null | undefined) {
  const entries = Object.values(virtualCurrencies?.all ?? {});
  const tokenCode = LIFENEST_REVENUECAT_TOKEN_CODE.toLowerCase();
  const selected = entries.find((currency) => {
    const code = String(currency?.code ?? '').toLowerCase();
    return code === tokenCode;
  }) ?? entries.find((currency) => {
    const code = String(currency?.code ?? '').toLowerCase();
    const name = String(currency?.name ?? '').toLowerCase();
    return (code.includes('lifenest') || name.includes('lifenest')) && (code.includes('token') || name.includes('token'));
  }) ?? entries.find((currency) => String(currency?.code ?? currency?.name ?? '').toLowerCase().includes('token'));

  if (!selected) return null;
  return {
    balance: Number(selected.balance ?? 0),
    code: String(selected.code ?? ''),
    name: String(selected.name ?? ''),
  };
}

/** Resolves the app product kind from a RevenueCat web package. */
export function getRevenueCatPackageKind(pkg: WebRevenueCatPackage | Package): RevenueCatProductKind {
  const product = 'product' in pkg ? pkg.product : normalisePackage(pkg).product;
  const kindFromProductId = getRevenueCatProductKind(product.identifier);
  if (kindFromProductId !== 'unknown') return kindFromProductId;

  const searchable = `${pkg.identifier} ${product.identifier} ${product.title ?? ''} ${pkg.packageType ?? ''}`.toLowerCase();
  if (searchable.includes('remove') && searchable.includes('ads')) return 'remove_ads';
  if (searchable.includes('token') && searchable.includes('1000')) return 'lifenest_tokens_1000';
  if (searchable.includes('token') && searchable.includes('500')) return 'lifenest_tokens_500';
  if (searchable.includes('token') && searchable.includes('100')) return 'lifenest_tokens_100';
  if (searchable.includes('annual') || searchable.includes('yearly')) return 'yearly';
  if (searchable.includes('month')) return 'monthly';
  return 'unknown';
}

/** Returns a concise display label for a RevenueCat web package. */
export function getPackageDisplayLabel(pkg: WebRevenueCatPackage | Package) {
  const kind = getRevenueCatPackageKind(pkg);
  if (kind === 'yearly') return 'Yearly';
  if (kind === 'monthly') return 'Monthly';
  if (kind === 'remove_ads') return 'Remove Ads';
  if (kind === 'lifenest_tokens_100') return '100 LifeNest Tokens';
  if (kind === 'lifenest_tokens_500') return '500 LifeNest Tokens';
  if (kind === 'lifenest_tokens_1000') return '1000 LifeNest Tokens';
  const product = 'product' in pkg ? pkg.product : normalisePackage(pkg).product;
  return product.title?.trim() || pkg.identifier;
}

/** Formats a RevenueCat web product price. */
export function formatPackagePrice(product: WebProduct) {
  return product.priceString || 'See checkout';
}

/** Resolves a currency code from a saved preferred currency symbol. */
export function getCurrencyCodeForSymbol(symbol: string | null | undefined) {
  if (!symbol) return null;
  return CURRENCY_SYMBOL_TO_CODE[symbol] ?? null;
}

/** Formats a RevenueCat web product for the app's shared price UI. */
export function formatPackagePriceForPreferredCurrency(product: WebProduct, preferredCurrencySymbol: string | null | undefined) {
  const preferredCurrencyCode = getCurrencyCodeForSymbol(preferredCurrencySymbol);
  return {
    displayPrice: formatPackagePrice(product),
    billingPrice: formatPackagePrice(product),
    isApproximate: false,
    billingCurrencyCode: product.currencyCode || preferredCurrencyCode || 'GBP',
  };
}

/** Returns packages from all available RevenueCat web offerings. */
export function getAvailablePackagesForApp(offerings: Offerings | null | undefined) {
  if (!offerings) return [] as WebRevenueCatPackage[];
  const packages = new Map<string, WebRevenueCatPackage>();
  const addOffering = (offering?: Offering | null) => {
    offering?.availablePackages?.forEach((pkg) => packages.set(pkg.identifier, normalisePackage(pkg)));
  };

  addOffering(offerings.all?.Main);
  addOffering(offerings.current);
  Object.values(offerings.all ?? {}).forEach(addOffering);
  return Array.from(packages.values());
}

/** Finds the first package for a product kind from available web offerings. */
export function findPackageByKind(offerings: Offerings | null | undefined, kind: RevenueCatProductKind) {
  return getAvailablePackagesForApp(offerings).find((pkg) => getRevenueCatPackageKind(pkg) === kind) ?? null;
}

class WebSubscriptionService {
  /** Configures RevenueCat Web Billing for the signed-in app user. */
  async configure(appUserID?: string | null) {
    if (!appUserID) return false;

    const apiKey = await getRevenueCatApiKey();
    validateRevenueCatApiKey(apiKey);

    if (__DEV__) {
      Purchases.setLogLevel(LogLevel.Debug);
    }

    if (!isRevenueCatConfigured()) {
      Purchases.configure({
        apiKey,
        appUserId: appUserID,
      });
      configuredAppUserId = appUserID;
      return true;
    }

    if (configuredAppUserId !== appUserID) {
      await getPurchases().changeUser(appUserID);
      configuredAppUserId = appUserID;
    }

    return true;
  }

  /** Changes the current RevenueCat web app user id. */
  async logIn(appUserID: string) {
    await this.configure(appUserID);
    const customerInfo = await getPurchases().changeUser(appUserID);
    configuredAppUserId = appUserID;
    return { customerInfo };
  }

  /** Clears the tracked web SDK identity without creating an anonymous checkout identity. */
  async logOut() {
    configuredAppUserId = null;
    return null;
  }

  /** Reads the latest customer info for the configured web user. */
  async getCustomerInfo() {
    if (!isRevenueCatConfigured()) return null;
    return getPurchases().getCustomerInfo();
  }

  /** Reads the currently configured RevenueCat web app user id. */
  async getAppUserID() {
    if (!isRevenueCatConfigured()) return null;
    return getPurchases().getAppUserId();
  }

  /** Reads available web offerings. */
  async getOfferings() {
    if (!isRevenueCatConfigured()) return null;
    const offerings = await getPurchases().getOfferings();
    getAvailablePackagesForApp(offerings);
    return offerings;
  }

  /** Reads current RevenueCat web virtual currencies. */
  async getVirtualCurrencies() {
    if (!isRevenueCatConfigured()) return null;
    return getPurchases().getVirtualCurrencies();
  }

  /** Reads cached RevenueCat web virtual currencies when available. */
  async getCachedVirtualCurrencies() {
    if (!isRevenueCatConfigured()) return null;
    return getPurchases().getCachedVirtualCurrencies();
  }

  /** Invalidates cached RevenueCat web virtual currencies. */
  async invalidateVirtualCurrenciesCache() {
    if (!isRevenueCatConfigured()) return null;
    getPurchases().invalidateVirtualCurrenciesCache();
    return null;
  }

  /** Returns the identified LifeNest token virtual currency balance from RevenueCat web. */
  async getLifeNestVirtualCurrency() {
    if (!isRevenueCatConfigured()) return null;
    const virtualCurrencies = await getPurchases().getVirtualCurrencies();
    return resolveLifeNestVirtualCurrency(virtualCurrencies);
  }

  /** Starts a RevenueCat web checkout for one package. */
  async purchasePackage(pkg: WebRevenueCatPackage) {
    return getPurchases().purchase({
      rcPackage: pkg,
      skipSuccessPage: false,
    });
  }

  /** Refreshes customer info because web purchases are account-bound and do not use native restore. */
  async restorePurchases() {
    return getPurchases().getCustomerInfo();
  }

  /** Syncs RevenueCat subscriber attributes for the web app user. */
  async syncSubscriberAttributes(options: {
    email?: string | null;
    displayName?: string | null;
    phoneNumber?: string | null;
  }) {
    const attributes: Record<string, string | null> = {};
    if (options.email) attributes[ReservedCustomerAttribute.Email] = options.email;
    if (options.displayName) attributes[ReservedCustomerAttribute.DisplayName] = options.displayName;
    if (options.phoneNumber) attributes[ReservedCustomerAttribute.PhoneNumber] = options.phoneNumber;
    if (Object.keys(attributes).length > 0) {
      await getPurchases().setAttributes(attributes);
    }
  }

  /** Presents the RevenueCat-hosted web paywall when the offering has one. */
  async presentPaywall(offering?: Offering | null) {
    const targetOffering = offering ?? (await getPurchases().getOfferings()).current;
    if (!targetOffering) return null;
    return getPurchases().presentPaywall({ offering: targetOffering });
  }

  /** Presents a web paywall when the customer does not already have Pro access. */
  async presentPaywallIfNeeded(offering?: Offering | null) {
    const customerInfo = await this.getCustomerInfo();
    if (isProEntitlementActive(customerInfo)) return null;
    return this.presentPaywall(offering);
  }

  /** Opens the RevenueCat management URL for web subscriptions when one is available. */
  async presentCustomerCenter() {
    const customerInfo = await this.getCustomerInfo();
    if (customerInfo?.managementURL) {
      window.open(customerInfo.managementURL, '_blank', 'noopener,noreferrer');
    }
  }

  /** Returns true when a web paywall result contains updated customer info. */
  isSuccessfulPaywallResult(result: unknown) {
    return Boolean(result && typeof result === 'object' && 'customerInfo' in result);
  }
}

export const subscriptionService = new WebSubscriptionService();
