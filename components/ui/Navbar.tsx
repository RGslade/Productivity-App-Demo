import React, { useEffect, useState } from 'react';
import { Alert, View, StyleSheet, TouchableOpacity, Animated, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { useThemeColour } from '@/hooks/useThemeColour';
import { useAuth } from '@/hooks/useAuth';
import { lifeNestService } from '@/services/lifeNestService';

interface NavbarProps {
  title: string;
  userName?: string;
  showBack?: boolean;
  onBack?: () => void;
}

export function Navbar({ title, showBack, onBack }: NavbarProps) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-300));
  const [isNavigating, setIsNavigating] = useState(false);
  const [lifeNestTokenCount, setLifeNestTokenCount] = useState<number | null>(null);
  const insets = useSafeAreaInsets();
  const { logout, userInfo, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const backgroundColor = useThemeColour({}, 'navigationBackground');
  const textColor = useThemeColour({}, 'text');
  const borderColor = useThemeColour({}, 'border');
  const premiumAccent = useThemeColour({}, 'premiumAccent');

  const currentPageStyle = {
    backgroundColor: `${premiumAccent}22`,
    borderTopColor: premiumAccent,
    borderBottomColor: premiumAccent,
    borderTopWidth: 2,
    borderBottomWidth: 2,
  };

  const toggleMenu = () => {
    if (menuVisible) {
      Animated.timing(slideAnim, {
        toValue: -300,
        duration: 100,
        useNativeDriver: true,
      }).start(() => setMenuVisible(false));
    } else {
      setMenuVisible(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleLogout = async () => {
    try {
      if (isNavigating) return;
      setIsNavigating(true);
      toggleMenu();
      await logout();
    } catch (error) {
      console.error('Navbar logout failed', error);
    } finally {
      setIsNavigating(false);
    }
  };

  const navigateTo = (path: string) => {
    if (isNavigating) return;
    if (pathname === path || (path === '/(tabs)' && pathname === '/')) {
      toggleMenu();
      return;
    }
    setIsNavigating(true);
    toggleMenu();
    try {
      router.replace(path as any);
    } finally {
      setIsNavigating(false);
    }
  };

  /** Closes the menu and shows a placeholder for unfinished release features. */
  const showComingSoonAlert = () => {
    if (isNavigating) return;
    toggleMenu();
    Alert.alert('Coming soon', 'This feature is coming soon. Stay tuned.');
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
    'Documents',
    'Notes',
    'LifeNest',
    'LifeNest Premium',
    'Links',
    'My News',
    'Settings & Feedback',
    'Help & Feedback',
  ]);
  const shouldShowBack = forcedBackTitles.has(title)
    ? true
    : topLevelTitles.has(title)
      ? false
      : Boolean(showBack);

  const authOnlyTitles = new Set(['Login', 'Register', 'Forgot Password', 'Change Password']);

  useEffect(() => {
    let isCancelled = false;

    const loadLifeNestTokens = async () => {
      if (!isAuthenticated || !userInfo?.id) {
        if (!isCancelled) {
          setLifeNestTokenCount(null);
        }
        return;
      }

      try {
        const summary = await lifeNestService.getCurrentMonthlyUsageSummary();
        if (!isCancelled) {
          setLifeNestTokenCount(summary.totalTokensRemaining);
        }
      } catch (error) {
        console.error('Navbar LifeNest token load failed', error);
        if (!isCancelled) {
          setLifeNestTokenCount(null);
        }
      }
    };

    void loadLifeNestTokens();

    return () => {
      isCancelled = true;
    };
  }, [isAuthenticated, pathname, userInfo?.id]);

  if (!isAuthenticated || authOnlyTitles.has(title)) {
    return null;
  }

  return (
    <View>
      <View style={[styles.navbar, { backgroundColor, borderBottomColor: borderColor, paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={toggleMenu} style={styles.menuButton}>
            <Ionicons name="menu" size={24} color={textColor} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={24} color={textColor} />
          </TouchableOpacity>
        </View>

        <View style={styles.bottomRow}>
          {shouldShowBack && (
            <TouchableOpacity onPress={onBack} style={{ marginRight: 8 }}>
              <Ionicons name="arrow-back" size={24} color={textColor} />
            </TouchableOpacity>
          )}
          <ThemedText type="subtitle" style={[styles.pageTitle, pageTitleStyle]}>
            {pageTitle}
          </ThemedText>
        </View>
      </View>

      <Modal visible={menuVisible} animationType="none" transparent statusBarTranslucent={false} onRequestClose={toggleMenu}>
        <View style={{ flex: 1 }}>
          <TouchableOpacity style={styles.overlay} onPress={toggleMenu} activeOpacity={1} />
          <Animated.View style={[styles.slideMenu, { backgroundColor, borderRightColor: borderColor, transform: [{ translateX: slideAnim }], paddingTop: Math.max(insets.top, 16) }]}>
            <View style={[styles.menuHeader, { borderBottomColor: borderColor }]}>
              <ThemedText type="title" style={styles.menuTitle}>
                Menu
              </ThemedText>
              <TouchableOpacity onPress={toggleMenu}>
                <Ionicons name="close" size={24} color={textColor} />
              </TouchableOpacity>
            </View>
            <View style={styles.menuItems}>
              <TouchableOpacity style={[styles.menuItem, title === 'Dashboard' ? currentPageStyle : {}]} onPress={() => navigateTo('/(tabs)')}>
                <Ionicons name="home-outline" size={20} color={textColor} />
                <ThemedText style={styles.menuItemText}>Dashboard</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.menuItem, title === 'Tasks & Checklists' ? currentPageStyle : {}]} onPress={() => navigateTo('/todo')}>
                <Ionicons name="checkbox-outline" size={20} color={textColor} />
                <ThemedText style={styles.menuItemText}>Tasks & Checklists</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.menuItem, title === 'Job Search' ? currentPageStyle : {}]} onPress={showComingSoonAlert}>
                <Ionicons name="briefcase-outline" size={20} color={textColor} />
                <ThemedText style={styles.menuItemText}>Job Search</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.menuItem, title === 'Budget' ? currentPageStyle : {}]} onPress={() => navigateTo('/budget')}>
                <Ionicons name="wallet-outline" size={20} color={textColor} />
                <ThemedText style={styles.menuItemText}>Budget</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.menuItem, title === 'Links' ? currentPageStyle : {}]} onPress={() => navigateTo('/links')}>
                <Ionicons name="code-outline" size={20} color={textColor} />
                <ThemedText style={styles.menuItemText}>Links</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.menuItem, title === 'My News' ? currentPageStyle : {}]} onPress={() => navigateTo('/myNews')}>
                <Ionicons name="newspaper-outline" size={20} color={textColor} />
                <ThemedText style={styles.menuItemText}>My News</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.menuItem, title === 'Housing Search' ? currentPageStyle : {}]} onPress={showComingSoonAlert}>
                <Ionicons name="business-outline" size={20} color={textColor} />
                <ThemedText style={styles.menuItemText}>Housing Search</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.menuItem, title === 'Documents' ? currentPageStyle : {}]} onPress={() => navigateTo('/documents')}>
                <Ionicons name="document-outline" size={20} color={textColor} />
                <ThemedText style={styles.menuItemText}>Documents</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.menuItem, title === 'Notes' ? currentPageStyle : {}]} onPress={() => navigateTo('/notes')}>
                <Ionicons name="document-text-outline" size={20} color={textColor} />
                <ThemedText style={styles.menuItemText}>Notes</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.menuItem, title === 'LifeNest' ? currentPageStyle : {}]} onPress={() => navigateTo('/lifenest')}>
                <Ionicons name="sparkles-outline" size={20} color={textColor} />
                <ThemedText style={styles.menuItemText}>LifeNest</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.menuItem, title === 'Settings & Feedback' ? currentPageStyle : {}]} onPress={() => navigateTo('/settings')}>
                <Ionicons name="settings-outline" size={20} color={textColor} />
                <ThemedText style={styles.menuItemText}>Settings & Feedback</ThemedText>
              </TouchableOpacity>
            </View>
            {lifeNestTokenCount !== null && (
              <View style={[styles.menuFooter, { borderTopColor: borderColor }]}>
                <View style={styles.menuFooterRow}>
                  <View style={[styles.tokenBadge, { borderColor: premiumAccent, backgroundColor: `${premiumAccent}18` }]}>
                    <Ionicons name="sparkles-outline" size={14} color={premiumAccent} />
                    <ThemedText style={[styles.tokenBadgeText, { color: premiumAccent }]}>
                      {`${lifeNestTokenCount} LifeNest tokens`}
                    </ThemedText>
                  </View>
                  <TouchableOpacity
                    style={[styles.getTokensButton, { backgroundColor: premiumAccent }]}
                    onPress={() => navigateTo('/subscribe')}
                  >
                    <ThemedText style={styles.getTokensButtonText}>Get Tokens</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  navbar: {
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    zIndex: 1000,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuButton: {
    padding: 10,
  },
  logoutButton: {
    padding: 10,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  tokenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tokenBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(5, 9, 20, 0.56)',
    zIndex: 1001,
  },
  slideMenu: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 300,
    height: '100%',
    paddingTop: 10,
    borderRightWidth: 1,
    zIndex: 1002,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  menuItems: {
    paddingTop: 16,
    flex: 1,
  },
  menuFooter: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  menuFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  menuItemText: {
    marginLeft: 16,
    fontSize: 17,
    fontWeight: '600',
  },
  getTokensButton: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  getTokensButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
