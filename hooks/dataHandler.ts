import { getCurrentUser } from '@/lib/supabase';
import * as Clipboard from 'expo-clipboard';
import { Alert, Platform } from 'react-native';

export const SUPPORTED_REGIONAL_COUNTRIES = ['GB', 'IN', 'CN', 'US', 'ID', 'PK', 'NG', 'BR', 'BD', 'RU', 'MX', 'CA', 'FR', 'ES', 'DE', 'PT', 'IE', 'AU', 'IT', 'NL', 'JP'] as const;
export const MY_NEWS_SUPPORTED_COUNTRIES = ['GB'] as const;

export type SupportedRegionalCountryCode = typeof SUPPORTED_REGIONAL_COUNTRIES[number];
export type MyNewsSupportedCountryCode = typeof MY_NEWS_SUPPORTED_COUNTRIES[number];
export const minutesToMilliseconds = (minutes: number) => {
    return (minutes * 60) * 1000
}

export const GetCurrentMonth = () => {
    return new Date().getMonth() + 1;
}

export const GetCurrentYear = () => {
    return new Date().getFullYear();
}

export function copyToClipboard(text: string) {
    Clipboard.setStringAsync(text);
}

type AlertAction = {
    text: string;
    onPress?: () => void;
    style?: "default" | "cancel" | "destructive";
};

/** Shows a native alert, or a browser alert/confirm that still runs button callbacks on web. */
export function showAlert(
    title: string,
    message: string,
    actions: AlertAction[] = [{ text: 'OK', onPress: undefined, style: undefined }]
) {
    if (Platform.OS !== 'web') {
        Alert.alert(title, message, actions);
        return;
    }

    const browserWindow = typeof window !== 'undefined' ? window : null;
    if (!browserWindow) return;

    const body = `${title}\n${message}`;
    const cancelAction = actions.find(action => action.style === 'cancel');
    const confirmAction =
        actions.find(action => action.style === 'destructive') ??
        actions.find(action => action.style !== 'cancel') ??
        actions[0];

    if (actions.length <= 1 || !cancelAction) {
        browserWindow.alert(body);
        confirmAction?.onPress?.();
        return;
    }

    if (browserWindow.confirm(body)) {
        confirmAction?.onPress?.();
    } else {
        cancelAction.onPress?.();
    }
}

export function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    })
};

export function validateAuthUser(): boolean { //What is this?
    const user = getCurrentUser();
    return !!user;
}

/** Extracts an ISO country code from a locale tag if one is present. */
function getCountryCodeFromLocaleTag(localeTag: string | null | undefined): string | null {
    if (!localeTag) return null;

    const localeParts = localeTag.replace('_', '-').split('-');
    const countryCode = localeParts[1];
    return countryCode ? countryCode.toUpperCase() : null;
}

export function getCurrentCountryCodeFromLocale(): string | null {
    const localeCandidates: string[] = [];
    const resolvedOptions = Intl.DateTimeFormat().resolvedOptions();
    const resolvedLocale = resolvedOptions.locale;

    if (resolvedLocale) localeCandidates.push(resolvedLocale);
    if (typeof navigator !== 'undefined' && Array.isArray(navigator.languages)) {
        localeCandidates.push(...navigator.languages);
    }

    for (const candidate of localeCandidates) {
        const candidateCountryCode = getCountryCodeFromLocaleTag(candidate);
        if (candidateCountryCode) {
            return candidateCountryCode;
        }
    }

        return null;
}

export function isRegionalContentAvailable(countryCode: string | null): boolean {
    return countryCode
        ? SUPPORTED_REGIONAL_COUNTRIES.includes(countryCode as SupportedRegionalCountryCode)
        : false;
}

/** Returns true when My News content is available for the current device country. */
export function isMyNewsAvailable(countryCode: string | null): boolean {
    return countryCode
        ? MY_NEWS_SUPPORTED_COUNTRIES.includes(countryCode as MyNewsSupportedCountryCode)
        : false;
}
