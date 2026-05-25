export const REVENUECAT_ENTITLEMENT_ID = "Productivity Mobile App Pro";

export const REVENUECAT_PRODUCT_IDS = {
  monthly: "monthly",
  yearly: "yearly",
  testMonthlyMay2026: "monthly_may2026",
  testYearlyMay2026: "yearly_may2026",
  removeAds: "removeads",
  removeAdsTest: "removeads_test",
  lifeNestTokens100: "lifenest_tokens_100",
  lifeNestTokens500: "lifenest_tokens_500",
  googlePlayLifeNestTokens500: "lifenest_token_500",
  lifeNestTokens1000: "lifenest_tokens_1000",
  googlePlayMonthly: "pro_monthly:p1m",
  googlePlayYearly: "pro_yearly:p1y",
} as const;

export const REVENUECAT_DEV_PREFERRED_PRODUCT_IDS = {
  monthly: REVENUECAT_PRODUCT_IDS.testMonthlyMay2026,
  yearly: REVENUECAT_PRODUCT_IDS.testYearlyMay2026,
  removeAds: REVENUECAT_PRODUCT_IDS.removeAdsTest,
  lifeNestTokens100: REVENUECAT_PRODUCT_IDS.lifeNestTokens100,
  lifeNestTokens500: REVENUECAT_PRODUCT_IDS.lifeNestTokens500,
  lifeNestTokens1000: REVENUECAT_PRODUCT_IDS.lifeNestTokens1000,
} as const;

export const REVENUECAT_ANDROID_LIVE_PREFERRED_PRODUCT_IDS = {
  monthly: REVENUECAT_PRODUCT_IDS.googlePlayMonthly,
  yearly: REVENUECAT_PRODUCT_IDS.googlePlayYearly,
  removeAds: REVENUECAT_PRODUCT_IDS.removeAds,
  lifeNestTokens100: REVENUECAT_PRODUCT_IDS.lifeNestTokens100,
  lifeNestTokens500: REVENUECAT_PRODUCT_IDS.googlePlayLifeNestTokens500,
  lifeNestTokens1000: REVENUECAT_PRODUCT_IDS.lifeNestTokens1000,
} as const;

export type RevenueCatProductId =
  (typeof REVENUECAT_PRODUCT_IDS)[keyof typeof REVENUECAT_PRODUCT_IDS];

export const REVENUECAT_PRODUCT_LABELS: Record<RevenueCatProductId, string> = {
  monthly: "Monthly",
  yearly: "Yearly",
  monthly_may2026: "Monthly",
  yearly_may2026: "Yearly",
  removeads: "Remove Ads",
  removeads_test: "Remove Ads (Test)",
  lifenest_tokens_100: "100 LifeNest Tokens",
  lifenest_tokens_500: "500 LifeNest Tokens",
  lifenest_token_500: "500 LifeNest Tokens",
  lifenest_tokens_1000: "1000 LifeNest Tokens",
  "pro_monthly:p1m": "Monthly",
  "pro_yearly:p1y": "Yearly",
};

export const MONTHLY_PRODUCT_IDENTIFIERS = [
  REVENUECAT_PRODUCT_IDS.monthly,
  REVENUECAT_PRODUCT_IDS.testMonthlyMay2026,
  REVENUECAT_PRODUCT_IDS.googlePlayMonthly,
] as const;

export const YEARLY_PRODUCT_IDENTIFIERS = [
  REVENUECAT_PRODUCT_IDS.yearly,
  REVENUECAT_PRODUCT_IDS.testYearlyMay2026,
  REVENUECAT_PRODUCT_IDS.googlePlayYearly,
] as const;

export const REMOVE_ADS_PRODUCT_IDENTIFIERS = [
  REVENUECAT_PRODUCT_IDS.removeAds,
  REVENUECAT_PRODUCT_IDS.removeAdsTest,
] as const;

export const LIFENEST_TOKEN_100_PRODUCT_IDENTIFIERS = [
  REVENUECAT_PRODUCT_IDS.lifeNestTokens100,
] as const;

export const LIFENEST_TOKEN_500_PRODUCT_IDENTIFIERS = [
  REVENUECAT_PRODUCT_IDS.lifeNestTokens500,
  REVENUECAT_PRODUCT_IDS.googlePlayLifeNestTokens500,
] as const;

export const LIFENEST_TOKEN_1000_PRODUCT_IDENTIFIERS = [
  REVENUECAT_PRODUCT_IDS.lifeNestTokens1000,
] as const;
