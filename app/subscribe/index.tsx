import { TrackedTouchableOpacity as TouchableOpacity } from '@/components/ui/TrackedTouchableOpacity';
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Linking, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import type { PurchasesPackage } from "react-native-purchases";

import { showGlobalInterstitialAd } from "@/components/AdDisplay";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DEFAULT_CURRENCY_SYMBOL } from "@/constants/CurrencySymbols";
import { PROJECT_SUPPORT_EMAIL } from "@/constants/ProjectInfo";
import { REVENUECAT_PRODUCT_LABELS } from "@/constants/subscription";
import { buildRevenueCatWebPurchaseLinkUrl } from "@/constants/RevenueCatWebPurchaseLinks";
import { useAuth } from "@/hooks/useAuth";
import { showAlert } from "@/hooks/dataHandler";
import { useTransactionSettings } from "@/hooks/useSettings";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { useThemeColour } from "@/hooks/useThemeColour";
import { addCrashBreadcrumb, logError } from "@/services/crashLogger";
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

type BusyAction = | "restore" | "refresh" | "customer-center" | `purchase:${string}` | null;

type PendingWebCheckout = {
  productKind: string;
  packageId: string;
  expectedTokens: number;
  startedPurchasedTokens: number;
  openedAt: string;
};

type CheckoutNotice = {
  tone: "info" | "success" | "warning";
  title: string;
  message: string;
};

const PENDING_WEB_CHECKOUT_KEY = "productivityapp.pendingWebCheckout";

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
    message.includes("REVENUECAT_WEB_API_KEY_MISSING") ||
    message.includes("REVENUECAT_CONFIG_FETCH_FAILED") ||
    message.includes("REVENUECAT_API_KEY_PLATFORM_MISMATCH") ||
    message.includes("REVENUECAT_WEB_API_KEY_PLATFORM_MISMATCH") ||
    message.includes("REVENUECAT_API_KEY_TEST_KEY_IN_PRODUCTION")
  );
}

/** Returns customer-facing purchase outage guidance without exposing provider details. */
function getPurchaseUnavailableMessage() {
  return `Purchases are temporarily unavailable. Please try again later. If this keeps happening, contact support at ${PROJECT_SUPPORT_EMAIL}.`;
}

/** Waits briefly between purchase-state polling attempts. */
function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Reads a successful or failed web checkout return marker from query params. */
function readWebCheckoutReturnStatus(params: {
  stripe_checkout?: string | string[];
  revenuecat_checkout?: string | string[];
  payment?: string | string[];
  checkout?: string | string[];
  redirect_status?: string | string[];
}) {
  const values = [params.revenuecat_checkout, params.stripe_checkout, params.payment, params.checkout, params.redirect_status]
    .map((value) => Array.isArray(value) ? value[0] : value)
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  if (values.some((value) => ["success", "complete", "completed", "succeeded", "paid"].includes(value))) return "success";
  if (values.some((value) => ["cancel", "cancelled", "canceled"].includes(value))) return "cancelled";
  if (values.some((value) => ["failed", "failure"].includes(value))) return "failed";
  return null;
}

/** Stores a pending web checkout in browser storage only. */
function writePendingWebCheckout(value: PendingWebCheckout) {
  if (Platform.OS !== "web" || typeof window === "undefined") return;
  window.localStorage.setItem(PENDING_WEB_CHECKOUT_KEY, JSON.stringify(value));
}

/** Reads a pending web checkout from browser storage. */
function readPendingWebCheckout(): PendingWebCheckout | null {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  const rawValue = window.localStorage.getItem(PENDING_WEB_CHECKOUT_KEY);
  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue) as PendingWebCheckout;
    if (!parsed.productKind || !parsed.openedAt) return null;
    return {
      productKind: parsed.productKind,
      packageId: parsed.packageId ?? "",
      expectedTokens: Number(parsed.expectedTokens ?? 0),
      startedPurchasedTokens: Number(parsed.startedPurchasedTokens ?? 0),
      openedAt: parsed.openedAt,
    };
  } catch (error) {
    logError("SubscribeScreen.readPendingWebCheckout", error);
    return null;
  }
}

/** Clears the local pending web checkout marker. */
function clearPendingWebCheckout() {
  if (Platform.OS !== "web" || typeof window === "undefined") return;
  window.localStorage.removeItem(PENDING_WEB_CHECKOUT_KEY);
}

