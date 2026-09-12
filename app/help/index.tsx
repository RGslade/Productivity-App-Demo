import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { showGlobalInterstitialAd } from '@/components/AdDisplay';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { TrackedTouchableOpacity as TouchableOpacity } from '@/components/ui/TrackedTouchableOpacity';
import { Chip, Eyebrow, HeroCard, ListRow, SectionHeading, StatTile, useHeroSurface } from '@/components/ui/Surfaces';
import { BrandColours, Radii } from '@/constants/Colours';
import { AppFonts } from '@/constants/Fonts';
import { copyToClipboard, getCurrentCountryCodeFromLocale, showAlert } from '@/hooks/dataHandler';
import LocationService from '@/hooks/locationHandler';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { useThemeColour } from '@/hooks/useThemeColour';
import { customLinksService, isCustomLinksUnavailableError } from '@/services/customLinksService';
import { logError } from '@/services/crashLogger';
import { documentService } from '@/services/documentService';
import type { Document } from '@/types/document';
import { HelpfulLink, getHelpfulLinksForCountry } from '@/types/links';

type HelpMode = 'All' | 'Guides' | 'Links' | 'Saved';

const CUSTOM_CATEGORY = 'Custom';

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
  CUSTOM_CATEGORY,
];

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Emergency: 'call-outline',
  Government: 'business-outline',
  Housing: 'home-outline',
  Employment: 'briefcase-outline',
  Finance: 'card-outline',
  Health: 'medical-outline',
  Education: 'school-outline',
  Transport: 'bus-outline',
  Wellbeing: 'heart-outline',
  Consumer: 'receipt-outline',
  Custom: 'bookmark-outline',
};

const CATEGORY_COLOURS: Record<string, string> = {
  Emergency: '#B4472F',
  Government: '#7F8F68',
  Housing: '#C3893B',
  Employment: '#A5652F',
  Finance: '#5E8266',
  Health: '#B4472F',
  Education: '#6B7C86',
  Transport: '#6B665E',
  Wellbeing: '#9A6F73',
  Consumer: '#6E8B7E',
  Custom: '#C05F3C',
};

/** Returns a stable category rank so regional and saved links stay practical to scan. */
const getCategoryRank = (category: string) => {
  const categoryIndex = CATEGORY_ORDER.indexOf(category);
  return categoryIndex === -1 ? CATEGORY_ORDER.length : categoryIndex;
};

/** Sorts links by practical category first, then priority and title. */
const sortHelpfulLinks = (links: HelpfulLink[]) =>
  [...links].sort((a, b) => {
    const categoryDifference = getCategoryRank(a.category) - getCategoryRank(b.category);
    if (categoryDifference !== 0) return categoryDifference;
    if (a.priority !== b.priority) return b.priority - a.priority;
    return a.title.localeCompare(b.title);
  });

/** Returns an icon for a link category. */
function getCategoryIcon(category: string): keyof typeof Ionicons.glyphMap {
  return CATEGORY_ICONS[category] ?? 'link-outline';
}

/** Returns the warm category colour for badges and icons. */
function getCategoryColour(category: string) {
  return CATEGORY_COLOURS[category] ?? BrandColours.brand;
}

/** True when a help document matches the current search text. */
function documentMatchesSearch(document: Document, searchText: string) {
  if (!searchText) return true;
  const haystack = `${document.title} ${document.file_name} ${document.description || ''}`.toLowerCase();
  return haystack.includes(searchText);
}

/** True when a help link matches the current search text. */
function linkMatchesSearch(link: HelpfulLink, searchText: string) {
  if (!searchText) return true;
  const haystack = `${link.title} ${link.description} ${link.category} ${link.url}`.toLowerCase();
  return haystack.includes(searchText);
}

