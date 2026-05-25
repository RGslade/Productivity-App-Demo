import { Platform } from "react-native";
import Purchases, {
  CustomerInfo,
  PurchasesOffering,
  PurchasesOfferings,
  PurchasesPackage,
  PurchasesStoreProduct,
} from "react-native-purchases";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";

import {
  LIFENEST_TOKEN_1000_PRODUCT_IDENTIFIERS,
  LIFENEST_TOKEN_100_PRODUCT_IDENTIFIERS,
  LIFENEST_TOKEN_500_PRODUCT_IDENTIFIERS,
  MONTHLY_PRODUCT_IDENTIFIERS,
  REMOVE_ADS_PRODUCT_IDENTIFIERS,
  REVENUECAT_ANDROID_LIVE_PREFERRED_PRODUCT_IDS,
  REVENUECAT_DEV_PREFERRED_PRODUCT_IDS,
  REVENUECAT_ENTITLEMENT_ID,
  YEARLY_PRODUCT_IDENTIFIERS,
} from "@/constants/subscription";
import { supabase } from "@/lib/supabase";
import { BackendFunctions } from "@/constants/backendResources";

export type SubscriptionProvider = "google_play" | "apple_iap";
export type RevenueCatProductKind =
  | "monthly"
  | "yearly"
  | "remove_ads"
  | "lifenest_tokens_100"
  | "lifenest_tokens_500"
  | "lifenest_tokens_1000"
  | "unknown";

const CURRENCY_SYMBOL_TO_CODE: Record<string, string> = {
  'Â£': 'GBP',
  '$': 'USD',
  'â‚¬': 'EUR',
  'Â¥': 'JPY',
  'â‚¹': 'INR',
  'â‚¦': 'NGN',
  'â‚©': 'KRW',
  'â‚º': 'TRY',
  'â‚½': 'RUB',
  'à¸¿': 'THB',
  'â‚«': 'VND',
  'â‚±': 'PHP',
  'â‚ª': 'ILS',
  'R$': 'BRL',
  'C$': 'CAD',
  'A$': 'AUD',
  'NZ$': 'NZD',
  'S$': 'SGD',
  'HK$': 'HKD',
  'Mex$': 'MXN',
  'Fr': 'CHF',
  'kr': 'SEK',
  'zÅ‚': 'PLN',
  'KÄ': 'CZK',
  'R': 'ZAR',
  'Ø¯.Ø¥': 'AED',
  'Ø±.Ø³': 'SAR',
  'Ø±.Ù‚': 'QAR',
};

const APPROX_USD_EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  GBP: 1.25,
  EUR: 1.08,
  JPY: 0.0065,
  INR: 0.012,
  NGN: 0.00062,
  KRW: 0.00074,
  TRY: 0.031,
  RUB: 0.011,
  THB: 0.027,
  VND: 0.000039,
  PHP: 0.017,
  ILS: 0.27,
  BRL: 0.2,
  CAD: 0.73,
  AUD: 0.66,
  NZD: 0.61,
  SGD: 0.74,
  HKD: 0.13,
  MXN: 0.059,
  CHF: 1.1,
  DKK: 0.15,
  NOK: 0.094,
  SEK: 0.095,
  PLN: 0.25,
  CZK: 0.043,
  ZAR: 0.054,
  AED: 0.27,
  SAR: 0.27,
  QAR: 0.27,
};

const COUNTRY_TO_CURRENCY_CODE: Record<string, string> = {
  GB: 'GBP',
  US: 'USD',
  CA: 'CAD',
  AU: 'AUD',
  NZ: 'NZD',
  IE: 'EUR',
  FR: 'EUR',
  DE: 'EUR',
  ES: 'EUR',
  IT: 'EUR',
  NL: 'EUR',
  PT: 'EUR',
  JP: 'JPY',
  IN: 'INR',
  NG: 'NGN',
  KR: 'KRW',
  TR: 'TRY',
  RU: 'RUB',
  TH: 'THB',
  VN: 'VND',
  PH: 'PHP',
  IL: 'ILS',
  BR: 'BRL',
  SG: 'SGD',
  HK: 'HKD',
  MX: 'MXN',
  CH: 'CHF',
  DK: 'DKK',
  NO: 'NOK',
  SE: 'SEK',
  PL: 'PLN',
  CZ: 'CZK',
  ZA: 'ZAR',
  AE: 'AED',
  SA: 'SAR',
  QA: 'QAR',
};

