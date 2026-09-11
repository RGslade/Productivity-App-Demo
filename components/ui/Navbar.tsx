import { TrackedTouchableOpacity as TouchableOpacity } from '@/components/ui/TrackedTouchableOpacity';
import React, { useState } from 'react';
import { View, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { useThemeColour } from '@/hooks/useThemeColour';
import { useAuth } from '@/hooks/useAuth';
import { logError } from '@/services/crashLogger';
import { isDestinationActive, TOP_LEVEL_DESTINATIONS } from '@/constants/AppNavigation';
import { replaceTopLevelRoute } from '@/services/navigationService';

interface NavbarProps {
  title: string;
  userName?: string;
  showBack?: boolean;
  onBack?: () => void;
}

export function Navbar({ title, showBack, onBack }: NavbarProps) {
  const [isNavigating, setIsNavigating] = useState(false);
  const [isWebMenuOpen, setIsWebMenuOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWebHeader = Platform.OS === 'web';
  const useBurgerWebNav = Platform.OS === 'web' && width < 1180;
  const { logout, userInfo, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const backgroundColor = useThemeColour({}, 'navigationBackground');
  const textColor = useThemeColour({}, 'text');
  const borderColor = useThemeColour({}, 'border');
  const premiumAccent = useThemeColour({}, 'premiumAccent');

  const handleLogout = async () => {
    try {
      if (isNavigating) return;
      setIsNavigating(true);
      await logout();
    } catch (error) {
      logError('Navbar.handleLogout', error, { pathname });
    } finally {
      setIsNavigating(false);
    }
  };

  const navigateTo = (path: string) => {
    if (isNavigating) return;
    if (pathname === path || (path === '/(tabs)' && pathname === '/')) {
      setIsWebMenuOpen(false);
      return;
    }
    setIsNavigating(true);
    try {
      replaceTopLevelRoute(path);
      setIsWebMenuOpen(false);
    } finally {
      setIsNavigating(false);
    }
  };

  const displayName = userInfo?.first_name || 'User';
  const pageTitle = title === 'Dashboard' ? `Welcome back, ${displayName}` : title;
  const pageTitleStyle = title === 'Dashboard' && userInfo?.is_premium_user ? { color: premiumAccent } : undefined;
  const forcedBackTitles = new Set([
    'Edit Transaction',
    'Document Viewer',
    'Add Transaction',
    'Add Task',
    'Edit Task',
    'Add Task / Checklist',
    'Edit Task / Checklist',
    'Add Note',
    'Edit Note',
    'Add Grade',
    'Edit Grade',
  ]);
  const topLevelTitles = new Set([
    'Dashboard',
    'Budget',
    'Tasks & Checklists',
    'Help',
    'Grades',
    'Notes',
    'Exams',
    'LifeNest',
    'LifeNest Premium',
    'My News',
    'Job Search',
    'Housing Search',
    'Settings & Feedback',
    'Help & Feedback',
  ]);
  const shouldShowBack = forcedBackTitles.has(title)
    ? true
    : topLevelTitles.has(title)
      ? false
      : Boolean(showBack);

  const authOnlyTitles = new Set(['Login', 'Register', 'Forgot Password', 'Change Password']);

  if (!isAuthenticated || authOnlyTitles.has(title)) {
    return null;
  }

  if (isWebHeader) {
    return (
      <View style={[styles.desktopNavbar, useBurgerWebNav && styles.desktopNavbarCompact, { backgroundColor, borderBottomColor: borderColor }]}>
        <View style={styles.desktopBrandRow}>
          {shouldShowBack && (
            <TouchableOpacity analyticsId="navbar_desktop_back" analyticsControlType="icon" onPress={() => {
              onBack?.();
            }} style={styles.desktopIconButton}>
              <Ionicons name="arrow-back" size={22} color={textColor} />
            </TouchableOpacity>
          )}
          <ThemedText numberOfLines={1} ellipsizeMode="tail" type="subtitle" style={[styles.desktopTitle, pageTitleStyle]}>{pageTitle}</ThemedText>
        </View>
        {useBurgerWebNav ? (
          <View style={styles.desktopMenuWrap}>
            <TouchableOpacity
              analyticsId="navbar_desktop_menu"
              analyticsControlType="button"
              accessibilityRole="button"
              accessibilityLabel="Open navigation menu"
              accessibilityState={{ expanded: isWebMenuOpen }}
              onPress={() => setIsWebMenuOpen((value) => !value)}
              style={styles.desktopIconButton}
            >
              <Ionicons name={isWebMenuOpen ? 'close-outline' : 'menu-outline'} size={24} color={textColor} />
            </TouchableOpacity>
            {isWebMenuOpen ? (
              <View style={[styles.desktopMenuPanel, { backgroundColor, borderColor }]}>
                {TOP_LEVEL_DESTINATIONS.map((item) => {
                  const active = isDestinationActive(item, pathname);
                  const exactCurrent = pathname === item.route || (item.route === '/(tabs)' && pathname === '/');
                  return (
                    <TouchableOpacity
                      key={item.key}
                      analyticsId={`navbar_desktop_menu_${item.key}`}
                      analyticsControlType="menu_item"
                      accessibilityLabel={item.label}
                      accessibilityState={{ selected: active }}
                      disabled={exactCurrent}
                      onPress={exactCurrent ? undefined : () => navigateTo(item.route)}
                      style={[styles.desktopMenuItem, active && { backgroundColor: `${premiumAccent}22` }]}
                    >
                      <Ionicons name={item.icon} size={19} color={active ? premiumAccent : textColor} />
                      <ThemedText style={styles.desktopMenuText}>{item.label}</ThemedText>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity analyticsId="navbar_desktop_menu_logout" analyticsControlType="button" onPress={handleLogout} style={styles.desktopMenuItem}>
                  <Ionicons name="log-out-outline" size={20} color={textColor} />
                  <ThemedText style={styles.desktopMenuText}>Log out</ThemedText>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.desktopLinks}>
            {TOP_LEVEL_DESTINATIONS.map((item) => {
              const active = isDestinationActive(item, pathname);
              const exactCurrent = pathname === item.route || (item.route === '/(tabs)' && pathname === '/');
              return (
                <TouchableOpacity
                  key={item.key}
                  analyticsId={`navbar_desktop_${item.key}`}
                  analyticsControlType="menu_item"
                  accessibilityLabel={item.label}
                  accessibilityState={{ selected: active }}
                  disabled={exactCurrent}
                  onPress={exactCurrent ? undefined : () => navigateTo(item.route)}
                  style={[styles.desktopIconLink, active && styles.desktopActiveLink, active && { backgroundColor: `${premiumAccent}22` }]}
                >
                  {active ? (
                    <ThemedText style={[styles.desktopActiveLinkText, { color: premiumAccent }]}>{item.shortLabel}</ThemedText>
                  ) : (
                    <Ionicons name={item.icon} size={19} color={textColor} />
                  )}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity analyticsId="navbar_desktop_logout" analyticsControlType="button" accessibilityLabel="Log out" onPress={handleLogout} style={styles.desktopIconButton}>
              <Ionicons name="log-out-outline" size={22} color={textColor} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  return (
    <View>
      <View style={[styles.navbar, { backgroundColor, borderBottomColor: borderColor, paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.topRow}>
          <View style={styles.mobileTitleRow}>
            {shouldShowBack && (
              <TouchableOpacity analyticsId="navbar_back" analyticsControlType="icon" onPress={() => {
                onBack?.();
              }} style={styles.mobileBackButton}>
                <Ionicons name="arrow-back" size={22} color={textColor} />
              </TouchableOpacity>
            )}
            <ThemedText numberOfLines={1} ellipsizeMode="tail" type="subtitle" style={[styles.pageTitle, pageTitleStyle]}>
              {pageTitle}
            </ThemedText>
          </View>
          <TouchableOpacity analyticsId="navbar_logout" analyticsControlType="button" onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={24} color={textColor} />
          </TouchableOpacity>
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  desktopNavbar: {
    minHeight: 72,
    paddingHorizontal: 32,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 24,
    zIndex: 1000,
  },
  desktopNavbarCompact: {
    paddingHorizontal: 18,
    gap: 12,
  },
  desktopBrandRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  desktopTitle: {
    fontSize: 20,
    flexShrink: 1,
  },
  desktopLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  desktopIconLink: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  desktopActiveLink: {
    width: 'auto',
    minWidth: 42,
    paddingHorizontal: 8,
  },
  desktopActiveLinkText: {
    fontSize: 13,
    fontWeight: '700',
  },
  desktopIconButton: {
    padding: 10,
    borderRadius: 14,
  },
  desktopMenuWrap: {
    position: 'relative',
    alignItems: 'flex-end',
  },
  desktopMenuPanel: {
    position: 'absolute',
    top: 48,
    right: 0,
    width: 240,
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    zIndex: 1001,
  },
  desktopMenuItem: {
    minHeight: 42,
    borderRadius: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  desktopMenuText: {
    fontSize: 14,
    fontWeight: '700',
  },
  navbar: {
    paddingHorizontal: 18,
    paddingBottom: 10,
    borderBottomWidth: 1,
    zIndex: 1000,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  mobileTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  mobileBackButton: {
    paddingVertical: 8,
    paddingRight: 4,
  },
  logoutButton: {
    padding: 8,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
});