export default function SubscribeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    stripe_checkout?: string;
    revenuecat_checkout?: string;
    payment?: string;
    checkout?: string;
    redirect_status?: string;
    app_user_id?: string;
  }>();
  const surface = useThemeColour({}, "surface");
  const cardBackground = useThemeColour({}, "cardBackground");
  const primary = useThemeColour({}, "primary");
  const warning = useThemeColour({}, "warning");
  const border = useThemeColour({}, "border");
  const success = useThemeColour({}, "success");
  const { data: transactionSettings } = useTransactionSettings();
  const preferredCurrencySymbol = transactionSettings?.preferred_currency || DEFAULT_CURRENCY_SYMBOL;
  const { user, userInfo } = useAuth();

  const {
    isConfigured,
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
  const [checkoutNotice, setCheckoutNotice] = useState<CheckoutNotice | null>(null);
  const busyActionRef = useRef<BusyAction>(null);
  const initialOfferingsRetryRef = useRef(false);
  const hasShownEntryInterstitialRef = useRef(false);
  const hasHandledWebCheckoutReturnRef = useRef(false);
  const webCheckoutCheckInFlightRef = useRef(false);
  const lastWebCheckoutCheckAtRef = useRef(0);

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
  const availableLifeNestTokens = lifeNestUsage?.totalTokensRemaining ?? lifeNestTokenBalance;
  const checkoutEmail = userInfo?.email_address || user?.email || null;
  const appUserId = user?.id ?? null;

  /** Refreshes RevenueCat and LifeNest state after a purchase-related change. */
  const refreshPurchaseState = useCallback(async () => {
    const [customerInfoResult] = await Promise.allSettled([
      refreshCustomerInfo(),
      refreshOfferings(),
      refreshVirtualCurrencies(),
    ]);

    if (customerInfoResult.status === "fulfilled" && customerInfoResult.value) {
      const profile = deriveSubscriptionProfile(customerInfoResult.value);
      await lifeNestService.syncSubscriptionUsagePeriod({
        isSubscriptionActive: profile.isPremium,
        subscriptionStartedAt: profile.subscriptionStartedAt,
      });
    }

    const summary = await lifeNestService.getCurrentMonthlyUsageSummary();
    setLifeNestUsage(summary);
    return summary;
  }, [refreshCustomerInfo, refreshOfferings, refreshVirtualCurrencies]);

  /** Polls provider-backed state after returning from web checkout. */
  const confirmWebCheckoutReturn = useCallback(async (pendingCheckout: PendingWebCheckout | null) => {
    let latestSummary: LifeNestMonthlyUsageSummary | null = null;
    let confirmed = false;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      if (attempt > 0) {
        await wait(2200);
      }

      latestSummary = await refreshPurchaseState();
      const refreshedCustomerInfo = await refreshCustomerInfo();
      const profile = deriveSubscriptionProfile(refreshedCustomerInfo);
      const expectedTokens = pendingCheckout?.expectedTokens ?? 0;
      const startedTokens = pendingCheckout?.startedPurchasedTokens ?? availableLifeNestTokens;
      const hasExpectedTokens = expectedTokens > 0 && latestSummary.totalTokensRemaining >= startedTokens + expectedTokens;
      const hasSubscriptionOrAdFree = expectedTokens === 0 && profile.isAdFree;
      confirmed = hasExpectedTokens || hasSubscriptionOrAdFree;

      if (confirmed) break;
    }

    if (confirmed) {
      clearPendingWebCheckout();
      setCheckoutNotice({
        tone: "success",
        title: "Purchase synced",
        message: latestSummary
          ? `Your account is updated. You now have ${latestSummary.totalTokensRemaining} LifeNest tokens available.`
          : "Your account is updated.",
      });
      return true;
    }

    setCheckoutNotice({
      tone: "warning",
      title: "Purchase still syncing",
      message: `Your payment may still be syncing. Do not pay again yet. Use Check purchase, or contact support at ${PROJECT_SUPPORT_EMAIL} if it does not appear soon.`,
    });
    return false;
  }, [availableLifeNestTokens, refreshCustomerInfo, refreshPurchaseState]);

  /** Checks a pending web checkout only after the user has had time to complete the hosted flow. */
  const requestPendingWebCheckoutCheck = useCallback((reason: string) => {
    if (Platform.OS !== "web" || !isConfigured) return;
    const pendingCheckout = readPendingWebCheckout();
    if (!pendingCheckout || webCheckoutCheckInFlightRef.current) return;

    const pendingOpenedAt = new Date(pendingCheckout.openedAt).getTime();
    if (!Number.isFinite(pendingOpenedAt) || Date.now() - pendingOpenedAt <= 3000) return;

    const now = Date.now();
    if (now - lastWebCheckoutCheckAtRef.current < 5000) return;
    lastWebCheckoutCheckAtRef.current = now;
    webCheckoutCheckInFlightRef.current = true;

    addCrashBreadcrumb("subscribe_web_checkout_pending_check", {
      reason,
      productKind: pendingCheckout.productKind,
      packageId: pendingCheckout.packageId,
      expectedTokens: pendingCheckout.expectedTokens,
    }, "/subscribe");

    setCheckoutNotice({
      tone: "info",
      title: "Checking your purchase",
      message: "We are checking your account now. If your purchase does not appear shortly, use Check purchase.",
    });

    void confirmWebCheckoutReturn(pendingCheckout)
      .finally(() => {
        webCheckoutCheckInFlightRef.current = false;
      });
  }, [confirmWebCheckoutReturn, isConfigured]);

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
    useCallback(() => {
      addCrashBreadcrumb("subscribe_screen_focus", undefined, "/subscribe");
      if (!isConfigured) return;
      void Promise.allSettled([refreshCustomerInfo(), refreshOfferings()]);
      void lifeNestService.getCurrentMonthlyUsageSummary()
        .then((summary) => setLifeNestUsage(summary))
        .catch((error) => logError("SubscribeScreen.loadLifeNestUsage", error));
      requestPendingWebCheckoutCheck("route_focus");
    }, [isConfigured, refreshCustomerInfo, refreshOfferings, requestPendingWebCheckoutCheck])
  );

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined" || typeof document === "undefined") return;

    const handleReturnToTab = () => {
      if (document.visibilityState === "visible") {
        requestPendingWebCheckoutCheck("tab_visible");
      }
    };

    const handleWindowFocus = () => {
      requestPendingWebCheckoutCheck("window_focus");
    };

    document.addEventListener("visibilitychange", handleReturnToTab);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleReturnToTab);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [requestPendingWebCheckoutCheck]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (!isConfigured) return;
    if (hasHandledWebCheckoutReturnRef.current) return;

    const returnStatus = readWebCheckoutReturnStatus(params);
    const pendingCheckout = readPendingWebCheckout();
    if (!returnStatus && !pendingCheckout) return;

    hasHandledWebCheckoutReturnRef.current = true;
    addCrashBreadcrumb("subscribe_web_checkout_return_detected", {
      returnStatus,
      pendingProductKind: pendingCheckout?.productKind ?? null,
      pendingPackageId: pendingCheckout?.packageId ?? null,
      expectedTokens: pendingCheckout?.expectedTokens ?? 0,
    }, "/subscribe");

    if (returnStatus === "cancelled" || returnStatus === "failed") {
      clearPendingWebCheckout();
      setCheckoutNotice({
        tone: "warning",
        title: "Payment not completed",
        message: "No payment was confirmed. You can choose an option and try again when you are ready.",
      });
      return;
    }

    setCheckoutNotice({
      tone: returnStatus === "success" ? "success" : "info",
      title: returnStatus === "success" ? "Payment complete" : "Checking your purchase",
      message: "We are checking your account now. If your tokens or subscription do not appear within a minute, use Check purchase or contact support.",
    });

    void confirmWebCheckoutReturn(pendingCheckout).then((confirmed) => {
      if (!confirmed) {
        hasHandledWebCheckoutReturnRef.current = false;
      }
    });
  }, [confirmWebCheckoutReturn, params, isConfigured]);

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
  const subscriptionProfile = deriveSubscriptionProfile(customerInfo);

  /** Shows a consistent alert when the store is blocked or billing is unavailable. */
  const handleBlockedPurchasesAlert = () => {
    showAlert(
      "Purchases unavailable",
      getPurchaseUnavailableMessage()
    );
  };

  /** Normalises purchase-related errors into user-facing alerts. */
  const handleError = (error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown error";
    const lower = message.toLowerCase();

    if (isRevenueCatConfigError(message)) {
      showAlert("Purchases unavailable", getPurchaseUnavailableMessage());
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

    showAlert("Purchase failed", `We could not complete your purchase. Please try again. If this keeps happening, contact support at ${PROJECT_SUPPORT_EMAIL}.`);
  };

  /** Wraps one async subscribe action with shared loading and error handling. */
  const runAction = async (action: BusyAction, task: () => Promise<void>) => {
    if (busyActionRef.current) return;

    try {
      busyActionRef.current = action;
      setBusyAction(action);
      await task();
    } catch (error) {
      logError("SubscribeScreen.runAction", error, { action });
      handleError(error);
    } finally {
      busyActionRef.current = null;
      setBusyAction(null);
    }
  };

  /** Persists the current web checkout attempt so return/focus can reconcile state. */
  const rememberWebCheckout = (pkg: PurchasesPackage, productKind: string, expectedTokens: number) => {
    if (Platform.OS !== "web") return;
    const pendingCheckout: PendingWebCheckout = {
      productKind,
      packageId: pkg.identifier,
      expectedTokens,
      startedPurchasedTokens: availableLifeNestTokens,
      openedAt: new Date().toISOString(),
    };
    writePendingWebCheckout(pendingCheckout);
  };

  /** Opens the external RevenueCat Web Purchase Link with app-user reconciliation data. */
  const openRevenueCatWebPurchaseLink = async (pkg: PurchasesPackage, productKind: string, expectedTokens: number) => {
    if (!appUserId) {
      logError("SubscribeScreen.openRevenueCatWebPurchaseLink", new Error("APP_USER_ID_MISSING"));
      showAlert("Sign in required", "Please sign in again before purchasing.");
      return;
    }

    rememberWebCheckout(pkg, productKind, expectedTokens);
    const shouldPreselectPackage = productKind.startsWith("lifenest_tokens_");
    const checkoutUrl = buildRevenueCatWebPurchaseLinkUrl({
      email: checkoutEmail,
      appUserId,
      packageId: shouldPreselectPackage ? pkg.identifier : null,
      productKind,
    });
    addCrashBreadcrumb("subscribe_revenuecat_web_purchase_link_open", {
      productKind,
      packageId: pkg.identifier,
      hasPrefilledEmail: Boolean(checkoutEmail),
      hasAppUserId: Boolean(appUserId),
      expectedTokens,
    }, "/subscribe");
    setCheckoutNotice({
      tone: "info",
      title: "Checkout opened",
      message: "Complete payment in the secure checkout, then return here. We will check your account automatically; use Check purchase if the update does not appear straight away.",
    });
    await Linking.openURL(checkoutUrl);
  };

  /** Starts the purchase flow for the currently selected package. */
  const handlePurchaseSelection = async () => {
    if (!selectedPackage) {
      showAlert("No option selected", "Choose a subscription option first.");
      return;
    }

    const selectedKind = getPackageKind(selectedPackage);
    if (Platform.OS === "web" && selectedKind !== "unknown") {
      await runAction(`purchase:${selectedPackage.identifier}`, async () => {
        await openRevenueCatWebPurchaseLink(selectedPackage, selectedKind, 0);
      });
      return;
    }

    if (!isConfigured) {
      handleBlockedPurchasesAlert();
      return;
    }

    await runAction(`purchase:${selectedPackage.identifier}`, async () => {
      const { identifier } = selectedPackage;
      addCrashBreadcrumb("subscribe_purchase_start", { packageIdentifier: identifier }, "/subscribe");
      const info = await purchasePackage(selectedPackage);
      const profile = deriveSubscriptionProfile(info);
      addCrashBreadcrumb("subscribe_purchase_result", {
        packageIdentifier: identifier,
        isPremium: profile.isPremium,
        isAdFree: profile.isAdFree,
        hasRemoveAds: profile.hasRemoveAds,
      }, "/subscribe");
      const purchaseTitle = profile.isAdFree ? "Purchase successful" : "Purchase complete";
      const purchaseMessage = profile.isAdFree
        ? "Your purchase is now active."
        : `Your purchase completed, but we could not confirm access yet. Please try restoring purchases. If this keeps happening, contact support at ${PROJECT_SUPPORT_EMAIL}.`;
      await refreshPurchaseState();
      acknowledgePurchase(purchaseTitle, purchaseMessage, () => {
        setSelectedPackageId(identifier);
      });
    });
  };

  /** Starts the purchase flow for one LifeNest token bundle. */
  const handleTokenPurchase = async (pkg: PurchasesPackage) => {
    const kind = getPackageKind(pkg);
    if (Platform.OS === "web" && kind !== "unknown") {
      await runAction(`purchase:${pkg.identifier}`, async () => {
        await openRevenueCatWebPurchaseLink(pkg, kind, getLifeNestTokenAmountForProductKind(kind));
      });
      return;
    }

    if (!isConfigured) {
      handleBlockedPurchasesAlert();
      return;
    }

    await runAction(`purchase:${pkg.identifier}`, async () => {
      const tokenAmount = getLifeNestTokenAmountForProductKind(kind);
      if (tokenAmount <= 0) {
        throw new Error(`Unable to determine token amount for package ${pkg.product.identifier}.`);
      }
      addCrashBreadcrumb("subscribe_token_purchase_start", {
        packageIdentifier: pkg.identifier,
        tokenAmount,
      }, "/subscribe");
      await purchasePackage(pkg);
      const summary = await refreshPurchaseState();
      addCrashBreadcrumb("subscribe_token_purchase_result", {
        packageIdentifier: pkg.identifier,
        tokenAmount,
        totalTokensRemaining: summary.totalTokensRemaining,
        purchasedTokensBalance: summary.purchasedTokensBalance,
      }, "/subscribe");
      acknowledgePurchase(
        "Tokens added",
        `${tokenAmount} LifeNest tokens were added to your account. You now have ${summary.totalTokensRemaining} available.`,
      );
    });
  };

  /** Restores store purchases onto the current account. */
  const handleRestore = async () => {
    await runAction("restore", async () => {
      addCrashBreadcrumb("subscribe_restore_start", undefined, "/subscribe");
      const info = await restorePurchases();
      const profile = deriveSubscriptionProfile(info);
      await lifeNestService.syncSubscriptionUsagePeriod({
        isSubscriptionActive: profile.isPremium,
        subscriptionStartedAt: profile.subscriptionStartedAt,
      });
      const summary = await lifeNestService.getCurrentMonthlyUsageSummary();
      setLifeNestUsage(summary);
      addCrashBreadcrumb("subscribe_restore_result", {
        isPremium: profile.isPremium,
        isAdFree: profile.isAdFree,
        hasRemoveAds: profile.hasRemoveAds,
      }, "/subscribe");
      showAlert(
        profile.isAdFree ? "Purchases restored" : "Nothing to restore",
        profile.isAdFree
          ? "Your subscriptions or one-time purchases were restored successfully for this account."
          : "No active subscription or one-time purchase was found for this store account. LifeNest token balances are synced to your signed-in account and do not need store restore."
      );
    });
  };

  /** Opens RevenueCat customer center for subscription management. */
  const handleCustomerCenter = async () => {
    await runAction("customer-center", async () => {
      const managementUrl = subscriptionProfile.managementUrl;
      const instructions =
        Platform.OS === "ios"
          ? "Open iPhone Settings, tap your Apple ID, then Subscriptions. Select the demo product and cancel renewal."
          : Platform.OS === "android"
            ? "Open Google Play Store, tap profile, Payments & subscriptions, then Subscriptions. Select the demo product and cancel renewal."
            : "On web, use the subscription email you received after checkout to update or cancel your subscription.";

      if (!managementUrl) {
        showAlert("Manage subscription", instructions);
        return;
      }

      await presentCustomerCenter();
      await refreshPurchaseState();
    });
  };

  /** Refreshes purchase state from a user action without starting a new checkout. */
  const handleManualPurchaseRefresh = async () => {
    await runAction("refresh", async () => {
      const pendingCheckout = readPendingWebCheckout();
      await confirmWebCheckoutReturn(pendingCheckout);
    });
  };

  /** Shows purchase confirmation and returns the user to the previous screen when possible. */
  const acknowledgePurchase = (
    title: string,
    message: string,
    onBeforeNavigate?: () => void,
  ) => {
    showAlert(title, message, [
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
            logError("SubscribeScreen.acknowledgePurchase.navigate", navigationError, { title });
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
      title: "500 LifeNest tokens every month",
      description: "Receive the included monthly token allowance while your subscription is active.",
    },
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
      description: "Your active subscription removes all ads while it remains active and synced to this account.",
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
            {getPurchaseUnavailableMessage()}
          </ThemedText>
        </Card>
      )}

      {checkoutNotice && (
        <Card style={[
          styles.checkoutNoticeCard,
          {
            borderColor: checkoutNotice.tone === "success" ? success : checkoutNotice.tone === "warning" ? warning : primary,
          },
        ]}>
          <ThemedText type="subtitle">{checkoutNotice.title}</ThemedText>
          <ThemedText style={styles.description}>{checkoutNotice.message}</ThemedText>
          {checkoutNotice.tone !== "success" ? (
            <View style={styles.secondaryActions}>
              <Button
                analyticsId="app_subscribe_index_check_purchase"
                title={busyAction === "refresh" ? "Checking..." : "Check purchase"}
                variant="secondary"
                onPress={handleManualPurchaseRefresh}
                loading={busyAction === "refresh"}
                disabled={!isConfigured || Boolean(busyAction)}
              />
              <Button
                analyticsId="app_subscribe_index_clear_checkout_notice"
                title="Dismiss"
                variant="secondary"
                onPress={() => setCheckoutNotice(null)}
                disabled={Boolean(busyAction)}
              />
            </View>
          ) : null}
        </Card>
      )}

      {!isPremiumSubscriber && isConfigured && (
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
                <TouchableOpacity analyticsId="app_subscribe_index_plan_card" analyticsControlType="card"
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
              <ThemedText type="subtitle">Purchases unavailable</ThemedText>
              <ThemedText style={styles.description}>
                {getPurchaseUnavailableMessage()}
              </ThemedText>
            </Card>
          )}
        </View>

        <View style={styles.ctaStack}>
          <Button analyticsId="app_subscribe_index_handle_purchase_selection"
            title={getPrimaryButtonLabel()}
            onPress={handlePurchaseSelection}
            loading={selectedPackage ? busyAction === `purchase:${selectedPackage.identifier}` : false}
            disabled={!selectedPackage || Boolean(busyAction)}
          />
          <View style={styles.secondaryActions}>
            <Button analyticsId="app_subscribe_index_handle_restore"
              title={busyAction === "restore" ? "Restoring..." : "Restore purchases"}
              onPress={handleRestore}
              variant="secondary"
              loading={busyAction === "restore"}
              disabled={!isConfigured || Boolean(busyAction)}
            />
            {showManageButton ? (
              <Button analyticsId="app_subscribe_index_handle_customer_center"
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
            Premium and token bundles add LifeNest tokens to your RevenueCat-synced balance.
          </ThemedText>
          <ThemedText style={styles.description}>
            {`Available now: ${lifeNestUsage?.totalTokensRemaining ?? 0} tokens`}
          </ThemedText>
          <ThemedText style={styles.description}>
            Your token balance is managed by RevenueCat and updates after purchases sync.
          </ThemedText>
          {isConfigured && tokenPackages.length > 0 ? (
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
                          {`Adds ${tokenAmount} tokens to your RevenueCat-synced balance.`}
                        </ThemedText>
                      </View>
                    </View>
                    {pricing.isApproximate ? (
                      <ThemedText style={styles.billingMeta}>
                        {`Billed by the store as ${pricing.billingPrice} (${pricing.billingCurrencyCode}).`}
                      </ThemedText>
                    ) : null}
                    <Button analyticsId="app_subscribe_index_handle_token_purchase"
                      title={`Buy ${tokenAmount} tokens`}
                      onPress={() => handleTokenPurchase(pkg)}
                      loading={busyAction === `purchase:${pkg.identifier}`}
                      disabled={!isConfigured || Boolean(busyAction)}
                    />
                  </Card>
                );
              })}
            </View>
          ) : isConfigured ? (
            <ThemedText style={styles.description}>
              {getPurchaseUnavailableMessage()}
            </ThemedText>
          ) : null}
          <ThemedText style={styles.tokenAdNotice}>
            Buying additional LifeNest tokens does not remove ads. To use the app without ads, subscribe or buy Remove Ads.
          </ThemedText>
          {isPremiumSubscriber ? (
            <View style={styles.secondaryActions}>
              <Button analyticsId="app_subscribe_index_handle_restore_2"
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

    width: '100%',
    maxWidth: Platform.OS === 'web' ? '70%' : 1200,
    alignSelf: 'center',
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
  checkoutNoticeCard: {
    gap: 10,
    borderWidth: 2,
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
  tokenAdNotice: {
    lineHeight: 20,
    opacity: 0.82,
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