function isNativeBillingPlatform() {
  return Platform.OS === "ios" || Platform.OS === "android";
}

type RevenueCatConfigResponse = {
  sdkKey?: string;
  sdk_key?: string;
};

type RevenueCatVirtualCurrencyShape = {
  balance: number;
  code: string;
  name: string;
};

type RevenueCatVirtualCurrenciesShape = {
  all: Record<string, RevenueCatVirtualCurrencyShape>;
};

type LifeNestVirtualCurrency = {
  balance: number;
  code: string;
  name: string;
};

const LOCAL_DEVELOPMENT_REVENUECAT_KEY = process.env.EXPO_PUBLIC_REVENUECAT_SDK_KEY?.trim() ?? "";
const PREFERS_DEV_TEST_REVENUECAT_PRODUCTS = __DEV__ && (
  LOCAL_DEVELOPMENT_REVENUECAT_KEY === "" || LOCAL_DEVELOPMENT_REVENUECAT_KEY.startsWith("test_")
);

/**
 * Reads an optional local RevenueCat SDK key for development builds only.
 */
function getLocalDevelopmentApiKey() {
  if (!__DEV__) return "";

  return process.env.EXPO_PUBLIC_REVENUECAT_SDK_KEY?.trim() ?? "";
}

/**
 * Gets the current platform key from the RevenueCat config edge function.
 */
async function getRevenueCatApiKey(): Promise<string> {
  const localDevelopmentKey = getLocalDevelopmentApiKey();
  if (localDevelopmentKey) {
    return localDevelopmentKey;
  }

  const platform = Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "unknown";
  if (platform === "unknown") return "";

  const { data, error } = await supabase.functions.invoke(BackendFunctions.billingConfig, {
    body: {
      platform,
      useTestKey: __DEV__,
    },
  });

  if (error) {
    console.error("RevenueCat config function failed", error);
    throw new Error(error.message || "REVENUECAT_CONFIG_FETCH_FAILED");
  }

  const response = (data as RevenueCatConfigResponse) ?? {};
  const key = response.sdkKey ?? response.sdk_key ?? "";
  return key.trim();
}

/**
 * Ensures the fetched SDK key matches the expected RevenueCat platform key prefix.
 */
function validateRevenueCatApiKey(apiKey: string) {
  if (!apiKey) {
    throw new Error("REVENUECAT_API_KEY_MISSING");
  }

  if (apiKey.startsWith("test_")) {
    if (!__DEV__) {
      throw new Error("REVENUECAT_API_KEY_TEST_KEY_IN_PRODUCTION");
    }
    return;
  }

  if (Platform.OS === "android" && !apiKey.startsWith("goog_")) {
    throw new Error("REVENUECAT_API_KEY_PLATFORM_MISMATCH_ANDROID");
  }

  if (Platform.OS === "ios" && !apiKey.startsWith("appl_")) {
    throw new Error("REVENUECAT_API_KEY_PLATFORM_MISMATCH_IOS");
  }
}

function mapStoreToProvider(store?: string | null): SubscriptionProvider | null {
  switch (store) {
    case "PLAY_STORE":
      return "google_play";
    case "APP_STORE":
    case "MAC_APP_STORE":
      return "apple_iap";
    default:
      return Platform.OS === "ios" ? "apple_iap" : Platform.OS === "android" ? "google_play" : null;
  }
}

/**
 * Detects whether a RevenueCat app user id is an anonymous SDK-generated id.
 */
export function isAnonymousRevenueCatAppUserId(appUserId: string | null | undefined) {
  if (!appUserId) return false;
  return appUserId.startsWith("$RCAnonymousID:");
}

/**
 * Normalises product identifiers for case-insensitive comparison.
 */
function normaliseProductIdentifier(identifier: string) {
  return identifier.trim().toLowerCase();
}

/**
 * Chooses the configured LifeNest token virtual currency from RevenueCat when available.
 */
