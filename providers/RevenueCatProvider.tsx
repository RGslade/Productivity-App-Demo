import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import Purchases, {
  CustomerInfo,
  CustomerInfoUpdateListener,
  PurchasesOfferings,
  PurchasesPackage,
} from "react-native-purchases";
import { PAYWALL_RESULT } from "react-native-purchases-ui";

import { useAuthContext } from "@/providers/AuthProvider";
import { showAlert } from "@/hooks/dataHandler";
import { lifeNestService } from "@/services/lifeNestService";
import { isAuthenticationRequiredError, userService } from "@/services/userService";
import {
  deriveSubscriptionProfile,
  getCustomerInfoDebugSnapshot,
  isAnonymousRevenueCatAppUserId,
  isProEntitlementActive,
  resolveLifeNestVirtualCurrency,
  subscriptionService,
} from "@/services/subscriptionService";
// import { REVENUECAT_ENTITLEMENT_ID } from "@/constants/subscription";

type RevenueCatVirtualCurrenciesShape = {
  all: Record<string, { balance: number; code: string; name: string }>;
};

type RevenueCatContextType = {
  isConfigured: boolean;
  configurationError: string | null;
  isSupported: boolean;
  customerInfo: CustomerInfo | null;
  offerings: PurchasesOfferings | null;
  virtualCurrencies: RevenueCatVirtualCurrenciesShape | null;
  lifeNestTokenBalance: number;
  isPremium: boolean;
  hasRemoveAds: boolean;
  isAdFree: boolean;
  refreshCustomerInfo: () => Promise<CustomerInfo | null>;
  refreshOfferings: () => Promise<PurchasesOfferings | null>;
  refreshVirtualCurrencies: () => Promise<RevenueCatVirtualCurrenciesShape | null>;
  purchasePackage: (pkg: PurchasesPackage) => Promise<CustomerInfo | null>;
  restorePurchases: () => Promise<CustomerInfo | null>;
  presentPaywall: () => Promise<PAYWALL_RESULT | null>;
  presentPaywallIfNeeded: () => Promise<PAYWALL_RESULT | null>;
  presentCustomerCenter: () => Promise<void>;
};

const RevenueCatContext = createContext<RevenueCatContextType | null>(null);

export function useRevenueCat() {
  const ctx = useContext(RevenueCatContext);
  if (!ctx) {
    throw new Error("useRevenueCat must be used inside RevenueCatProvider");
  }
  return ctx;
}

