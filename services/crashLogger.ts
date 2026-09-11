import { logAppDiagnostic, logAppException } from './analyticsService';
import { recordCrashBreadcrumb, reportCrashError } from './crashReportingService';

type CrashBreadcrumb = {
  event: string;
  details?: Record<string, unknown>;
  route?: string;
  timestamp: string;
};

const MAX_BREADCRUMBS = 40;
const breadcrumbs: CrashBreadcrumb[] = [];
const originalConsoleError = console.error.bind(console);
const originalConsoleWarn = console.warn.bind(console);
let isGlobalHandlerInstalled = false;
let isConsoleLoggerInstalled = false;

/** Normalises unknown thrown values into a concrete Error instance. */
function toError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error(String(error));
}

/** Builds the structured error payload used by console and local diagnostics. */
function normaliseError(error: unknown) {
  const parsedError = toError(error);

  return {
    parsedError,
    normalisedError: {
      name: parsedError.name,
      message: parsedError.message,
      stack: parsedError.stack ?? null,
    },
  };
}

/** Formats console arguments into a short analytics-safe diagnostic message. */
function getConsoleDiagnosticMessage(args: unknown[]): string {
  return args.map((arg) => {
    if (arg instanceof Error) return `${arg.name}:${arg.message}`;
    if (typeof arg === 'string') return arg;

    try {
      return JSON.stringify(arg);
    } catch {
      return String(arg);
    }
  }).join(' ').slice(0, 180);
}

/** Installs console warn/error breadcrumbs so uncaught crashes include recent diagnostics. */
function installConsoleDevelopmentLogger() {
  if (isConsoleLoggerInstalled) return;

  console.warn = (...args: unknown[]) => {
    originalConsoleWarn(...args);
    void logAppDiagnostic({
      level: 'warn',
      location: 'console.warn',
      message: getConsoleDiagnosticMessage(args),
    });
    void recordCrashBreadcrumb('console_warn', { message: getConsoleDiagnosticMessage(args) });
  };

  console.error = (...args: unknown[]) => {
    originalConsoleError(...args);
    void logAppDiagnostic({
      level: 'error',
      location: 'console.error',
      message: getConsoleDiagnosticMessage(args),
    });
    void recordCrashBreadcrumb('console_error', { message: getConsoleDiagnosticMessage(args) });
  };

  isConsoleLoggerInstalled = true;
}

/**
 * Stores a recent action breadcrumb for crash diagnostics.
 */
export function addCrashBreadcrumb(
  event: string,
  details?: Record<string, unknown>,
  route?: string
) {
  breadcrumbs.push({
    event,
    details,
    route,
    timestamp: new Date().toISOString(),
  });

  if (breadcrumbs.length > MAX_BREADCRUMBS) {
    breadcrumbs.splice(0, breadcrumbs.length - MAX_BREADCRUMBS);
  }

  void recordCrashBreadcrumb(event, details, route);
}

/**
 * Returns a snapshot of recent crash breadcrumbs.
 */
export function getCrashBreadcrumbs() {
  return [...breadcrumbs];
}

/**
 * Logs a structured non-fatal error with route and supporting context.
 */
export function logError(
  location: string,
  error: unknown,
  details?: Record<string, unknown>
) {
  const { parsedError, normalisedError } = normaliseError(error);
  const currentBreadcrumbs = getCrashBreadcrumbs();

  originalConsoleError('[AppError]', {
    location,
    ...normalisedError,
    details: details ?? {},
    breadcrumbs: currentBreadcrumbs,
  });

  void logAppException({
    location,
    errorName: normalisedError.name,
    isFatal: false,
  });
  void reportCrashError({
    location,
    error: parsedError,
    details,
    breadcrumbs: currentBreadcrumbs,
    isFatal: false,
  });
}

/**
 * Installs a global JS exception handler that reports breadcrumbs and error context.
 */
export function installGlobalCrashLogger(getCurrentRoute: () => string) {
  installConsoleDevelopmentLogger();
  if (isGlobalHandlerInstalled) return;

  const errorUtils = (globalThis as any)?.ErrorUtils;
  if (!errorUtils?.getGlobalHandler || !errorUtils?.setGlobalHandler) return;

  const previousHandler = errorUtils.getGlobalHandler();

  errorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    const route = getCurrentRoute();
    const fatal = Boolean(isFatal);
    const currentBreadcrumbs = getCrashBreadcrumbs();

    originalConsoleError("[CrashLog][GlobalJSException]", {
      route,
      isFatal: fatal,
      name: error?.name ?? "UnknownError",
      message: error?.message ?? "Unknown message",
      stack: error?.stack ?? null,
      breadcrumbs: currentBreadcrumbs,
    });

    void logAppException({
      location: `GlobalJSException:${route}`,
      errorName: error?.name ?? 'UnknownError',
      isFatal: fatal,
    });
    void reportCrashError({
      location: `GlobalJSException:${route}`,
      error,
      breadcrumbs: currentBreadcrumbs,
      isFatal: fatal,
    });

    if (typeof previousHandler === "function") {
      previousHandler(error, isFatal);
    }
  });

  isGlobalHandlerInstalled = true;
}
