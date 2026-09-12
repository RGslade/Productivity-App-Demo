import { TrackedTouchableOpacity as TouchableOpacity } from '@/components/ui/TrackedTouchableOpacity';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Image, Linking, Platform, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { newsKeys, useNews } from '@/hooks/useNews';
import { useThemeColour } from '@/hooks/useThemeColour';
import { newsService } from '@/services/newsService';
import { logError } from '@/services/crashLogger';
import { getCurrentCountryCodeFromLocale, isMyNewsAvailable, showAlert } from '@/hooks/dataHandler';
import { NewsCategory, NewsCategoryFilter } from '@/types/news';

const CATEGORY_LABELS: Record<NewsCategory, string> = {
  business: 'Business',
  strange: 'Strange',
  politics: 'Politics',
  uk: 'UK',
};

const CATEGORY_ORDER: NewsCategory[] = ['business', 'strange', 'politics', 'uk'];

/** Renders the filtered Sky News reader and reports fetch/render data failures. */
export default function MyNewsScreen() {
  const queryClient = useQueryClient();
  const [selectedFilter, setSelectedFilter] = useState<NewsCategoryFilter>('all');
  const countryCode = getCurrentCountryCodeFromLocale();
  const isRegionSupported = isMyNewsAvailable(countryCode);
  const { data, loading, error, refetch, isRefetching } = useNews();

  const refreshNews = useCallback(async () => {
    const refreshed = await newsService.getNews();
    queryClient.setQueryData(newsKeys.all, refreshed);
  }, [queryClient]);
  const backgroundColour = useThemeColour({}, 'background');
  const textSecondary = useThemeColour({}, 'textSecondary');
  const borderColour = useThemeColour({}, 'border');
  const cardBackground = useThemeColour({}, 'cardBackground');

  const onOpenArticle = useCallback(async (url: string) => {
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      showAlert('Unable to open link', 'Please try again later.');
      return;
    }
    await Linking.openURL(url);
  }, []);

  const onRefresh = useCallback(async () => {
    try {
      await refreshNews();
    } catch (refreshError) {
      logError('MyNewsScreen.onRefresh.refreshNews', refreshError, { countryCode });
      const result = await refetch();
      if (result.error) {
        logError('MyNewsScreen.onRefresh.refetch', result.error, { countryCode });
      }
    }
  }, [countryCode, refreshNews, refetch]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      // Keep focused news fresh without refetching on every navigation focus.
      const refreshWhileFocused = async () => {
        if (!isActive || !data) return;
        try {
          await refreshNews();
        } catch (refreshError) {
          logError('MyNewsScreen.focusRefresh.refreshNews', refreshError, { countryCode });
          const result = await refetch();
          if (result.error) {
            logError('MyNewsScreen.focusRefresh.refetch', result.error, { countryCode });
          }
        }
      };

      const intervalId = setInterval(refreshWhileFocused, 10 * 60 * 1000);

      return () => {
        isActive = false;
        clearInterval(intervalId);
      };
    }, [countryCode, data, refreshNews, refetch])
  );

  const filteredCategories = useMemo(() => {
    const categories = data?.categories || [];
    if (selectedFilter === 'all') return categories;
    return categories.filter(item => item.category === selectedFilter);
  }, [data, selectedFilter]);

  const message = useMemo(() => {
    if (!error) return null;
    const typedError = error as { code?: string };
    if (typedError?.code === 'OFFLINE') return 'Your internet connection appears to be unavailable right now.';
    return 'News information is not available right now.';
  }, [error]);

  const articleCounts = useMemo(() => {
    return (data?.categories || []).reduce<Record<string, number>>((counts, categoryGroup) => {
      counts[categoryGroup.category] = categoryGroup.articles.length;
      return counts;
    }, {});
  }, [data]);

  const totalArticleCount = useMemo(() => {
    return Object.values(articleCounts).reduce((total, count) => total + count, 0);
  }, [articleCounts]);

  useEffect(() => {
    if (!isRegionSupported) {
      console.warn('MyNewsScreen.regionUnsupported', { countryCode });
    }
  }, [countryCode, isRegionSupported]);

  useEffect(() => {
    if (!error) return;
    logError('MyNewsScreen.useNews', error, { countryCode });
  }, [countryCode, error]);

  useEffect(() => {
    if (!data || data.categories.length === 0 || totalArticleCount > 0) return;
    logError('MyNewsScreen.noArticles', new Error('News data loaded with no articles.'), {
      countryCode,
      articleCounts,
      fetchedAt: data.fetchedAt,
    });
  }, [articleCounts, countryCode, data, totalArticleCount]);

  if (loading && !data) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <LoadingSpinner />
      </ThemedView>
    );
  }

  return (
    <View style={[styles.screenContainer, { backgroundColor: backgroundColour }]}>
      <ScrollView style={!isRegionSupported ? styles.blurredContent : undefined} scrollEnabled={isRegionSupported} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} enabled={isRegionSupported} />}>
        <ThemedView style={styles.container} darkColour={backgroundColour} lightColour={backgroundColour}>
          <ThemedText type="subtitle" style={styles.title}>My News</ThemedText>
          <ThemedText style={[styles.helper, { color: textSecondary }]}>Tap a card to open the full article in your browser.</ThemedText>

          <View style={styles.filterRow}>
            <TouchableOpacity analyticsId="app_mynews_index_filter_button_2" analyticsControlType="filter" style={[styles.filterButton, { borderColor: borderColour, backgroundColor: selectedFilter === 'all' ? cardBackground : 'transparent' }]} onPress={() => setSelectedFilter('all')}>
              <ThemedText style={styles.filterText}>All</ThemedText>
            </TouchableOpacity>
            {CATEGORY_ORDER.map((category) => (
              <TouchableOpacity analyticsId="app_mynews_index_filter_button" analyticsControlType="filter" key={category} style={[styles.filterButton, { borderColor: borderColour, backgroundColor: selectedFilter === category ? cardBackground : 'transparent' }]} onPress={() => setSelectedFilter(category)}>
                <ThemedText style={styles.filterText}>{CATEGORY_LABELS[category]}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          {message ? <ThemedText style={[styles.errorText, { color: textSecondary }]}>{message}</ThemedText> : null}

          {!message && filteredCategories.map((categoryGroup) => (
            <View key={categoryGroup.category} style={styles.section}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>{CATEGORY_LABELS[categoryGroup.category]}</ThemedText>
              {categoryGroup.articles.slice(0, 10).map((article) => (
                <TouchableOpacity analyticsId="app_mynews_index_card" analyticsControlType="card" key={article.id} style={[styles.card, { backgroundColor: cardBackground, borderColor: borderColour }]} onPress={() => onOpenArticle(article.url)} accessibilityRole="link">
                  {article.imageUrl ? (
                    <Image source={{ uri: article.imageUrl }} style={styles.image} resizeMode="cover" />
                  ) : (
                    <View style={[styles.placeholderImage, { borderColor: borderColour }]}>
                      <ThemedText style={[styles.placeholderText, { color: textSecondary }]}>Image unavailable</ThemedText>
                    </View>
                  )}
                  <ThemedText numberOfLines={3} ellipsizeMode="tail" type="defaultSemiBold" style={styles.headline}>{article.title}</ThemedText>
                  {!!article.description && <ThemedText numberOfLines={4} ellipsizeMode="tail" style={[styles.description, { color: textSecondary }]}>{article.description}</ThemedText>}
                  <ThemedText style={[styles.sourceText, { color: textSecondary }]}>Source: Sky News</ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          ))}

          {!message && filteredCategories.length > 0 && filteredCategories.every(categoryGroup => categoryGroup.articles.length === 0) ? (
            <ThemedText style={[styles.helper, { color: textSecondary }]}>News information is not available right now.</ThemedText>
          ) : null}
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
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenContainer: {
    flex: 1,
    width: '100%',
  },
  container: {
    width: Platform.OS === 'web' ? '70%' : '100%',
    alignSelf: 'center',
    padding: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 22,
    marginBottom: 4,
  },
  helper: {
    fontSize: 13,
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  filterButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterText: {
    fontSize: 13,
  },
  errorText: {
    fontSize: 14,
    marginBottom: 12,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 10,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  image: {
    width: '100%',
    height: 140,
    borderRadius: 8,
    marginBottom: 10,
  },
  placeholderImage: {
    width: '100%',
    height: 140,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  placeholderText: {
    fontSize: 12,
  },
  headline: {
    fontSize: 16,
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    marginBottom: 8,
  },
  sourceText: {
    fontSize: 12,
    textTransform: 'uppercase',
  },
  blurredContent: {
    opacity: 0.35,
  },
  regionOverlay: {
    ...StyleSheet.absoluteFill,
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
});
