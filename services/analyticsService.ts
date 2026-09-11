export type AnalyticsControlType =
  | 'button'
  | 'card'
  | 'filter'
  | 'icon'
  | 'link'
  | 'menu_item'
  | 'list_item'
  | 'selector';

export interface UiPressEvent {
  controlId: string;
  controlType: AnalyticsControlType;
  screen: string;
}

interface AppExceptionEvent {
  location: string;
  errorName: string;
  isFatal?: boolean;
}

interface AppDiagnosticEvent {
  level: 'warn' | 'error';
  location: string;
  message: string;
}

/** Initializes the local analytics boundary without contacting an external provider. */
export const initializeAnalyticsCollection = async (): Promise<void> => undefined;

/** Records an anonymous UI interaction locally for development diagnostics only. */
export const logUiPress = async ({ controlId, controlType, screen }: UiPressEvent): Promise<void> => {
  if (__DEV__) console.debug('[PortfolioAnalytics]', { controlId, controlType, screen });
};

/** Records a handled exception locally for development diagnostics only. */
export const logAppException = async ({ location, errorName, isFatal = false }: AppExceptionEvent): Promise<void> => {
  if (__DEV__) console.debug('[PortfolioAnalyticsException]', { location, errorName, isFatal });
};

/** Records a safe diagnostic locally for development diagnostics only. */
export const logAppDiagnostic = async ({ level, location, message }: AppDiagnosticEvent): Promise<void> => {
  if (__DEV__) console.debug('[PortfolioAnalyticsDiagnostic]', { level, location, message });
};