export function resolveLifeNestVirtualCurrency(
  virtualCurrencies: RevenueCatVirtualCurrenciesShape | null | undefined
): LifeNestVirtualCurrency | null {
  const entries = Object.values((virtualCurrencies?.all ?? {}) as Record<string, RevenueCatVirtualCurrencyShape>);
  if (entries.length === 0) {
    return null;
  }

  const candidates = entries
    .map((currency) => ({
      currency,
      score: (() => {
        const code = currency.code.toLowerCase();
        const name = currency.name.toLowerCase();
        if (code === "lifenest_tokens") return 100;
        if (code.includes("lifenest") && code.includes("token")) return 90;
        if (name.includes("lifenest") && name.includes("token")) return 80;
        if (code.includes("token")) return 70;
        if (name.includes("token")) return 60;
        return 0;
      })(),
    }))
    .sort((a, b) => b.score - a.score);

  const selected = candidates[0];
  if (!selected) {
    return null;
  }

  if (entries.length > 1 && selected.score === 0) {
    console.warn("RevenueCat virtual currency is ambiguous; no LifeNest token currency could be identified.", {
      currencies: entries.map((currency) => ({ code: currency.code, name: currency.name })),
    });
    return null;
  }

  const currency = selected.currency;
  return {
    balance: Number(currency.balance ?? 0),
    code: currency.code,
    name: currency.name,
  };
}

/**
 * Checks if the product id matches exactly or matches the id before a base plan suffix.
 */
function matchesKnownProductId(identifier: string, knownIds: readonly string[]) {
  const normalised = normaliseProductIdentifier(identifier);
  const baseProductId = normalised.split(":")[0];
  return knownIds.some((known) => {
    const normalisedKnown = normaliseProductIdentifier(known);
    return normalised === normalisedKnown || baseProductId === normalisedKnown;
  });
}

/**
 * Resolves the app product kind from a RevenueCat product identifier.
 */
export function getRevenueCatProductKind(identifier: string): RevenueCatProductKind {
  if (matchesKnownProductId(identifier, MONTHLY_PRODUCT_IDENTIFIERS)) return "monthly";
  if (matchesKnownProductId(identifier, YEARLY_PRODUCT_IDENTIFIERS)) return "yearly";
  if (matchesKnownProductId(identifier, REMOVE_ADS_PRODUCT_IDENTIFIERS)) return "remove_ads";
  if (matchesKnownProductId(identifier, LIFENEST_TOKEN_100_PRODUCT_IDENTIFIERS)) return "lifenest_tokens_100";
  if (matchesKnownProductId(identifier, LIFENEST_TOKEN_500_PRODUCT_IDENTIFIERS)) return "lifenest_tokens_500";
  if (matchesKnownProductId(identifier, LIFENEST_TOKEN_1000_PRODUCT_IDENTIFIERS)) return "lifenest_tokens_1000";
  return "unknown";
}

/**
 * Returns true when the product kind is a LifeNest consumable token bundle.
 */
export function isLifeNestTokenProductKind(kind: RevenueCatProductKind) {
  return (
    kind === "lifenest_tokens_100" ||
    kind === "lifenest_tokens_500" ||
    kind === "lifenest_tokens_1000"
  );
}

/**
 * Maps a LifeNest consumable product kind to its granted token count.
 */
export function getLifeNestTokenAmountForProductKind(kind: RevenueCatProductKind) {
  if (kind === "lifenest_tokens_100") return 100;
  if (kind === "lifenest_tokens_500") return 500;
  if (kind === "lifenest_tokens_1000") return 1000;
  return 0;
}

export function getProEntitlement(customerInfo: CustomerInfo | null) {
  if (!customerInfo) return null;

  return (
    customerInfo.entitlements.all[REVENUECAT_ENTITLEMENT_ID] ??
    customerInfo.entitlements.active[REVENUECAT_ENTITLEMENT_ID] ??
    null
  );
}

export function isProEntitlementActive(customerInfo: CustomerInfo | null) {
  return getProEntitlement(customerInfo)?.isActive ?? false;
}

