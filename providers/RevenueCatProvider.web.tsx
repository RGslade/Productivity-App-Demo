import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { showAlert } from '@/hooks/dataHandler';
import { useAuthContext } from '@/providers/AuthProvider';
import { lifeNestService } from '@/services/lifeNestService';
import { isAuthenticationRequiredError, userService } from '@/services/userService';
import {
  deriveSubscriptionProfile,
  getCustomerInfoDebugSnapshot,
  isProEntitlementActive,
  resolveLifeNestVirtualCurrency,
  subscriptionService,
} from '@/services/subscriptionService';

type RevenueCatContextType = {
  isConfigured: boolean;
  configurationError: string | null;
  isSupported: boolean;
  customerInfo: any;
  offerings: any;
  virtualCurrencies: any;
  lifeNestTokenBalance: number;
  isPremium: boolean;
  hasRemoveAds: boolean;
  isAdFree: boolean;
  refreshCustomerInfo: () => Promise<any>;
  refreshOfferings: () => Promise<any>;
  refreshVirtualCurrencies: () => Promise<any>;
  purchasePackage: (pkg: any) => Promise<any>;
  restorePurchases: () => Promise<any>;
  presentPaywall: () => Promise<any>;
  presentPaywallIfNeeded: () => Promise<any>;
  presentCustomerCenter: () => Promise<void>;
};

const RevenueCatContext = createContext<RevenueCatContextType | null>(null);

/** Returns RevenueCat state and purchase actions for the current app tree. */
export function useRevenueCat() {
  const value = useContext(RevenueCatContext);
  if (!value) throw new Error('useRevenueCat must be used inside RevenueCatProvider');
  return value;
}