export function RevenueCatProvider({ children }: { children: React.ReactNode }) {
  const { user, userInfo, refreshAuth } = useAuthContext();
  const [isConfigured, setIsConfigured] = useState(false);
  const [configurationError, setConfigurationError] = useState<string | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [virtualCurrencies, setVirtualCurrencies] = useState<RevenueCatVirtualCurrenciesShape | null>(null);
  const listenerRef = useRef<CustomerInfoUpdateListener | null>(null);
  const lastLoggedInUserIdRef = useRef<string | null>(null);
  const isSyncingProfileRef = useRef(false);
  const wasPremiumRef = useRef<boolean>(false);
  const hasRevenueCatSyncErrorRef = useRef(false);

  const isSupported = Platform.OS === "ios" || Platform.OS === "android";
  const subscriptionProfile = useMemo(
    () => deriveSubscriptionProfile(customerInfo),
    [customerInfo]
  );
  const lifeNestTokenBalance = useMemo(
    () => resolveLifeNestVirtualCurrency(virtualCurrencies)?.balance ?? 0,
    [virtualCurrencies]
  );

  const refreshCustomerInfo = useCallback(async () => {
    if (!isSupported || !isConfigured) return null;
    const info = await subscriptionService.getCustomerInfo();
    setCustomerInfo(info);
    return info;
  }, [isConfigured, isSupported]);

  const refreshOfferings = useCallback(async () => {
    if (!isSupported || !isConfigured) return null;
    const nextOfferings = await subscriptionService.getOfferings();
    setOfferings(nextOfferings);
    return nextOfferings;
  }, [isConfigured, isSupported]);

  const refreshVirtualCurrencies = useCallback(async () => {
    if (!isSupported || !isConfigured) return null;
    await subscriptionService.invalidateVirtualCurrenciesCache();
    const nextVirtualCurrencies = await subscriptionService.getVirtualCurrencies();
    setVirtualCurrencies(nextVirtualCurrencies);
    return nextVirtualCurrencies;
  }, [isConfigured, isSupported]);

  /**
   * Ensures RevenueCat is bound to the authenticated user id before any billing action.
   */
  const ensureAuthenticatedRevenueCatIdentity = useCallback(async () => {
    if (!isSupported || !isConfigured || !user?.id) return false;
    const sdkAppUserId = await subscriptionService.getAppUserID();
    const needsLogin = sdkAppUserId !== user.id;
    if (needsLogin) {
      const loginResult = await subscriptionService.logIn(user.id);
      setCustomerInfo(loginResult.customerInfo);
    }
    lastLoggedInUserIdRef.current = user.id;
    return true;
  }, [isConfigured, isSupported, user]);

  useEffect(() => {
    /**
     * Boots RevenueCat and attaches the authenticated app user id when available.
     */
    const initialize = async () => {
      if (!isSupported) return;

      try {
        await subscriptionService.configure(user?.id);
        setIsConfigured(true);
        setConfigurationError(null);
        hasRevenueCatSyncErrorRef.current = false;
      } catch (error) {
        setIsConfigured(false);
        setConfigurationError(error instanceof Error ? error.message : String(error));
        hasRevenueCatSyncErrorRef.current = true;
        console.error("RevenueCat configure failed", error);
      }
    };

    initialize();
  }, [isSupported, user?.id]);

  useEffect(() => {
    if (!isSupported || !isConfigured) return;

    listenerRef.current = (info) => {
      setCustomerInfo(info);
    };

    Purchases.addCustomerInfoUpdateListener(listenerRef.current);

    return () => {
      if (listenerRef.current) {
        Purchases.removeCustomerInfoUpdateListener(listenerRef.current);
      }
    };
  }, [isConfigured, isSupported]);

  useEffect(() => {
    const loadRevenueCatState = async () => {
      if (!isSupported || !isConfigured) return;

      try {
        await Promise.all([refreshCustomerInfo(), refreshOfferings(), refreshVirtualCurrencies()]);
      } catch (error) {
        console.error("RevenueCat initial state load failed", error);
      }
    };

    void loadRevenueCatState();
  }, [isConfigured, isSupported, refreshCustomerInfo, refreshOfferings, refreshVirtualCurrencies, user?.id]);

  useEffect(() => {
    const syncRevenueCatIdentity = async () => {
      if (!isSupported || !isConfigured) return;

      try {
        const sdkAppUserIdBefore = await subscriptionService.getAppUserID();

        if (user?.id) {
          await ensureAuthenticatedRevenueCatIdentity();
          await subscriptionService.syncSubscriberAttributes({
            email: userInfo?.email_address ?? user.email ?? null,
            displayName: userInfo ? userService.getFullName(userInfo) : null,
            phoneNumber: userInfo?.primary_phone_number?.toString() ?? null,
          });
          await Promise.allSettled([refreshCustomerInfo(), refreshOfferings(), refreshVirtualCurrencies()]);
        } else {
          const shouldLogOut =
            Boolean(lastLoggedInUserIdRef.current) ||
            Boolean(sdkAppUserIdBefore && !isAnonymousRevenueCatAppUserId(sdkAppUserIdBefore));
          if (shouldLogOut) {
            await subscriptionService.logOut();
            lastLoggedInUserIdRef.current = null;
            setCustomerInfo(null);
            setOfferings(null);
          }
        }

        if (user?.id) {
          hasRevenueCatSyncErrorRef.current = false;
        }
      } catch (error) {
        hasRevenueCatSyncErrorRef.current = true;
        console.error("RevenueCat identity sync failed", error);
      }
    };

    syncRevenueCatIdentity();
  }, [
    ensureAuthenticatedRevenueCatIdentity,
    isConfigured,
    isSupported,
    refreshCustomerInfo,
    refreshOfferings,
    refreshVirtualCurrencies,
    user?.email,
    user?.id,
    userInfo,
  ]);

  useEffect(() => {
    const syncEntitlementToProfile = async () => {
      if (!userInfo || !customerInfo || isSyncingProfileRef.current) return;
      const needsUpdate = userInfo.is_premium_user !== subscriptionProfile.isPremium || (userInfo.subscription_status ?? "inactive") !== subscriptionProfile.status || (userInfo.subscription_product_id ?? null) !== subscriptionProfile.productId || (userInfo.subscription_provider ?? null) !== subscriptionProfile.provider;

      if (!needsUpdate) return;
      isSyncingProfileRef.current = true;
      try {
        await userService.updateProfile({is_premium_user: subscriptionProfile.isPremium, subscription_status: subscriptionProfile.status, subscription_product_id: subscriptionProfile.productId, subscription_provider: subscriptionProfile.provider,});
        await refreshAuth();
      } catch (error) {
        if (!isAuthenticationRequiredError(error)) console.error("RevenueCat profile sync failed", error);
      } finally {
        isSyncingProfileRef.current = false;
      }
    };

    syncEntitlementToProfile();
  }, [customerInfo, refreshAuth, subscriptionProfile, user?.id, userInfo]);

  useEffect(() => {
    const syncLifeNestUsagePeriod = async () => {
      if (!userInfo || !customerInfo) return;

      try {
        await lifeNestService.syncSubscriptionUsagePeriod({
          isSubscriptionActive: subscriptionProfile.isPremium,
          subscriptionStartedAt: subscriptionProfile.subscriptionStartedAt,
        });
      } catch (error) {
        if (!isAuthenticationRequiredError(error)) console.error("LifeNest subscription usage period sync failed", error);
      }
    };

    void syncLifeNestUsagePeriod();
  }, [customerInfo, subscriptionProfile, userInfo]);

  useEffect(() => {
    if (!user?.id) {
      wasPremiumRef.current = false;
      return;
    }

    const currentlyPremium = isProEntitlementActive(customerInfo);

    if (wasPremiumRef.current && !currentlyPremium) {
      showAlert(
        'Premium access ended',
        'Your premium access is no longer active. Premium categories and dashboard customisation are now unavailable.',
      );
    }

    wasPremiumRef.current = currentlyPremium;
  }, [customerInfo, user?.id]);

  const purchasePackage = useCallback(
    async (pkg: PurchasesPackage) => {
      if (!isSupported || !isConfigured) return null;
      const hasIdentity = await ensureAuthenticatedRevenueCatIdentity();
      if (!hasIdentity) {
        throw new Error("REVENUECAT_AUTH_USER_MISSING");
      }
      const { customerInfo: info } = await subscriptionService.purchasePackage(pkg);
      setCustomerInfo(info);
      await refreshVirtualCurrencies();
      return info;
    },
    [ensureAuthenticatedRevenueCatIdentity, isConfigured, isSupported, refreshVirtualCurrencies]
  );

  const restorePurchases = useCallback(async () => {
    if (!isSupported || !isConfigured) return null;
    const hasIdentity = await ensureAuthenticatedRevenueCatIdentity();
    if (!hasIdentity) {
      throw new Error("REVENUECAT_AUTH_USER_MISSING");
    }
    const info = await subscriptionService.restorePurchases();
    setCustomerInfo(info);
    await refreshVirtualCurrencies();
    return info;
  }, [ensureAuthenticatedRevenueCatIdentity, isConfigured, isSupported, refreshVirtualCurrencies]);

  const currentOffering = offerings?.current ?? null;

  const presentPaywall = useCallback(async () => {
    if (!isSupported || !isConfigured) return null;
    await ensureAuthenticatedRevenueCatIdentity();
    const result = await subscriptionService.presentPaywall(currentOffering);
    if (subscriptionService.isSuccessfulPaywallResult(result)) {
      await Promise.all([refreshCustomerInfo(), refreshVirtualCurrencies()]);
    }
    return result;
  }, [currentOffering, ensureAuthenticatedRevenueCatIdentity, isConfigured, isSupported, refreshCustomerInfo, refreshVirtualCurrencies]);

  const presentPaywallIfNeeded = useCallback(async () => {
    if (!isSupported || !isConfigured) return null;
    await ensureAuthenticatedRevenueCatIdentity();
    const result = await subscriptionService.presentPaywallIfNeeded(currentOffering);
    if (subscriptionService.isSuccessfulPaywallResult(result)) {
      await Promise.all([refreshCustomerInfo(), refreshVirtualCurrencies()]);
    }
    return result;
  }, [currentOffering, ensureAuthenticatedRevenueCatIdentity, isConfigured, isSupported, refreshCustomerInfo, refreshVirtualCurrencies]);

  const presentCustomerCenter = useCallback(async () => {
    if (!isSupported || !isConfigured) return;
    const hasIdentity = await ensureAuthenticatedRevenueCatIdentity();
    if (!hasIdentity) {
      throw new Error("REVENUECAT_AUTH_USER_MISSING");
    }
    await subscriptionService.presentCustomerCenter();
    await Promise.all([refreshCustomerInfo(), refreshVirtualCurrencies()]);
  }, [ensureAuthenticatedRevenueCatIdentity, isConfigured, isSupported, refreshCustomerInfo, refreshVirtualCurrencies]);

  const value = useMemo(
    () => ({
      isConfigured,
      configurationError,
      isSupported,
      customerInfo,
      offerings,
      virtualCurrencies,
      lifeNestTokenBalance,
      isPremium: isProEntitlementActive(customerInfo),
      hasRemoveAds: subscriptionProfile.hasRemoveAds,
      isAdFree: subscriptionProfile.isAdFree,
      refreshCustomerInfo,
      refreshOfferings,
      refreshVirtualCurrencies,
      purchasePackage,
      restorePurchases,
      presentPaywall,
      presentPaywallIfNeeded,
      presentCustomerCenter,
    }),
    [
      customerInfo,
      configurationError,
      isConfigured,
      isSupported,
      lifeNestTokenBalance,
      offerings,
      subscriptionProfile.hasRemoveAds,
      subscriptionProfile.isAdFree,
      presentCustomerCenter,
      presentPaywall,
      presentPaywallIfNeeded,
      purchasePackage,
      refreshCustomerInfo,
      refreshOfferings,
      refreshVirtualCurrencies,
      restorePurchases,
      virtualCurrencies,
    ]
  );

  return <RevenueCatContext.Provider value={value}>{children}</RevenueCatContext.Provider>;
}
