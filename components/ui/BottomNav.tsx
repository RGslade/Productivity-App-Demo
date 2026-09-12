import React, { useEffect } from 'react';
import { LayoutAnimation, Platform, StyleSheet, Text, UIManager, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TrackedTouchableOpacity } from './TrackedTouchableOpacity';
import { useThemeColour } from '@/hooks/useThemeColour';
import { useThemeContext } from '@/providers/ThemeProvider';
import { AppFonts } from '@/constants/Fonts';
import { AppNavigationDestination, isDestinationActive, TOP_LEVEL_DESTINATIONS } from '@/constants/AppNavigation';
import { replaceTopLevelRoute } from '@/services/navigationService';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

/** Routes the add button targets, chosen from wherever the user already is. */
const ADD_ROUTES: { match: string; route: string; label: string }[] = [
  { match: '/budget', route: '/budget/add', label: 'Add transaction' },
  { match: '/help', route: '/help/add', label: 'Add custom link' },
  { match: '/notes', route: '/notes/add', label: 'Add note' },
  { match: '/todo', route: '/todo/add', label: 'Add task' },
  { match: '/exams', route: '/exams/add', label: 'Add exam' },
];

interface NavButtonProps {
  destination: AppNavigationDestination;
  active: boolean;
  disabled: boolean;
  compact: boolean;
  onPress: () => void;
  activeBackground: string;
  activeColour: string;
  restColour: string;
}

/** One compact tab; only the active tab shows text so every screen fits in one row. */
function NavButton({destination, active, disabled, compact, onPress, activeBackground, activeColour, restColour, }: NavButtonProps) {
  return (
    <TrackedTouchableOpacity
      analyticsId={`bottom_nav_${destination.key}`}
      analyticsControlType="link"
      accessibilityRole="tab"
      accessibilityLabel={destination.label}
      accessibilityState={{ selected: active }}
      activeOpacity={0.85}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.navButton,
        compact && styles.navButtonCompact,
        active && styles.navButtonActive,
        active && { backgroundColor: activeBackground },
      ]}
    >
      {active ? (
        <View style={styles.labelClip}>
          <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.navLabel, { color: activeColour }]}>
            {destination.shortLabel}
          </Text>
        </View>
      ) : (
        <Ionicons name={destination.icon} size={compact ? 16 : 19} color={restColour} />
      )}
    </TrackedTouchableOpacity>
  );
}

interface BottomNavProps {
  bottomOffset?: number;
}