/** Shows the merged Help hub for documents, regional links, and saved links. */
export default function HelpScreen() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [regionalLinks, setRegionalLinks] = useState<HelpfulLink[]>([]);
  const [customLinks, setCustomLinks] = useState<HelpfulLink[]>([]);
  const [customLinksUnavailable, setCustomLinksUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<HelpMode>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const background = useThemeColour({}, 'background');
  const secondary = useThemeColour({}, 'textSecondary');
  const hero = useHeroSurface();
  const { isAdFree } = useSubscriptions();

  const locationAwareLinkIds = useMemo(() => new Set([
    'gov-uk-council',
    'gov-uk-book-theory-test',
    'gov-uk-book-driving-test',
  ]), []);

  /** Loads documents, regional links, and optional custom links for the current user. */
  const loadHelpResources = useCallback(async () => {
    try {
      setLoading(true);
      const detectedCountryCode = getCurrentCountryCodeFromLocale();
      setCountryCode(detectedCountryCode);
      const [nextDocuments, nextRegionalLinks] = await Promise.all([
        documentService.getDocuments(),
        Promise.resolve(sortHelpfulLinks(getHelpfulLinksForCountry(detectedCountryCode))),
      ]);
      setDocuments(nextDocuments);
      setRegionalLinks(nextRegionalLinks);

      try {
        setCustomLinks(sortHelpfulLinks(await customLinksService.getCustomLinks()));
        setCustomLinksUnavailable(false);
      } catch (customLinksError) {
        if (!isCustomLinksUnavailableError(customLinksError)) {
          throw customLinksError;
        }

        setCustomLinks([]);
        setCustomLinksUnavailable(true);
        console.warn('HelpScreen.customLinksUnavailable', {
          message: customLinksError instanceof Error ? customLinksError.message : String(customLinksError),
          migration: 'database/013_custom_links.sql',
        });
      }
    } catch (error) {
      logError('HelpScreen.loadHelpResources', error);
      showAlert('Unable to load help', 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadHelpResources();
    }, [loadHelpResources])
  );

  useEffect(() => {
    return () => {
      if (!isAdFree) {
        showGlobalInterstitialAd();
      }
    };
  }, [isAdFree]);

  const searchText = search.trim().toLowerCase();
  const allLinks = useMemo(() => sortHelpfulLinks([...regionalLinks, ...customLinks]), [customLinks, regionalLinks]);
  const filteredDocuments = useMemo(
    () => documents.filter(document => documentMatchesSearch(document, searchText)),
    [documents, searchText]
  );
  const categories = useMemo(() => {
    const categorySet = new Set([CUSTOM_CATEGORY, ...allLinks.map(link => link.category)]);
    return ['All', ...Array.from(categorySet).sort((a, b) => {
      const categoryDifference = getCategoryRank(a) - getCategoryRank(b);
      return categoryDifference !== 0 ? categoryDifference : a.localeCompare(b);
    })];
  }, [allLinks]);
  const filteredLinks = useMemo(() => {
    const categoryFiltered = selectedCategory === 'All'
      ? allLinks
      : allLinks.filter(link => link.category === selectedCategory);
    const modeFiltered = mode === 'Saved'
      ? categoryFiltered.filter(link => link.id.startsWith('custom-'))
      : categoryFiltered;
    return modeFiltered.filter(link => linkMatchesSearch(link, searchText));
  }, [allLinks, mode, searchText, selectedCategory]);
  const isRegionSupported = regionalLinks.length > 0;
  const showGuides = mode === 'All' || mode === 'Guides';
  const showLinks = mode === 'All' || mode === 'Links' || mode === 'Saved';

  /** Copies emergency phone numbers instead of opening the dialler. */
  const handleEmergencyPhoneLink = (link: HelpfulLink) => {
    const phoneNumber = link.url.replace('tel:', '');
    copyToClipboard(phoneNumber);
    showAlert(
      'Emergency number copied',
      `Calling ${phoneNumber} has been disabled to prevent accidental calls. The number has been copied to your clipboard.`
    );
  };

  /** Opens, copies, or calls a selected link depending on platform and link type. */
  const handleLinkPress = async (link: HelpfulLink) => {
    try {
      if (link.url.startsWith('tel:')) {
        if (link.category === 'Emergency') {
          handleEmergencyPhoneLink(link);
          return;
        }

        const phoneNumber = link.url.replace('tel:', '');
        if (Platform.OS === 'web') {
          showAlert('Mobile only', 'Telephone numbers can only be called on mobile devices.');
          return;
        }

        showAlert('Call ' + phoneNumber, `Would you like to call ${link.title}?`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Call', onPress: () => Linking.openURL(link.url) },
        ]);
        return;
      }

      const supported = await Linking.canOpenURL(link.url);
      if (!supported) {
        showAlert('Unable to open link', 'Please check the address and try again.');
        return;
      }

      if (locationAwareLinkIds.has(link.id)) {
        const postcode = await LocationService.PostCode();
        if (postcode) {
          copyToClipboard(postcode);
          showAlert('Postcode copied', 'Your postcode has been copied for faster council or centre search.');
        }
      }

      await Linking.openURL(link.url);
    } catch (error) {
      logError('HelpScreen.handleLinkPress', error, { linkId: link.id, category: link.category, url: link.url });
      showAlert('Unable to open link', 'Please try again.');
    }
  };

  /** Opens or downloads one document resource. */
  const handleDocumentAction = async (document: Document, action: 'open' | 'download') => {
    try {
      if (action === 'open') {
        router.push(`/documents/viewer/${document.id}`);
        return;
      }

      await documentService.downloadDocument(document.id);
      showAlert('Success', `${document.file_name} downloaded successfully.`);
    } catch (error) {
      logError('HelpScreen.handleDocumentAction', error, { documentId: document.id, action });
      showAlert('Document Error', 'Could not complete this document action. Please try again.');
    }
  };

  /** Removes a saved custom link after confirmation. */
  const handleDeleteCustomLink = (link: HelpfulLink) => {
    showAlert('Delete custom link', `Remove ${link.title}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await customLinksService.deleteCustomLink(link.id);
            setCustomLinks(current => current.filter(item => item.id !== link.id));
          } catch (error) {
            if (isCustomLinksUnavailableError(error)) {
              setCustomLinksUnavailable(true);
              console.warn('HelpScreen.handleDeleteCustomLinkUnavailable', {
                message: error instanceof Error ? error.message : String(error),
                migration: 'database/013_custom_links.sql',
              });
              showAlert('Custom links unavailable', 'Custom links are not set up yet. Regional links still work.');
              return;
            }

            logError('HelpScreen.handleDeleteCustomLink', error, { linkId: link.id });
            showAlert('Unable to delete link', 'Please try again.');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={styles.loadingContainer}>
          <LoadingSpinner />
          <ThemedText style={styles.loadingText}>Loading help...</ThemedText>
        </ThemedView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container} lightColour={background} darkColour={background}>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <ThemedView style={styles.content}  lightColour={background} darkColour={background}>
          <View style={styles.header}>
            <Eyebrow>Help</Eyebrow>
            <ThemedText type="title" style={styles.title}>
              Guides, shortcuts, and saved links.
            </ThemedText>
          </View>

          <HeroCard style={styles.hero}>
            <View style={styles.heroTopRow}>
              <View style={[styles.heroIcon, { backgroundColor: hero.chipBackground }]}>
                <Ionicons name="compass-outline" size={23} color={hero.text} />
              </View>
              <View style={styles.heroCopy}>
                <Eyebrow tone="hero">{countryCode ? `${countryCode} help hub` : 'Help hub'}</Eyebrow>
                <ThemedText style={[styles.heroTitle, { color: hero.text }]}>
                  Find the next useful thing.
                </ThemedText>
              </View>
            </View>
            <ThemedText style={[styles.heroText, { color: hero.textSecondary }]}>
              Practical guides sit alongside official services and your own saved links, so help feels like one place rather than separate lists.
            </ThemedText>
            <View style={styles.heroActions}>
              <Button
                analyticsId="app_help_add_custom"
                title="Add custom link"
                onPress={() => router.push('/help/add')}
                variant="outline"
                size="small"
                style={[styles.heroButton, { borderColor: hero.border, backgroundColor: hero.actionBackground }]}
                textStyle={{ color: hero.actionText }}
              />
            </View>
          </HeroCard>

          <View style={styles.statsRow}>
            <StatTile label="Guides" value={String(documents.length)} meta="read or export" />
            <StatTile label="Links" value={String(allLinks.length)} meta="official and saved" />
          </View>

          <Input label="Search help" value={search} onChangeText={setSearch} placeholder="Search guides, links, services..." autoCapitalize="none" />

          <View style={styles.modeRow}>
            {(['All', 'Guides', 'Links', 'Saved'] as HelpMode[]).map(item => (
              <TouchableOpacity analyticsId="app_help_mode_chip" analyticsControlType="filter" key={item} onPress={() => setMode(item)}>
                <Chip label={item} active={mode === item} />
              </TouchableOpacity>
            ))}
          </View>

          {!isRegionSupported ? (
            <ListRow style={styles.noticeRow}>
              <Ionicons name="earth-outline" size={22} color={BrandColours.brand} />
              <View style={styles.noticeCopy}>
                <ThemedText type="defaultSemiBold">Regional links are not available here yet.</ThemedText>
                <ThemedText style={[styles.noticeText, { color: secondary }]}>Saved custom links still work for your account.</ThemedText>
              </View>
            </ListRow>
          ) : null}

          {customLinksUnavailable ? (
            <ListRow style={styles.noticeRow}>
              <Ionicons name="bookmark-outline" size={22} color={BrandColours.brand} />
              <View style={styles.noticeCopy}>
                <ThemedText type="defaultSemiBold">Custom links are not set up yet.</ThemedText>
                <ThemedText style={[styles.noticeText, { color: secondary }]}>Regional links still work while the saved-links table is deployed.</ThemedText>
              </View>
            </ListRow>
          ) : null}

          {showGuides ? (
            <View style={styles.section}>
              <SectionHeading eyebrow="Guides" title="Documents and guides" />
              <View style={styles.list}>
                {filteredDocuments.length > 0 ? filteredDocuments.map(document => (
                  <ListRow key={document.id} style={styles.documentRow}>
                    <View style={[styles.resourceIcon, { backgroundColor: `${BrandColours.brand}22` }]}>
                      <ThemedText style={styles.documentIcon}>{documentService.getFileIcon(document.file_name)}</ThemedText>
                    </View>
                    <View style={styles.resourceInfo}>
                      <ThemedText type="defaultSemiBold" style={styles.resourceTitle}>{document.title}</ThemedText>
                      {!!document.description && (
                        <ThemedText style={[styles.resourceDescription, { color: secondary }]} numberOfLines={2} ellipsizeMode="tail">
                          {document.description}
                        </ThemedText>
                      )}
                      <ThemedText numberOfLines={1} style={[styles.resourceMeta, { color: secondary }]}>
                        {document.file_name}
                      </ThemedText>
                    </View>
                    <View style={styles.documentActions}>
                      <Button analyticsId="app_help_document_open" title="Open" size="small" onPress={() => handleDocumentAction(document, 'open')} />
                      <Button analyticsId="app_help_document_download" title="Save" variant="secondary" size="small" onPress={() => handleDocumentAction(document, 'download')} />
                    </View>
                  </ListRow>
                )) : (
                  <ListRow style={styles.emptyRow}>
                    <Ionicons name="document-outline" size={22} color={secondary} />
                    <ThemedText style={{ color: secondary }}>No guides match this search.</ThemedText>
                  </ListRow>
                )}
              </View>
            </View>
          ) : null}

          {showLinks ? (
            <View style={styles.section}>
              <SectionHeading eyebrow="Links" title={mode === 'Saved' ? 'Saved links' : 'Useful links'} />
              <View style={styles.filters}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.filterRow}>
                    {categories.map(category => (
                      <TouchableOpacity
                        analyticsId="app_help_category_chip"
                        analyticsControlType="filter"
                        key={category}
                        onPress={() => setSelectedCategory(category)}
                      >
                        <Chip label={category} active={selectedCategory === category} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
              <View style={styles.list}>
                {filteredLinks.length > 0 ? filteredLinks.map(link => {
                  const isCustom = link.id.startsWith('custom-');
                  return (
                    <TouchableOpacity
                      analyticsId="app_help_link_row"
                      analyticsControlType="link"
                      key={link.id}
                      onPress={() => handleLinkPress(link)}
                      accessibilityRole="link"
                    >
                      <ListRow style={styles.linkRow}>
                        <View style={[styles.resourceIcon, { backgroundColor: `${getCategoryColour(link.category)}22` }]}>
                          <Ionicons name={getCategoryIcon(link.category)} size={20} color={getCategoryColour(link.category)} />
                        </View>
                        <View style={styles.resourceInfo}>
                          <View style={styles.linkTitleRow}>
                            <ThemedText type="defaultSemiBold" style={styles.resourceTitle}>{link.title}</ThemedText>
                            <View style={[styles.categoryBadge, { backgroundColor: `${getCategoryColour(link.category)}22` }]}>
                              <ThemedText style={[styles.categoryBadgeText, { color: getCategoryColour(link.category) }]}>{link.category}</ThemedText>
                            </View>
                          </View>
                          <ThemedText style={[styles.resourceDescription, { color: secondary }]}>{link.description}</ThemedText>
                          <ThemedText numberOfLines={1} style={[styles.resourceMeta, { color: secondary }]}>
                            {link.url.startsWith('tel:') ? `Call: ${link.url.replace('tel:', '')}` : link.url.replace('https://', '').replace('http://', '')}
                          </ThemedText>
                        </View>
                        {isCustom ? (
                          <View style={styles.customLinkActions}>
                            <TouchableOpacity
                              analyticsId="app_help_edit_custom"
                              analyticsControlType="icon"
                              accessibilityRole="button"
                              accessibilityLabel={`Edit ${link.title}`}
                              onPress={(event) => {
                                event.stopPropagation();
                                router.push(`/help/edit/${link.id.replace('custom-', '')}`);
                              }}
                              style={styles.deleteButton}
                            >
                              <Ionicons name="create-outline" size={18} color={secondary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              analyticsId="app_help_delete_custom"
                              analyticsControlType="icon"
                              accessibilityRole="button"
                              accessibilityLabel={`Delete ${link.title}`}
                              onPress={(event) => {
                                event.stopPropagation();
                                handleDeleteCustomLink(link);
                              }}
                              style={styles.deleteButton}
                            >
                              <Ionicons name="trash-outline" size={18} color={secondary} />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <Ionicons name={link.url.startsWith('tel:') ? 'call-outline' : 'open-outline'} size={18} color={secondary} />
                        )}
                      </ListRow>
                    </TouchableOpacity>
                  );
                }) : (
                  <ListRow style={styles.emptyRow}>
                    <Ionicons name="bookmark-outline" size={22} color={secondary} />
                    <ThemedText style={{ color: secondary }}>No links match this search.</ThemedText>
                  </ListRow>
                )}
              </View>
            </View>
          ) : null}

          <Card style={styles.footerCard}>
            <ThemedText type="defaultSemiBold" style={styles.footerTitle}>Important notes</ThemedText>
            <ThemedText style={[styles.footerText, { color: secondary }]}>
              Links open in your browser or default app. Always verify eligibility and current details with the official service.
            </ThemedText>
          </Card>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
  },
  scrollContent: {
    paddingBottom: 120,
  },
  content: {
    flex: 1,
    width: Platform.OS === 'web' ? '70%' : undefined,
    alignSelf: 'center',
    gap: 18,
    padding: 20,
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
  header: {
    gap: 6,
  },
  title: {
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: 0,
  },
  hero: {
    gap: 14,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: {
    flex: 1,
  },
  heroTitle: {
    fontFamily: AppFonts.medium,
    fontSize: 27,
    lineHeight: 31,
    letterSpacing: 0,
  },
  heroText: {
    fontSize: 14,
    lineHeight: 20,
  },
  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  heroButton: {
    alignSelf: 'flex-start',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  noticeRow: {
    alignItems: 'flex-start',
  },
  noticeCopy: {
    flex: 1,
    gap: 3,
  },
  noticeText: {
    fontSize: 13,
    lineHeight: 18,
  },
  section: {
    gap: 2,
  },
  filters: {
    marginHorizontal: -20,
    marginBottom: 10,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
  },
  list: {
    gap: 10,
  },
  documentRow: {
    alignItems: 'flex-start',
  },
  linkRow: {
    alignItems: 'flex-start',
  },
  resourceIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentIcon: {
    fontSize: 20,
  },
  resourceInfo: {
    flex: 1,
    gap: 5,
    minWidth: 0,
  },
  resourceTitle: {
    flexShrink: 1,
    fontSize: 16,
  },
  resourceDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  resourceMeta: {
    fontSize: 12,
    fontFamily: Platform.select({ web: 'monospace', default: AppFonts.medium }),
  },
  documentActions: {
    gap: 7,
    minWidth: 72,
  },
  linkTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: Radii.pill,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontFamily: AppFonts.bold,
  },
  deleteButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
  },
  customLinkActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyRow: {
    justifyContent: 'center',
  },
  footerCard: {
    padding: 16,
  },
  footerTitle: {
    marginBottom: 6,
  },
  footerText: {
    fontSize: 13,
    lineHeight: 19,
  },
});