export function deriveSubscriptionProfile(customerInfo: CustomerInfo | null) {
  const entitlement = getProEntitlement(customerInfo);
  const entitlementDates = entitlement as {
    originalPurchaseDate?: string | null;
    latestPurchaseDate?: string | null;
    purchaseDate?: string | null;
  } | null;
  const isActive = entitlement?.isActive ?? false;
  const purchasedProductIds = new Set(
    (customerInfo?.allPurchasedProductIdentifiers ?? []).map((id) => normaliseProductIdentifier(id))
  );
  const hasRemoveAds = Array.from(purchasedProductIds).some(
    (id) => getRevenueCatProductKind(id) === "remove_ads"
  );
  const provider = mapStoreToProvider(entitlement?.store ?? null);
  const entitlementProductId = entitlement?.productIdentifier ?? null;
  const removeAdsProductId =
    (customerInfo?.allPurchasedProductIdentifiers ?? []).find(
      (identifier) => getRevenueCatProductKind(identifier) === "remove_ads"
    ) ?? null;
  const productId = entitlementProductId ?? removeAdsProductId ?? null;
  const subscriptionStartedAt =
    entitlementDates?.originalPurchaseDate ??
    entitlementDates?.latestPurchaseDate ??
    entitlementDates?.purchaseDate ??
    null;

  let status: "inactive" | "active" | "cancelled" = "inactive";
  if (entitlement?.isActive) {
    status = entitlement.willRenew ? "active" : "cancelled";
  } else if (hasRemoveAds) {
    status = "active";
  }

  return {
    isPremium: isActive,
    hasRemoveAds,
    isAdFree: isActive || hasRemoveAds,
    provider,
    productId,
    entitlementProductId,
    removeAdsProductId,
    subscriptionStartedAt,
    status,
    managementUrl: customerInfo?.managementURL ?? null,
    entitlement,
  };
}

export function getCustomerInfoDebugSnapshot(customerInfo: CustomerInfo | null) {
  if (!customerInfo) {
    return {
      hasCustomerInfo: false,
    };
  }

  const entitlementKeys = Object.keys(customerInfo.entitlements?.all ?? {});
  const activeEntitlementKeys = Object.keys(customerInfo.entitlements?.active ?? {});
  const proEntitlement = getProEntitlement(customerInfo);

  return {
    hasCustomerInfo: true,
    appUserId: customerInfo.originalAppUserId ?? null,
    entitlementKeys,
    activeEntitlementKeys,
    hasProEntitlementRecord: Boolean(customerInfo.entitlements?.all?.[REVENUECAT_ENTITLEMENT_ID]),
    proEntitlementIsActive: proEntitlement?.isActive ?? false,
    proEntitlementWillRenew: proEntitlement?.willRenew ?? null,
    proEntitlementProductIdentifier: proEntitlement?.productIdentifier ?? null,
    activeSubscriptions: customerInfo.activeSubscriptions ?? [],
    allPurchasedProductIdentifiers: customerInfo.allPurchasedProductIdentifiers ?? [],
    managementUrl: customerInfo.managementURL ?? null,
  };
}

export function getPackageDisplayLabel(pkg: PurchasesPackage) {
  const identifier = pkg.product.identifier;
  const title = pkg.product.title?.trim();
  const kind = getRevenueCatPackageKind(pkg);

  if (kind === "yearly") return "Yearly";
  if (kind === "monthly") return "Monthly";
  if (kind === "remove_ads") return "Remove Ads";
  if (kind === "lifenest_tokens_100") return "100 LifeNest Tokens";
  if (kind === "lifenest_tokens_500") return "500 LifeNest Tokens";
  if (kind === "lifenest_tokens_1000") return "1000 LifeNest Tokens";

  return title || pkg.identifier;
}

/**
 * Infers a RevenueCat product kind from package metadata when the product id alone is insufficient.
 */
function inferRevenueCatKindFromPackageMetadata(pkg: PurchasesPackage): RevenueCatProductKind {
  const packageIdentifier = normaliseProductIdentifier(pkg.identifier);
  const productIdentifier = normaliseProductIdentifier(pkg.product.identifier);
  const title = normaliseProductIdentifier(pkg.product.title ?? "");
  const searchable = `${packageIdentifier} ${productIdentifier} ${title}`;

  if (searchable.includes("remove") && searchable.includes("ads")) return "remove_ads";
  if (searchable.includes("token") && searchable.includes("1000")) return "lifenest_tokens_1000";
  if (searchable.includes("token") && searchable.includes("500")) return "lifenest_tokens_500";
  if (searchable.includes("token") && searchable.includes("100")) return "lifenest_tokens_100";

  const packageType = String((pkg as { packageType?: string }).packageType ?? "").toLowerCase();
  if (packageType.includes("annual") || searchable.includes("yearly") || searchable.includes("annual")) {
    return "yearly";
  }
  if (packageType.includes("month") || searchable.includes("monthly")) {
    return "monthly";
  }

  return "unknown";
}

