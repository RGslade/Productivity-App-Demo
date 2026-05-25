import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, Linking, Alert, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import LocationService from '@/hooks/locationHandler';
import { HelpfulLink, getHelpfulLinksForCountry } from '@/types/links';
import { copyToClipboard, getCurrentCountryCodeFromLocale } from '@/hooks/dataHandler';
import { useThemeColour } from '@/hooks/useThemeColour';

const CATEGORY_ORDER = [
  'Emergency',
  'Government',
  'Housing',
  'Employment',
  'Finance',
  'Health',
  'Education',
  'Transport',
  'Wellbeing',
  'Consumer',
];

/** Returns a stable category rank so all regional link sets read in a practical order. */
const getCategoryRank = (category: string) => {
  const categoryIndex = CATEGORY_ORDER.indexOf(category);
  return categoryIndex === -1 ? CATEGORY_ORDER.length : categoryIndex;
};

/** Sorts regional links by practical category first, then priority and title. */
const sortHelpfulLinks = (links: HelpfulLink[]) =>
  [...links].sort((a, b) => {
    const categoryDifference = getCategoryRank(a.category) - getCategoryRank(b.category);
    if (categoryDifference !== 0) return categoryDifference;

    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }

    return a.title.localeCompare(b.title);
  });

export default function LinksScreen() {
  const [links, setLinks] = useState<HelpfulLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const backgroundColour = useThemeColour({}, 'background');
  const textColour = useThemeColour({}, 'text');
  const cardBackgroundColour = useThemeColour({}, 'cardBackground');
  const locationAwareLinkIds = new Set([
    'gov-uk-council',
    'gov-uk-book-theory-test',
    'gov-uk-book-driving-test',
  ]);

  useEffect(() => {
    setCountryCode(getCurrentCountryCodeFromLocale());
    loadLinks();
  }, []);

  const loadLinks = async () => {
    try {
      setLoading(true);
      const detectedCountryCode = getCurrentCountryCodeFromLocale();
      setCountryCode(detectedCountryCode);
      const regionSpecificLinks = getHelpfulLinksForCountry(detectedCountryCode);

      setLinks(sortHelpfulLinks(regionSpecificLinks));
    } finally {
      setLoading(false);
    }
  };
  const isRegionSupported = countryCode ? getHelpfulLinksForCountry(countryCode).length > 0 : false;

  const categories = ['All', ...Array.from(new Set(links.map(link => link.category))).sort((a, b) => {
    const categoryDifference = getCategoryRank(a) - getCategoryRank(b);
    return categoryDifference !== 0 ? categoryDifference : a.localeCompare(b);
  })];
  const filteredLinks = selectedCategory === 'All' ? links : links.filter(link => link.category === selectedCategory);

  /** Copies emergency phone numbers instead of opening the dialler. */
  const handleEmergencyPhoneLink = (link: HelpfulLink) => {
    const phoneNumber = link.url.replace('tel:', '');
    copyToClipboard(phoneNumber);
    Alert.alert(
      'Emergency number copied',
      `Calling ${phoneNumber} has been disabled to prevent accidental calls. The number has been copied to your clipboard so you can paste it into your phone keypad.`
    );
  };

  const handleLinkPress = async (link: HelpfulLink) => {
    try {
      if (link.url.startsWith('tel:')) {
        if (link.category === 'Emergency') {
          handleEmergencyPhoneLink(link);
          return;
        }

        // Handle phone number links
        const phoneNumber = link.url.replace('tel:', '');
        Alert.alert('Call ' + phoneNumber, `Would you like to call ${link.title}?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Call', onPress: () => Linking.openURL(link.url) }]);
      } else {
        // Handle web links
        const supported = await Linking.canOpenURL(link.url);
        if (supported) {
          if (locationAwareLinkIds.has(link.id)) {
            const postcode = await LocationService.PostCode();
            if (postcode) {
              copyToClipboard(postcode);
              Alert.alert('Postcode copied', 'Your postcode has been copied to your clipboard for faster centre or council search.');
            }
          }
          await Linking.openURL(link.url);
        } else {
          Alert.alert('Error', 'Unable to open this link');
        }
      }
    } catch (error) {
      console.error('Opening link failed', error);
    }
  };

  const getCategoryColour = (category: string): string => {
    const colours: { [key: string]: string } = {
      Government: '#3B82F6',
      Health: '#EF4444',
      Finance: '#10B981',
      Employment: '#F59E0B',
      Education: '#8B5CF6',
      Housing: '#F97316',
      Wellbeing: '#EC4899',
      Emergency: '#DC2626',
      Transport: '#6366F1',
      Consumer: '#059669',
    };
    return colours[category] || '#6B7280';
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={styles.loadingContainer}>
          <LoadingSpinner />
          <ThemedText style={styles.loadingText}>Loading helpful links...</ThemedText>
        </ThemedView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container} >
      <ScrollView style={[styles.scrollContainer, !isRegionSupported && styles.blurredContent]} scrollEnabled={isRegionSupported}>
        <ThemedView style={styles.content} lightColour={backgroundColour} darkColour={backgroundColour}>
          <ThemedView style={styles.header} lightColour={backgroundColour} darkColour={backgroundColour}>
            <ThemedText type="title" style={styles.title}>
              Important shortcuts for navigating life
            </ThemedText>
          </ThemedView>

          <Card style={styles.disclaimerCard}>
            <ThemedText type="defaultSemiBold" style={styles.disclaimerTitle}>
              External services disclaimer
            </ThemedText>
            <ThemedText style={styles.disclaimerText}>
              Productivity Mobile App is not responsible for any website content or telephone responses from external services accessed through this app.
            </ThemedText>
          </Card>

          {/* Category Filter */}
          <ThemedView style={styles.filterCard} lightColour={backgroundColour} darkColour={backgroundColour}>
            <ThemedText style={styles.filterTitle}>Filter by Category:</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              <ThemedView style={styles.categoryContainer} lightColour={backgroundColour} darkColour={backgroundColour}>
                {categories.map((category) => (
                  <TouchableOpacity key={category} style={[styles.categoryChip, selectedCategory === category && styles.categoryChipActive, { backgroundColor: selectedCategory === category ? getCategoryColour(category) : cardBackgroundColour }
                  ]}
                    onPress={() => setSelectedCategory(category)}>
                    <ThemedText style={[styles.categoryChipText, {color: textColour}, selectedCategory === category && styles.categoryChipTextActive]}>
                      {category}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </ThemedView>
            </ScrollView>
          </ThemedView>

          {/* Links List */}
          <ThemedView lightColour={backgroundColour} darkColour={backgroundColour}>
            {filteredLinks.map((link) => (
              <TouchableOpacity key={link.id} onPress={() => handleLinkPress(link)}>
                <Card>
                  <ThemedView style={styles.linkHeader}>
                    <ThemedText style={styles.linkIcon}>{link.icon}</ThemedText>
                    <ThemedView style={styles.linkInfo}>
                      <ThemedText type="defaultSemiBold" style={styles.linkTitle}>
                        {link.title}
                      </ThemedText>
                      <ThemedView style={[styles.categoryBadge, { backgroundColor: getCategoryColour(link.category) }]}>
                        <ThemedText style={styles.categoryBadgeText}>
                          {link.category}
                        </ThemedText>
                      </ThemedView>
                    </ThemedView>
                    <ThemedText style={styles.externalIcon}>
                      {link.url.startsWith('tel:') ? '📞' : '🔗'}
                    </ThemedText>
                  </ThemedView>
                  <ThemedText style={styles.linkDescription}>
                    {link.description}
                  </ThemedText>
                  <ThemedText style={styles.linkUrl}>
                    {link.url.startsWith('tel:') ? `Call: ${link.url.replace('tel:', '')}` : link.url.replace('https://', '').replace('http://', '')}
                  </ThemedText>
                </Card>
              </TouchableOpacity>
            ))}
          </ThemedView>

          {/* Footer Information */}
          <ThemedView style={styles.footerCard} lightColour={backgroundColour} darkColour={backgroundColour}>
            <ThemedText type="defaultSemiBold" style={styles.footerTitle}>
              Important Notes
            </ThemedText>
            <ThemedView style={styles.footerInfo} lightColour={backgroundColour} darkColour={backgroundColour}>
              <ThemedText style={styles.footerBullet}>
                • Links open in your device&apos;s default browser or app
              </ThemedText>
              <ThemedText style={styles.footerBullet}>
                • Services may have specific eligibility requirements
              </ThemedText>
              <ThemedText style={styles.footerBullet}>
                • Always verify information with official sources
              </ThemedText>
              <ThemedText style={styles.footerBullet}>
                • Contact details may change - check official websites for updates
              </ThemedText>
            </ThemedView>
            <ThemedText style={styles.footerDisclaimer}>
              These links are provided for information purposes. Productivity Mobile App is not responsible for the content or availability of external websites.
            </ThemedText>
          </ThemedView>
        </ThemedView>
      </ScrollView>
      {!isRegionSupported ? (
        <View style={styles.regionOverlay}>
          <ThemedView style={styles.regionOverlayCard}>
            <ThemedText type="defaultSemiBold" style={styles.regionOverlayTitle}>
              Content unavailable in your region
            </ThemedText>
            <ThemedText style={styles.regionOverlayText}>
              This content is not available in your region yet. We are currently working on bringing this to your region soon, along with more regional and language features.
            </ThemedText>
          </ThemedView>
        </View>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  regionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  regionOverlayCard: {
    borderRadius: 12,
    padding: 16,
    maxWidth: 460,
  },
  regionOverlayTitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 8,
  },
  regionOverlayText: {
    textAlign: 'center',
    lineHeight: 20,
  },
  scrollContainer: {
    flex: 1,
  },
  blurredContent: {
    opacity: 0.35,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    opacity: 0.7,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center'
  },
  disclaimerCard: {
    marginBottom: 12,
    paddingVertical: 10,
  },
  disclaimerTitle: {
    fontSize: 14,
    marginBottom: 6,
  },
  disclaimerText: {
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.85,
  },
  filterCard: {
    padding: 5,
    marginBottom: 5,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
  },
  categoryScroll: {
    flexGrow: 0,
  },
  categoryContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 5,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 60,
    alignItems: 'center',
  },
  categoryChipActive: {
    // Color set dynamically
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: 'white',
  },
  linkHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  linkIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  linkInfo: {
    flex: 1,
  },
  linkTitle: {
    fontSize: 16,
  },
  categoryBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  categoryBadgeText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '500',
  },
  externalIcon: {
    fontSize: 16,
    opacity: 0.6,
    marginLeft: 8,
  },
  linkDescription: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 8,
    lineHeight: 20,
  },
  linkUrl: {
    fontSize: 12,
    opacity: 0.6,
    fontFamily: 'monospace',
  },
  footerCard: {
    padding: 5,
  },
  footerTitle: {
    fontSize: 14,
    marginBottom: 12,
  },
  footerInfo: {
    marginBottom: 12,
  },
  footerBullet: {
    fontSize: 12,
    opacity: 0.8,
    marginBottom: 4,
    lineHeight: 18,
  },
  footerDisclaimer: {
    fontSize: 11,
    opacity: 0.6,
    fontStyle: 'italic',
    lineHeight: 16,
  },
});
