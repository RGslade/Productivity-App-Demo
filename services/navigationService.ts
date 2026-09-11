import { router } from 'expo-router';

type NavigationTarget = string | { pathname: string; params?: Record<string, string | number | undefined | null> };

/** Clears stacked sub-pages when possible, then replaces with a top-level route. */
export function replaceTopLevelRoute(route: NavigationTarget) {
  const stackRouter = router as unknown as { canDismiss?: () => boolean; dismissAll?: () => void };
  const dismissAll = stackRouter.dismissAll;
  const hasDismissAll = typeof dismissAll === 'function';
  const canDismiss = stackRouter.canDismiss?.() === true;

  if (hasDismissAll && canDismiss) {
    dismissAll();
  }

  router.replace(route as any);
}

/** Goes back when a history entry exists, otherwise returns to the supplied list route. */
export function goBackOrReplace(fallbackRoute: NavigationTarget) {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  replaceTopLevelRoute(fallbackRoute);
}