/**
 * Resolves the app product kind from a full RevenueCat package.
 */
export function getRevenueCatPackageKind(pkg: PurchasesPackage): RevenueCatProductKind {
  const kindFromProductId = getRevenueCatProductKind(pkg.product.identifier);
  if (kindFromProductId !== "unknown") {
    return kindFromProductId;
  }

  return inferRevenueCatKindFromPackageMetadata(pkg);
}

/**
 * Returns the preferred identifier order for a RevenueCat product kind in this runtime.
 */
function getPreferredIdentifiersForKind(kind: RevenueCatProductKind) {
  if (PREFERS_DEV_TEST_REVENUECAT_PRODUCTS) {
    if (kind === "monthly") return [REVENUECAT_DEV_PREFERRED_PRODUCT_IDS.monthly];
    if (kind === "yearly") return [REVENUECAT_DEV_PREFERRED_PRODUCT_IDS.yearly];
    if (kind === "remove_ads") return [REVENUECAT_DEV_PREFERRED_PRODUCT_IDS.removeAds];
    if (kind === "lifenest_tokens_100") return [REVENUECAT_DEV_PREFERRED_PRODUCT_IDS.lifeNestTokens100];
    if (kind === "lifenest_tokens_500") return [REVENUECAT_DEV_PREFERRED_PRODUCT_IDS.lifeNestTokens500];
    if (kind === "lifenest_tokens_1000") return [REVENUECAT_DEV_PREFERRED_PRODUCT_IDS.lifeNestTokens1000];
    return [];
  }

  if (Platform.OS === "android") {
    if (kind === "monthly") return [REVENUECAT_ANDROID_LIVE_PREFERRED_PRODUCT_IDS.monthly];
    if (kind === "yearly") return [REVENUECAT_ANDROID_LIVE_PREFERRED_PRODUCT_IDS.yearly];
    if (kind === "remove_ads") return [REVENUECAT_ANDROID_LIVE_PREFERRED_PRODUCT_IDS.removeAds];
    if (kind === "lifenest_tokens_100") return [REVENUECAT_ANDROID_LIVE_PREFERRED_PRODUCT_IDS.lifeNestTokens100];
    if (kind === "lifenest_tokens_500") return [REVENUECAT_ANDROID_LIVE_PREFERRED_PRODUCT_IDS.lifeNestTokens500];
    if (kind === "lifenest_tokens_1000") return [REVENUECAT_ANDROID_LIVE_PREFERRED_PRODUCT_IDS.lifeNestTokens1000];
  }

  return [];
}

export function formatPackagePrice(product: PurchasesStoreProduct) {
  return product.priceString || "See store";
}

/**
 * Resolves a currency code from the saved preferred currency symbol when possible.
 */
export function getCurrencyCodeForSymbol(symbol: string | null | undefined) {
  if (!symbol) return null;
  return CURRENCY_SYMBOL_TO_CODE[symbol] ?? null;
}

/**
 * Infers the device currency from the current locale when the user has not set one explicitly.
 */
function getDeviceCurrencyCodeFromLocale() {
  const locale = Intl.DateTimeFormat().resolvedOptions().locale;
  const countryCode = locale.replace('_', '-').split('-')[1]?.toUpperCase();
  if (!countryCode) return null;
  return COUNTRY_TO_CURRENCY_CODE[countryCode] ?? null;
}

/**
 * Converts one currency amount into another using bundled approximate USD exchange rates.
 */
function convertCurrencyAmount(amount: number, fromCurrencyCode: string, toCurrencyCode: string) {
  const fromRate = APPROX_USD_EXCHANGE_RATES[fromCurrencyCode];
  const toRate = APPROX_USD_EXCHANGE_RATES[toCurrencyCode];
  if (!fromRate || !toRate) return null;
  const amountInUsd = amount * fromRate;
  return amountInUsd / toRate;
}

