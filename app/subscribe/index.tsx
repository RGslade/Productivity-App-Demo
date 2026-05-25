import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { PurchasesPackage } from "react-native-purchases";

import { showGlobalInterstitialAd } from "@/components/AdDisplay";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DEFAULT_CURRENCY_SYMBOL } from "@/constants/CurrencySymbols";
import { REVENUECAT_PRODUCT_LABELS } from "@/constants/subscription";
import { useTransactionSettings } from "@/hooks/useSettings";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { useThemeColour } from "@/hooks/useThemeColour";
import { lifeNestService } from "@/services/lifeNestService";
import {
  deriveSubscriptionProfile,
  findPackageByKind,
  formatPackagePriceForPreferredCurrency,
  getPackageDisplayLabel,
  getLifeNestTokenAmountForProductKind,
  getRevenueCatPackageKind,
} from "@/services/subscriptionService";
import { LifeNestMonthlyUsageSummary } from "@/types/chatBot";

type BusyAction =
  | "restore"
  | "customer-center"
  | `purchase:${string}`
  | null;

/** Resolves the app product kind from a RevenueCat package. */
function getPackageKind(pkg: PurchasesPackage) {
  const packageType = String((pkg as { packageType?: string }).packageType ?? "").toLowerCase();
  if (packageType.includes("annual")) return "yearly";
  if (packageType.includes("month")) return "monthly";
  return getRevenueCatPackageKind(pkg);
}

/** Returns true when an error came from missing or invalid RevenueCat configuration. */
function isRevenueCatConfigError(message: string) {
  return (
    message.includes("REVENUECAT_API_KEY_MISSING") ||
    message.includes("REVENUECAT_CONFIG_FETCH_FAILED") ||
    message.includes("REVENUECAT_API_KEY_PLATFORM_MISMATCH") ||
    message.includes("REVENUECAT_API_KEY_TEST_KEY_IN_PRODUCTION")
  );
}

/** Converts a RevenueCat config error into user-facing guidance. */
function getRevenueCatConfigMessage(message: string) {
  if (message.includes("REVENUECAT_API_KEY_MISSING")) {
    return __DEV__
      ? "RevenueCat is missing. Add the local development SDK key or configure server-side billing secrets."
      : "RevenueCat is missing from server-side billing configuration.";
  }

  if (message.includes("REVENUECAT_API_KEY_PLATFORM_MISMATCH")) {
    return "The RevenueCat SDK key does not match this device platform. Check the local development key or server-side billing secrets.";
  }

  if (message.includes("REVENUECAT_API_KEY_TEST_KEY_IN_PRODUCTION")) {
    return "A RevenueCat test key was returned in a production build. Check server-side billing secrets.";
  }

  return "RevenueCat config could not be loaded. Check the local development key or server-side billing configuration.";
}

