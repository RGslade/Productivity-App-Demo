import type { Ionicons } from '@expo/vector-icons';

export type AppNavigationDestination = {
  key: string;
  label: string;
  shortLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  matches: string[];
};

export const TOP_LEVEL_DESTINATIONS: AppNavigationDestination[] = [
  { key: 'today', label: 'Today', shortLabel: 'Home', icon: 'home-outline', route: '/(tabs)', matches: ['/', '/(tabs)'] },
  { key: 'money', label: 'Money', shortLabel: 'Budget', icon: 'pie-chart-outline', route: '/budget', matches: ['/budget'] },
  { key: 'nest', label: 'Nest', shortLabel: 'Nest', icon: 'list-outline', route: '/todo', matches: ['/todo'] },
  { key: 'help', label: 'Help', shortLabel: 'Help', icon: 'compass-outline', route: '/help', matches: ['/help', '/documents', '/links'] },
  { key: 'news', label: 'My News', shortLabel: 'News', icon: 'newspaper-outline', route: '/myNews', matches: ['/myNews'] },
  { key: 'notes', label: 'Notes', shortLabel: 'Notes', icon: 'document-text-outline', route: '/notes', matches: ['/notes'] },
  { key: 'exams', label: 'Education', shortLabel: 'Education', icon: 'school-outline', route: '/exams', matches: ['/exams', '/grades'] },
  { key: 'lifenest', label: 'LifeNest', shortLabel: 'Chatbot', icon: 'sparkles-outline', route: '/lifenest', matches: ['/lifenest'] },
  { key: 'you', label: 'You', shortLabel: 'You', icon: 'person-outline', route: '/settings', matches: ['/settings'] },
];

/** True when the destination should appear selected for the current route. */
export function isDestinationActive(destination: AppNavigationDestination, pathname: string) {
  return destination.matches.some((match) => pathname === match || (match !== '/' && pathname.startsWith(`${match}/`))) ||
    (destination.key !== 'today' && pathname.startsWith(`${destination.route}/`));
}