/** Warm floating navigation rail for the core app screens plus contextual add. */
export function BottomNav({ bottomOffset = 0 }: BottomNavProps) {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { theme } = useThemeContext();
  const navBackground = useThemeColour({}, 'navigationBackground');
  const text = useThemeColour({}, 'text');
  const textLight = useThemeColour({}, 'textLight');
  const border = useThemeColour({}, 'border');
  const shadowColour = useThemeColour({}, 'shadowColor');
  const background = useThemeColour({}, 'background');
  const isEducationRoute = pathname.startsWith('/exams') || pathname.startsWith('/grades');
  const addAction = isEducationRoute
    ? { match: '/exams', route: '/exams/add', label: 'Add education' }
    : ADD_ROUTES.find((entry) => pathname.startsWith(entry.match));
  const [showEducationAddMenu, setShowEducationAddMenu] = React.useState(false);
  const hasAddAction = Boolean(addAction);
  useEffect(() => {
    setShowEducationAddMenu(false);
    LayoutAnimation.configureNext({
      duration: 180,
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    });
  }, [pathname]);

  const navigate = (route: string) => {
    if (pathname === route || (route === '/(tabs)' && pathname === '/')) {
      return;
    }

    replaceTopLevelRoute(route);
  };

  return (
    <View style={[styles.wrapper, { bottom: bottomOffset, paddingBottom: Math.max(insets.bottom, 14), pointerEvents: 'box-none' }]}>
      <View style={[styles.group, { width: width - 12 }]}>
        <View
          accessibilityRole="tablist"
          style={[
            styles.pill,
            {
              backgroundColor: Platform.OS === 'web'
                ? `${navBackground}${theme === 'dark' ? 'F2' : 'E8'}`
                : navBackground,
              borderColor: border,
              shadowColor: shadowColour,
            },
          ]}
        >
          {TOP_LEVEL_DESTINATIONS.map((destination) => (
            <NavButton
              key={destination.key}
              destination={destination}
              active={isDestinationActive(destination, pathname)}
              disabled={pathname === destination.route || (destination.route === '/(tabs)' && pathname === '/')}
              compact={hasAddAction}
              onPress={() => navigate(destination.route)}
              activeBackground={theme === 'dark' ? 'rgba(247, 244, 236, 0.10)' : 'rgba(30, 28, 25, 0.07)'}
              activeColour={text}
              restColour={textLight}
            />
          ))}
        </View>

        {addAction ? (
          <>
          {isEducationRoute && showEducationAddMenu ? (
            <View style={[styles.educationAddMenu, { backgroundColor: navBackground, borderColor: border, shadowColor: shadowColour }]}>
              <TrackedTouchableOpacity analyticsId="bottom_nav_add_exam" analyticsControlType="button" onPress={() => { setShowEducationAddMenu(false); router.push('/exams/add' as any); }} style={styles.educationAddOption}>
                <Text style={[styles.educationAddOptionText, { color: text }]}>Exam</Text>
              </TrackedTouchableOpacity>
              <TrackedTouchableOpacity analyticsId="bottom_nav_add_grade" analyticsControlType="button" onPress={() => { setShowEducationAddMenu(false); router.push('/grades/add' as any); }} style={styles.educationAddOption}>
                <Text style={[styles.educationAddOptionText, { color: text }]}>Grade</Text>
              </TrackedTouchableOpacity>
            </View>
          ) : null}
          <TrackedTouchableOpacity
            analyticsId="bottom_nav_add"
            analyticsControlType="button"
            accessibilityRole="button"
            accessibilityLabel={addAction.label}
            activeOpacity={0.85}
            onPress={() => isEducationRoute ? setShowEducationAddMenu(value => !value) : router.push(addAction.route as any)}
            style={[styles.addButton, { backgroundColor: text, shadowColor: shadowColour }]}
          >
            <Ionicons name="add" size={22} color={background} />
          </TrackedTouchableOpacity>
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    right: 0,
    left: 0,
    alignItems: 'center',
  },
  group: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '100%',
  },
  educationAddMenu: {
    position: 'absolute',
    right: 0,
    bottom: 58,
    minWidth: 104,
    padding: 6,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 8,
  },
  educationAddOption: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 9,
  },
  educationAddOptionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 2,
    height: 50,
    paddingHorizontal: 2,
    paddingVertical: 5,
    borderRadius: 22,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 8,
    ...Platform.select({
      web: { backdropFilter: 'blur(20px) saturate(1.16)' } as object,
      default: {},
    }),
  },
  navButton: {
    width: 32,
    flexGrow: 0,
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
    height: 50,
    minWidth: 0,
    paddingHorizontal: 2,
    paddingVertical: 0,
    borderRadius: 17,
  },
  navButtonCompact: {
    width: 28,
  },
  navButtonActive: {
    width: 'auto',
    flexGrow: 0,
    flexShrink: 0,
    paddingHorizontal: 3,
    paddingVertical: 5,
  },
  labelClip: {
    overflow: 'hidden',
    maxWidth: '100%',
  },
  navLabel: {
    fontFamily: AppFonts.bold,
    fontSize: 12,
    letterSpacing: 0,
    lineHeight: 14,
    textAlign: 'center',
  },
  addButton: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 10,
  },
});

export default BottomNav;
