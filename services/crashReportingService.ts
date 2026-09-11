/** Initializes the local crash-reporting boundary without an external provider. */
export const initializeCrashReporting = async (): Promise<void> => undefined;

/** Stores a breadcrumb in development logs without sending it to an external service. */
export const recordCrashBreadcrumb = async (
  event: string,
  details?: Record<string, unknown>,
  route?: string,
): Promise<void> => {
  if (__DEV__) console.debug('[PortfolioBreadcrumb]', { event, details, route });
};

/** Reports a diagnostic through the local console only. */
export const reportCrashError = async (options: {
  location: string;
  error: Error;
  details?: Record<string, unknown>;
  breadcrumbs?: unknown[];
  isFatal?: boolean;
}): Promise<void> => {
  if (__DEV__) console.debug('[PortfolioCrashReport]', options);
};