/**
 * Formats a RevenueCat store product for the user's preferred currency when a known conversion path exists.
 */
export function formatPackagePriceForPreferredCurrency(
  product: PurchasesStoreProduct,
  preferredCurrencySymbol: string | null | undefined
) {
  const billingCurrencyCode = product.currencyCode || "GBP";
  const preferredCurrencyCode = getCurrencyCodeForSymbol(preferredCurrencySymbol) || getDeviceCurrencyCodeFromLocale();

  if (!preferredCurrencyCode) {
    return {
      displayPrice: formatPackagePrice(product),
      billingPrice: formatPackagePrice(product),
      isApproximate: false,
      billingCurrencyCode,
    };
  }

  if (preferredCurrencyCode === billingCurrencyCode) {
    return {
      displayPrice: new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: preferredCurrencyCode,
        maximumFractionDigits: 2,
      }).format(Number(product.price)),
      billingPrice: formatPackagePrice(product),
      isApproximate: false,
      billingCurrencyCode,
    };
  }

  const convertedAmount = convertCurrencyAmount(Number(product.price), billingCurrencyCode, preferredCurrencyCode);
  if (convertedAmount === null) {
    return {
      displayPrice: formatPackagePrice(product),
      billingPrice: formatPackagePrice(product),
      isApproximate: false,
      billingCurrencyCode,
    };
  }

  return {
    displayPrice: `~${new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: preferredCurrencyCode,
      maximumFractionDigits: 2,
    }).format(convertedAmount)}`,
    billingPrice: formatPackagePrice(product),
    isApproximate: true,
    billingCurrencyCode,
  };
}

/**
 * Returns available packages from the Main offering when present, otherwise current offering.
 */
export function getAvailablePackagesForApp(offerings: PurchasesOfferings | null | undefined) {
  if (!offerings) return [] as PurchasesPackage[];
  const orderedOfferings: PurchasesOffering[] = [];
  const seenOfferingIds = new Set<string>();
  const pushOffering = (offering?: PurchasesOffering | null) => {
    if (!offering?.identifier || seenOfferingIds.has(offering.identifier)) return;
    seenOfferingIds.add(offering.identifier);
    orderedOfferings.push(offering);
  };

  pushOffering(offerings.all?.Main);
  pushOffering(offerings.current);
  Object.values(offerings.all ?? {}).forEach((offering) => pushOffering(offering));

  const packages: PurchasesPackage[] = [];
  const seenPackageIds = new Set<string>();
  orderedOfferings.forEach((offering) => {
    offering.availablePackages.forEach((pkg) => {
      if (seenPackageIds.has(pkg.identifier)) return;
      seenPackageIds.add(pkg.identifier);
      packages.push(pkg);
    });
  });

  return packages;
}

/**
 * Finds the first package for a product kind from the available offerings.
 */
export function findPackageByKind(
  offerings: PurchasesOfferings | null | undefined,
  kind: RevenueCatProductKind
) {
  const packages = getAvailablePackagesForApp(offerings);
  const matchingPackages = packages.filter((pkg) => getRevenueCatPackageKind(pkg) === kind);
  if (matchingPackages.length === 0) {
    console.warn("RevenueCat package kind not found", {
      requestedKind: kind,
      offeringIds: Object.keys(offerings?.all ?? {}),
      packages: packages.map((pkg) => ({
        identifier: pkg.identifier,
        productIdentifier: pkg.product.identifier,
        title: pkg.product.title,
        resolvedKind: getRevenueCatPackageKind(pkg),
      })),
    });
    return null;
  }

  const preferredIdentifiers = getPreferredIdentifiersForKind(kind).map((identifier) => normaliseProductIdentifier(identifier));
  matchingPackages.sort((a, b) => {
    const aIdentifier = normaliseProductIdentifier(a.product.identifier);
    const bIdentifier = normaliseProductIdentifier(b.product.identifier);
    const aRank = preferredIdentifiers.indexOf(aIdentifier);
    const bRank = preferredIdentifiers.indexOf(bIdentifier);
    const safeARank = aRank === -1 ? Number.MAX_SAFE_INTEGER : aRank;
    const safeBRank = bRank === -1 ? Number.MAX_SAFE_INTEGER : bRank;
    return safeARank - safeBRank;
  });

  return matchingPackages[0] ?? null;
}