/** Provides RevenueCat Web Billing state for signed-in browser sessions. */
export function RevenueCatProvider({ children }: { children: React.ReactNode }) {
  const { user, userInfo, refreshAuth } = useAuthContext();
  const [isConfigured, setIsConfigured] = useState(false);
  const [configurationError, setConfigurationError] = useState<string | null>(null);
  const [customerInfo, setCustomerInfo] = useState<any>(null);
  const [offerings, setOfferings] = useState<any>(null);
  const [virtualCurrencies, setVirtualCurrencies] = useState<any>(null);
  const isSyncingProfileRef = useRef(false);
  const wasPremiumRef = useRef(false);

  const subscriptionProfile = useMemo(() => deriveSubscriptionProfile(customerInfo), [customerInfo]);
  const lifeNestTokenBalance = useMemo(
    () => resolveLifeNestVirtualCurrency(virtualCurrencies)?.balance ?? 0,
    [virtualCurrencies]
  );

  const refreshCustomerInfo = useCallback(async () => {
    if (!isConfigured) return null;
    const info = await subscriptionService.getCustomerInfo();
    setCustomerInfo(info);
    return info;
  }, [isConfigured]);

  const refreshOfferings = useCallback(async () => {
    if (!isConfigured) return null;
    const nextOfferings = await subscriptionService.getOfferings();
    setOfferings(nextOfferings);
    return nextOfferings;
  }, [isConfigured]);

  const refreshVirtualCurrencies = useCallback(async () => {
    if (!isConfigured) return null;
    await subscriptionService.invalidateVirtualCurrenciesCache();
    const nextVirtualCurrencies = await subscriptionService.getVirtualCurrencies();
    setVirtualCurrencies(nextVirtualCurrencies);
    return nextVirtualCurrencies;
  }, [isConfigured]);

  const ensureAuthenticatedRevenueCatIdentity = useCallback(async () => {
    if (!isConfigured || !user?.id) return false;
    const sdkAppUserId = await subscriptionService.getAppUserID();
    if (sdkAppUserId !== user.id) {
      const loginResult = await subscriptionService.logIn(user.id);
      setCustomerInfo(loginResult.customerInfo);
    }
    return true;
  }, [isConfigured, user]);

  useEffect(() => {
    /** Boots RevenueCat Web Billing for the signed-in app user. */
    const initialize = async () => {
      if (!user?.id) {
        setIsConfigured(false);
        setCustomerInfo(null);
        setOfferings(null);
        setVirtualCurrencies(null);
        return;
      }

      try {
        await subscriptionService.configure(user.id);
        setIsConfigured(true);
        setConfigurationError(null);
      } catch (error) {
        setIsConfigured(false);
        setConfigurationError(error instanceof Error ? error.message : String(error));
        console.error('RevenueCat web configure failed', error);
      }
    };

    void initialize();
  }, [user?.id]);

  useEffect(() => {
    const loadRevenueCatState = async () => {
      if (!isConfigured) return;

      try {
        await Promise.all([refreshCustomerInfo(), refreshOfferings(), refreshVirtualCurrencies()]);
      } catch (error) {
        console.error('RevenueCat web initial state load failed', error);
      }
    };

    void loadRevenueCatState();
  }, [isConfigured, refreshCustomerInfo, refreshOfferings, refreshVirtualCurrencies, user?.id]);

  useEffect(() => {
    const syncSubscriber = async () => {
      if (!isConfigured || !user?.id) return;

      try {
        await ensureAuthenticatedRevenueCatIdentity();
        await subscriptionService.syncSubscriberAttributes({
          email: userInfo?.email_address ?? user.email ?? null,
          displayName: userInfo ? userService.getFullName(userInfo) : null,
          phoneNumber: userInfo?.primary_phone_number?.toString() ?? null,
        });
      } catch (error) {
        console.error('RevenueCat web identity sync failed', error);
      }
    };

    void syncSubscriber();
  }, [ensureAuthenticatedRevenueCatIdentity, isConfigured, user?.email, user?.id, userInfo]);

  useEffect(() => {
    const syncEntitlementToProfile = async () => {
      if (!userInfo || !customerInfo || isSyncingProfileRef.current) return;
      const needsUpdate =
        userInfo.is_premium_user !== subscriptionProfile.isPremium ||
        (userInfo.subscription_status ?? 'inactive') !== subscriptionProfile.status ||
        (userInfo.subscription_product_id ?? null) !== subscriptionProfile.productId ||
        (userInfo.subscription_provider ?? null) !== subscriptionProfile.provider;

      if (!needsUpdate) return;
      isSyncingProfileRef.current = true;
      try {
        await userService.updateProfile({
          is_premium_user: subscriptionProfile.isPremium,
          subscription_status: subscriptionProfile.status,
          subscription_product_id: subscriptionProfile.productId,
          subscription_provider: subscriptionProfile.provider,
        });
        await refreshAuth();
      } catch (error) {
        if (!isAuthenticationRequiredError(error)) console.error('RevenueCat web profile sync failed', error);
      } finally {
        isSyncingProfileRef.current = false;
      }
    };

    void syncEntitlementToProfile();
  }, [customerInfo, refreshAuth, subscriptionProfile, userInfo]);

  useEffect(() => {
    const syncLifeNestUsagePeriod = async () => {
      if (!userInfo || !customerInfo) return;

      try {
        await lifeNestService.syncSubscriptionUsagePeriod({
          isSubscriptionActive: subscriptionProfile.isPremium,
          subscriptionStartedAt: subscriptionProfile.subscriptionStartedAt,
        });
      } catch (error) {
        if (!isAuthenticationRequiredError(error)) console.error('LifeNest web subscription usage period sync failed', error);
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
        'Your premium access is no longer active. Premium categories and dashboard customisation are now unavailable.'
      );
    }

    wasPremiumRef.current = currentlyPremium;
  }, [customerInfo, user?.id]);

  const purchasePackage = useCallback(
    async (pkg: any) => {
      const hasIdentity = await ensureAuthenticatedRevenueCatIdentity();
      if (!hasIdentity) {
        throw new Error('REVENUECAT_AUTH_USER_MISSING');
      }
      const result = await subscriptionService.purchasePackage(pkg);
      setCustomerInfo(result.customerInfo);
      await refreshVirtualCurrencies();
      return result.customerInfo;
    },
    [ensureAuthenticatedRevenueCatIdentity, refreshVirtualCurrencies]
  );

  const restorePurchases = useCallback(async () => {
    const hasIdentity = await ensureAuthenticatedRevenueCatIdentity();
    if (!hasIdentity) {
      throw new Error('REVENUECAT_AUTH_USER_MISSING');
    }
    const info = await subscriptionService.restorePurchases();
    setCustomerInfo(info);
    await refreshVirtualCurrencies();
    return info;
  }, [ensureAuthenticatedRevenueCatIdentity, refreshVirtualCurrencies]);

  const currentOffering = offerings?.current ?? null;

  const presentPaywall = useCallback(async () => {
    await ensureAuthenticatedRevenueCatIdentity();
    const result = await subscriptionService.presentPaywall(currentOffering);
    if (subscriptionService.isSuccessfulPaywallResult(result)) {
      await Promise.all([refreshCustomerInfo(), refreshVirtualCurrencies()]);
    }
    return result;
  }, [currentOffering, ensureAuthenticatedRevenueCatIdentity, refreshCustomerInfo, refreshVirtualCurrencies]);

  const presentPaywallIfNeeded = useCallback(async () => {
    await ensureAuthenticatedRevenueCatIdentity();
    const result = await subscriptionService.presentPaywallIfNeeded(currentOffering);
    if (subscriptionService.isSuccessfulPaywallResult(result)) {
      await Promise.all([refreshCustomerInfo(), refreshVirtualCurrencies()]);
    }
    return result;
  }, [currentOffering, ensureAuthenticatedRevenueCatIdentity, refreshCustomerInfo, refreshVirtualCurrencies]);

  const presentCustomerCenter = useCallback(async () => {
    const hasIdentity = await ensureAuthenticatedRevenueCatIdentity();
    if (!hasIdentity) {
      throw new Error('REVENUECAT_AUTH_USER_MISSING');
    }
    await subscriptionService.presentCustomerCenter();
    await Promise.all([refreshCustomerInfo(), refreshVirtualCurrencies()]);
  }, [ensureAuthenticatedRevenueCatIdentity, refreshCustomerInfo, refreshVirtualCurrencies]);

  const value = useMemo(
    () => ({
      isConfigured,
      configurationError,
      isSupported: Boolean(user?.id),
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
      configurationError,
      customerInfo,
      isConfigured,
      lifeNestTokenBalance,
      offerings,
      presentCustomerCenter,
      presentPaywall,
      presentPaywallIfNeeded,
      purchasePackage,
      refreshCustomerInfo,
      refreshOfferings,
      refreshVirtualCurrencies,
      restorePurchases,
      subscriptionProfile.hasRemoveAds,
      subscriptionProfile.isAdFree,
      user?.id,
      virtualCurrencies,
    ]
  );

  return <RevenueCatContext.Provider value={value}>{children}</RevenueCatContext.Provider>;
}