export default function SubscribeScreen() {
  const router = useRouter();
  const surface = useThemeColour({}, "surface");
  const cardBackground = useThemeColour({}, "cardBackground");
  const primary = useThemeColour({}, "primary");
  const warning = useThemeColour({}, "warning");
  const border = useThemeColour({}, "border");
  const success = useThemeColour({}, "success");
  const { data: transactionSettings } = useTransactionSettings();
  const preferredCurrencySymbol = transactionSettings?.preferred_currency || DEFAULT_CURRENCY_SYMBOL;

  const {
    isConfigured,
    configurationError,
    isSupported,
    customerInfo,
    offerings,
    lifeNestTokenBalance,
    purchasePackage,
    restorePurchases,
    refreshCustomerInfo,
    refreshOfferings,
    refreshVirtualCurrencies,
    presentCustomerCenter,
  } = useSubscriptions();

  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [lifeNestUsage, setLifeNestUsage] = useState<LifeNestMonthlyUsageSummary | null>(null);
  const busyActionRef = useRef<BusyAction>(null);
  const initialOfferingsRetryRef = useRef(false);
  const hasShownEntryInterstitialRef = useRef(false);

  const monthlyPackage = useMemo(() => findPackageByKind(offerings, "monthly"), [offerings]);
  const yearlyPackage = useMemo(() => findPackageByKind(offerings, "yearly"), [offerings]);
  const token100Package = useMemo(() => findPackageByKind(offerings, "lifenest_tokens_100"), [offerings]);
  const token500Package = useMemo(() => findPackageByKind(offerings, "lifenest_tokens_500"), [offerings]);
  const token1000Package = useMemo(() => findPackageByKind(offerings, "lifenest_tokens_1000"), [offerings]);

  const planPackages = useMemo(
    () => [yearlyPackage, monthlyPackage].filter(Boolean) as PurchasesPackage[],
    [monthlyPackage, yearlyPackage]
  );
  const tokenPackages = useMemo(
    () => [token100Package, token500Package, token1000Package].filter(Boolean) as PurchasesPackage[],
    [token100Package, token500Package, token1000Package]
  );
  const isPremiumSubscriber = deriveSubscriptionProfile(customerInfo).isPremium;
  const remainingIncludedTokens = Math.max(
    (lifeNestUsage?.monthlyTokenAllowance ?? 0) - (lifeNestUsage?.monthlyTokensUsed ?? 0),
    0
  );
  const availablePurchasedTokens = lifeNestUsage?.purchasedTokensBalance ?? lifeNestTokenBalance;

  useEffect(() => {
    if (hasShownEntryInterstitialRef.current) return;
    hasShownEntryInterstitialRef.current = true;

    if (!customerInfo) {
      showGlobalInterstitialAd();
      return;
    }

    const profile = deriveSubscriptionProfile(customerInfo);
    if (!profile.isAdFree) {
      showGlobalInterstitialAd();
    }
  }, [customerInfo]);

  useEffect(() => {
    if (planPackages.length === 0) {
      setSelectedPackageId(null);
      return;
    }
    const hasCurrentSelection = selectedPackageId && planPackages.some((pkg) => pkg.identifier === selectedPackageId);
    if (hasCurrentSelection) return;
    setSelectedPackageId(planPackages[0].identifier);
  }, [planPackages, selectedPackageId]);

  useFocusEffect(
    React.useCallback(() => {
      if (!isConfigured) return;
      void Promise.allSettled([refreshCustomerInfo(), refreshOfferings()]);
      void lifeNestService.getCurrentMonthlyUsageSummary()
        .then((summary) => setLifeNestUsage(summary))
        .catch((error) => console.error('Operation failed'));
    }, [isConfigured, refreshCustomerInfo, refreshOfferings])
  );

  useEffect(() => {
    if (!isConfigured) {
      initialOfferingsRetryRef.current = false;
      return;
    }
    if (planPackages.length > 0) return;
    if (busyAction) return;
    if (initialOfferingsRetryRef.current) return;

    initialOfferingsRetryRef.current = true;
    void Promise.allSettled([refreshCustomerInfo(), refreshOfferings()]);
  }, [busyAction, isConfigured, planPackages.length, refreshCustomerInfo, refreshOfferings]);

  const selectedPackage =
    planPackages.find((pkg) => pkg.identifier === selectedPackageId) ?? planPackages[0] ?? null;

  const selectedKind = selectedPackage ? getPackageKind(selectedPackage) : null;

  const savingsPercent = useMemo(() => {
    if (!monthlyPackage || !yearlyPackage) return null;
    const monthlyTotal = Number(monthlyPackage.product.price) * 12;
    const yearlyTotal = Number(yearlyPackage.product.price);
    if (!monthlyTotal || Number.isNaN(monthlyTotal) || Number.isNaN(yearlyTotal) || yearlyTotal >= monthlyTotal) {
      return null;
    }
    return Math.round(((monthlyTotal - yearlyTotal) / monthlyTotal) * 100);
  }, [monthlyPackage, yearlyPackage]);

  const yearlyMonthlyEquivalent = useMemo(() => {
    if (!yearlyPackage) return null;
    const monthlyEquivalentProduct = {
      ...yearlyPackage.product,
      price: Number(yearlyPackage.product.price) / 12,
      priceString: "",
    };
    return formatPackagePriceForPreferredCurrency(monthlyEquivalentProduct, preferredCurrencySymbol).displayPrice;
  }, [preferredCurrencySymbol, yearlyPackage]);

  const showManageButton = Boolean(
    deriveSubscriptionProfile(customerInfo).managementUrl ||
    deriveSubscriptionProfile(customerInfo).isPremium ||
    deriveSubscriptionProfile(customerInfo).status === "cancelled"
  );

  /** Shows a consistent alert when the store is blocked or billing is unavailable. */
  const handleBlockedPurchasesAlert = () => {
    if (configurationError) {
      Alert.alert("Purchases unavailable", getRevenueCatConfigMessage(configurationError));
      return;
    }

    Alert.alert(
      "Purchases unavailable",
      "Purchases are currently blocked for this device or account. Check store billing permissions and try again."
    );
  };

  /** Normalises purchase-related errors into user-facing alerts. */
  const handleError = (error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown error";
    const lower = message.toLowerCase();

    if (isRevenueCatConfigError(message)) {
      Alert.alert("RevenueCat config missing", getRevenueCatConfigMessage(message));
      return;
    }

    if (
      lower.includes("purchase_not_allowed") ||
      lower.includes("billing unavailable") ||
      lower.includes("billing_unavailable") ||
      lower.includes("not allowed") ||
      lower.includes("blocked")
    ) {
      handleBlockedPurchasesAlert();
      return;
    }

    if (lower.includes("cancel")) {
      return;
    }

    Alert.alert("Subscription error", message);
  };

  /** Wraps one async subscribe action with shared loading and error handling. */
  const runAction = async (action: BusyAction, task: () => Promise<void>) => {
    if (busyActionRef.current) return;

    try {
      busyActionRef.current = action;
      setBusyAction(action);
      await task();
    } catch (error) {
      console.error('Operation failed');
      handleError(error);
    } finally {
      busyActionRef.current = null;
      setBusyAction(null);
    }
  };

  /** Starts the purchase flow for the currently selected package. */
  const handlePurchaseSelection = async () => {
    if (!selectedPackage) {
      Alert.alert("No option selected", "Choose a subscription option first.");
      return;
    }

    if (!isConfigured) {
      handleBlockedPurchasesAlert();
      return;
    }

    await runAction(`purchase:${selectedPackage.identifier}`, async () => {
      const { identifier } = selectedPackage;
      const purchasedCustomerInfo = await purchasePackage(selectedPackage);
      const profile = deriveSubscriptionProfile(purchasedCustomerInfo);
      const purchaseTitle = profile.isAdFree ? "Purchase successful" : "Purchase complete";
      const purchaseMessage = profile.isAdFree
        ? "Your purchase is now active."
        : "Purchase was completed but not active yet. Check RevenueCat mapping.";
      await refreshPurchaseState();
      acknowledgePurchase(purchaseTitle, purchaseMessage, () => {
        setSelectedPackageId(identifier);
      });
    });
  };

  /** Starts the purchase flow for one LifeNest token bundle. */
  const handleTokenPurchase = async (pkg: PurchasesPackage) => {
    if (!isConfigured) {
      handleBlockedPurchasesAlert();
      return;
    }

    await runAction(`purchase:${pkg.identifier}`, async () => {
      const kind = getPackageKind(pkg);
      const tokenAmount = getLifeNestTokenAmountForProductKind(kind);
      if (tokenAmount <= 0) {
        throw new Error(`Unable to determine token amount for package ${pkg.product.identifier}.`);
      }
      await purchasePackage(pkg);
      const summary = await refreshPurchaseState();
      acknowledgePurchase(
        "Tokens added",
        `${tokenAmount} LifeNest tokens were added to your account. You now have ${summary.totalTokensRemaining} available.`,
      );
    });
  };

  /** Restores store purchases onto the current account. */
  const handleRestore = async () => {
    await runAction("restore", async () => {
      const restoredCustomerInfo = await restorePurchases();
      const profile = deriveSubscriptionProfile(restoredCustomerInfo);
      await lifeNestService.syncSubscriptionUsagePeriod({
        isSubscriptionActive: profile.isPremium && profile.status === "active",
        subscriptionStartedAt: profile.subscriptionStartedAt,
      });
      const summary = await lifeNestService.getCurrentMonthlyUsageSummary();
      setLifeNestUsage(summary);
      Alert.alert(
        profile.isAdFree ? "Purchases restored" : "Nothing to restore",
        profile.isAdFree
          ? "Your subscriptions or non-consumable purchases were restored successfully for this account."
          : "No active subscription or non-consumable purchase was found for this store account. LifeNest token balances are synced to your signed-in account and do not need store restore."
      );
    });
  };

  /** Opens RevenueCat customer center for subscription management. */
  const handleCustomerCenter = async () => {
    await runAction("customer-center", async () => {
      await presentCustomerCenter();
      await refreshPurchaseState();
    });
  };

  /** Refreshes RevenueCat and LifeNest state after a purchase-related change. */
  const refreshPurchaseState = async () => {
    const [customerInfoResult] = await Promise.allSettled([
      refreshCustomerInfo(),
      refreshOfferings(),
      refreshVirtualCurrencies(),
    ]);

    if (customerInfoResult.status === "fulfilled" && customerInfoResult.value) {
      const profile = deriveSubscriptionProfile(customerInfoResult.value);
      await lifeNestService.syncSubscriptionUsagePeriod({
        isSubscriptionActive: profile.isPremium && profile.status === "active",
        subscriptionStartedAt: profile.subscriptionStartedAt,
      });
    }

    const summary = await lifeNestService.getCurrentMonthlyUsageSummary();
    setLifeNestUsage(summary);
    return summary;
  };

  /** Shows purchase confirmation and returns the user to the previous screen when possible. */
  const acknowledgePurchase = (
    title: string,
    message: string,
    onBeforeNavigate?: () => void,
  ) => {
    Alert.alert(title, message, [
      {
        text: "OK",
        onPress: () => {
          try {
            onBeforeNavigate?.();
            if (router.canGoBack()) {
              router.back();
              return;
            }
            router.replace("/(tabs)");
          } catch (navigationError) {
            console.error('Purchase acknowledgement navigation failed', navigationError);
          }
        },
      },
    ]);
  };

  /** Chooses the CTA copy for the currently highlighted plan. */
  const getPrimaryButtonLabel = () => {
    if (selectedKind === "monthly") return "Choose Monthly";
    if (selectedKind === "yearly") return "Choose Yearly";
    return "Choose option";
  };

  const premiumBenefits = [
    {
      title: "LifeNest AI assistant access",
      description: "Unlock the in-app planning assistant for independence, budgeting, routines, and next-step support.",
    },
    {
      title: "Premium task categories",
      description: "Use premium checklist groups, including the Moving Out workflow, to keep multi-step preparation organised.",
    },
    {
      title: "Dashboard customisation",
      description: "Reorder, hide, and restore dashboard cards so the home screen reflects the parts of the app you use most.",
    },
    {
      title: "Ad-free experience",
      description: "Active Pro entitlement removes ads while your subscription stays active and synced to this account.",
    },
  ];

  if (!isSupported) {
    return (
      <View style={styles.unsupportedContainer}>
        <ThemedText type="title">LifeNest Premium</ThemedText>
        <ThemedText style={styles.description}>
          Subscriptions are only available on iOS and Android builds.
        </ThemedText>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <ThemedText type="title">{isPremiumSubscriber ? "Get Tokens" : "Choose your plan"}</ThemedText>
      </View>

      {!isConfigured && (
        <Card style={[styles.warningCard, { borderColor: warning }]}>
          <ThemedText type="subtitle">Purchases unavailable</ThemedText>
          <ThemedText style={styles.description}>
            {configurationError
              ? getRevenueCatConfigMessage(configurationError)
              : "RevenueCat is blocked or unavailable for this session. Subscriptions cannot be started right now."}
          </ThemedText>
        </Card>
      )}

      {!isPremiumSubscriber && (
      <Card style={[styles.planSection, { backgroundColor: surface, borderColor: border }]}>
        <View style={styles.planList}>
          {planPackages.length > 0 ? (
            planPackages.map((pkg) => {
              const kind = getPackageKind(pkg);
              const isSelected = pkg.identifier === selectedPackageId;
              const isYearly = kind === "yearly";
              const productLabel =
                kind === "yearly"
                  ? REVENUECAT_PRODUCT_LABELS.yearly
                  : kind === "monthly"
                    ? REVENUECAT_PRODUCT_LABELS.monthly
                    : "Remove Ads";
              const pricing = formatPackagePriceForPreferredCurrency(pkg.product, preferredCurrencySymbol);

              return (
                <TouchableOpacity
                  key={pkg.identifier}
                  activeOpacity={0.9}
                  style={[
                    styles.planCard,
                    {
                      borderColor: isSelected ? primary : border,
                      backgroundColor: isSelected ? `${primary}14` : cardBackground,
                    },
                  ]}
                  onPress={() => setSelectedPackageId(pkg.identifier)}
                >
                  <View style={styles.planHeader}>
                    <View>
                      <ThemedText type="subtitle">{productLabel}</ThemedText>
                      <ThemedText style={styles.planPrice}>{pricing.displayPrice}</ThemedText>
                    </View>
                    {isYearly ? (
                      <View style={[styles.valuePill, { backgroundColor: `${success}22` }]}>
                        <ThemedText style={[styles.valuePillText, { color: success }]}>Best value</ThemedText>
                      </View>
                    ) : null}
                  </View>
                  {isYearly && savingsPercent && yearlyMonthlyEquivalent ? (
                    <ThemedText style={[styles.savingsCaption, { color: success }]}>
                      {`Save ${savingsPercent}% ${yearlyMonthlyEquivalent}/month`}
                    </ThemedText>
                  ) : (
                    <ThemedText style={styles.planMeta}>{getPackageDisplayLabel(pkg)}</ThemedText>
                  )}
                  {pricing.isApproximate ? (
                    <ThemedText style={styles.billingMeta}>
                      {`Billed by the store as ${pricing.billingPrice} (${pricing.billingCurrencyCode}).`}
                    </ThemedText>
                  ) : null}
                </TouchableOpacity>
              );
            })
          ) : (
            <Card style={styles.packageFallbackCard}>
              <ThemedText type="subtitle">Products not loaded</ThemedText>
              <ThemedText style={styles.description}>
                No purchasable products were returned. Check RevenueCat offering and store product setup.
              </ThemedText>
            </Card>
          )}
        </View>

        <View style={styles.ctaStack}>
          <Button
            title={getPrimaryButtonLabel()}
            onPress={handlePurchaseSelection}
            loading={selectedPackage ? busyAction === `purchase:${selectedPackage.identifier}` : false}
            disabled={!selectedPackage || Boolean(busyAction)}
          />
          <View style={styles.secondaryActions}>
            <Button
              title={busyAction === "restore" ? "Restoring..." : "Restore purchases"}
              onPress={handleRestore}
              variant="secondary"
              loading={busyAction === "restore"}
              disabled={!isConfigured || Boolean(busyAction)}
            />
            {showManageButton ? (
              <Button
                title={busyAction === "customer-center" ? "Opening..." : "Manage subscription"}
                onPress={handleCustomerCenter}
                variant="secondary"
                loading={busyAction === "customer-center"}
                disabled={!isConfigured || Boolean(busyAction)}
              />
            ) : null}
          </View>
        </View>
      </Card>
      )}

      {!isPremiumSubscriber && (
      <Card style={styles.benefitsCard}>
        <ThemedText type="subtitle">Included with premium</ThemedText>
        {premiumBenefits.map((benefit) => (
          <View key={benefit.title} style={styles.benefitRow}>
            <View style={[styles.benefitDot, { backgroundColor: primary }]} />
            <View style={styles.benefitCopy}>
              <ThemedText style={styles.benefitTitle}>{benefit.title}</ThemedText>
              <ThemedText style={styles.benefitText}>{benefit.description}</ThemedText>
            </View>
          </View>
        ))}
      </Card>
      )}

      <Card style={styles.benefitsCard}>
          <ThemedText type="subtitle">Get additional LifeNest tokens</ThemedText>
          <ThemedText style={styles.description}>
            Monthly premium includes 500 LifeNest tokens. Extra token bundles carry over until used.
          </ThemedText>
          <ThemedText style={styles.description}>
            {`Available now: ${lifeNestUsage?.totalTokensRemaining ?? 0} tokens`}
          </ThemedText>
          <ThemedText style={styles.description}>
            {isPremiumSubscriber
              ? `Included monthly remaining: ${remainingIncludedTokens} • Extra purchased balance: ${availablePurchasedTokens}`
              : `Extra purchased balance: ${availablePurchasedTokens}`}
          </ThemedText>
          {tokenPackages.length > 0 ? (
            <View style={styles.planList}>
              {tokenPackages.map((pkg) => {
                const kind = getPackageKind(pkg);
                const tokenAmount = getLifeNestTokenAmountForProductKind(kind);
                const pricing = formatPackagePriceForPreferredCurrency(pkg.product, preferredCurrencySymbol);

                return (
                  <Card key={pkg.identifier} style={styles.tokenCard}>
                    <View style={styles.planHeader}>
                      <View>
                        <ThemedText type="subtitle">{`${tokenAmount} LifeNest tokens`}</ThemedText>
                        <ThemedText style={styles.planPrice}>{pricing.displayPrice}</ThemedText>
                        <ThemedText style={styles.planMeta}>
                          {`Adds ${tokenAmount} extra tokens to your carry-over balance.`}
                        </ThemedText>
                      </View>
                    </View>
                    {pricing.isApproximate ? (
                      <ThemedText style={styles.billingMeta}>
                        {`Billed by the store as ${pricing.billingPrice} (${pricing.billingCurrencyCode}).`}
                      </ThemedText>
                    ) : null}
                    <Button
                      title={`Buy ${tokenAmount} tokens`}
                      onPress={() => handleTokenPurchase(pkg)}
                      loading={busyAction === `purchase:${pkg.identifier}`}
                      disabled={!isConfigured || Boolean(busyAction)}
                    />
                  </Card>
                );
              })}
            </View>
          ) : (
            <ThemedText style={styles.description}>
              Extra token products are not loaded. Add them to your RevenueCat offering after creating the store products.
            </ThemedText>
          )}
          {isPremiumSubscriber ? (
            <View style={styles.secondaryActions}>
              <Button
                title={busyAction === "restore" ? "Restoring..." : "Restore purchases"}
                onPress={handleRestore}
                variant="secondary"
                loading={busyAction === "restore"}
                disabled={!isConfigured || Boolean(busyAction)}
              />
            </View>
          ) : null}
        </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 20,
  },
  unsupportedContainer: {
    flex: 1,
    padding: 20,
    gap: 12,
  },
  hero: {
    gap: 4,
  },
  description: {
    opacity: 0.82,
    lineHeight: 20,
  },
  warningCard: {
    gap: 8,
    borderWidth: 1,
  },
  planSection: {
    gap: 18,
  },
  planList: {
    gap: 14,
    marginBottom: 18,
  },
  planCard: {
    borderWidth: 1.5,
    borderRadius: 18,
    padding: 16,
    gap: 10,
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  planPrice: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: "700",
  },
  planMeta: {
    fontSize: 13,
    opacity: 0.8,
  },
  billingMeta: {
    fontSize: 12,
    opacity: 0.72,
    lineHeight: 18,
  },
  valuePill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  valuePillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  savingsCaption: {
    fontSize: 13,
    fontWeight: "600",
  },
  ctaStack: {
    gap: 12,
    marginTop: 6,
  },
  secondaryActions: {
    gap: 10,
  },
  packageFallbackCard: {
    gap: 10,
  },
  benefitsCard: {
    gap: 16,
    padding: 20,
  },
  tokenCard: {
    gap: 12,
    padding: 16,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  benefitDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginTop: 8,
  },
  benefitCopy: {
    flex: 1,
    gap: 4,
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  benefitText: {
    lineHeight: 20,
    opacity: 0.84,
  },
});