class SubscriptionService {
  private apiKey: string | null = null;

  /**
   * Resolves and caches the RevenueCat SDK key for this device platform.
   */
  private async resolveApiKey() {
    if (this.apiKey) return this.apiKey;
    this.apiKey = await getRevenueCatApiKey();
    return this.apiKey;
  }

  /**
   * Configures the RevenueCat SDK once for native billing platforms.
   */
  async configure(appUserID?: string | null) {
    if (!isNativeBillingPlatform()) return false;

    const apiKey = await this.resolveApiKey();
    validateRevenueCatApiKey(apiKey);

    const isConfigured = await Purchases.isConfigured();
    if (!isConfigured) {

      Purchases.configure({
        apiKey,
        appUserID: appUserID ?? undefined,
        diagnosticsEnabled: __DEV__,
      });
    }

    return true;
  }

  async logIn(appUserID: string) {
    await this.configure();
    const result = await Purchases.logIn(appUserID);
    return result;
  }

  async logOut() {
    if (!isNativeBillingPlatform()) return null;
    const isConfigured = await Purchases.isConfigured();
    if (!isConfigured) return null;
    const result = await Purchases.logOut();
    return result;
  }

  async getCustomerInfo() {
    await this.configure();
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo;
  }

  async getAppUserID() {
    await this.configure();
    const appUserId = await Purchases.getAppUserID();
    return appUserId;
  }

  async getOfferings() {
    await this.configure();
    const offerings = await Purchases.getOfferings();
    return offerings;
  }

  /**
   * Reads the current RevenueCat virtual currencies for the signed-in customer.
   */
  async getVirtualCurrencies() {
    await this.configure();
    return Purchases.getVirtualCurrencies();
  }

  /**
   * Reads the cached RevenueCat virtual currencies when available.
   */
  async getCachedVirtualCurrencies() {
    await this.configure();
    return Purchases.getCachedVirtualCurrencies();
  }

  /**
   * Invalidates the RevenueCat virtual currency cache before a fresh read.
   */
  async invalidateVirtualCurrenciesCache() {
    await this.configure();
    return Purchases.invalidateVirtualCurrenciesCache();
  }

  /**
   * Returns the identified LifeNest token virtual currency balance from RevenueCat.
   */
  async getLifeNestVirtualCurrency() {
    await this.configure();
    const virtualCurrencies = await Purchases.getVirtualCurrencies();
    return resolveLifeNestVirtualCurrency(virtualCurrencies);
  }

  async purchasePackage(pkg: PurchasesPackage) {
    await this.configure();
    return Purchases.purchasePackage(pkg);
  }

  async restorePurchases() {
    await this.configure();
    return Purchases.restorePurchases();
  }

  async syncSubscriberAttributes(options: {
    email?: string | null;
    displayName?: string | null;
    phoneNumber?: string | null;
  }) {
    await this.configure();

    if (options.email) {
      await Purchases.setEmail(options.email);
    }

    if (options.displayName) {
      await Purchases.setDisplayName(options.displayName);
    }

    if (options.phoneNumber) {
      await Purchases.setPhoneNumber(options.phoneNumber);
    }
  }

  async presentPaywall(offering?: PurchasesOffering | null) {
    await this.configure();
    return RevenueCatUI.presentPaywall({
      offering: offering ?? undefined,
      displayCloseButton: true,
    });
  }

  async presentPaywallIfNeeded(offering?: PurchasesOffering | null) {
    await this.configure();
    return RevenueCatUI.presentPaywallIfNeeded({
      offering: offering ?? undefined,
      requiredEntitlementIdentifier: REVENUECAT_ENTITLEMENT_ID,
      displayCloseButton: true,
    });
  }

  async presentCustomerCenter() {
    await this.configure();
    return RevenueCatUI.presentCustomerCenter();
  }

  isSuccessfulPaywallResult(result: PAYWALL_RESULT) {
    return (
      result === PAYWALL_RESULT.PURCHASED ||
      result === PAYWALL_RESULT.RESTORED
    );
  }
}

export const subscriptionService = new SubscriptionService();
