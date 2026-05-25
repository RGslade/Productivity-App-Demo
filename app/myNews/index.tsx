import React, { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert, Image, Linking, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { newsKeys, useNews } from '@/hooks/useNews';
import { useThemeColour } from '@/hooks/useThemeColour';
import { newsService } from '@/services/newsService';
import { getCurrentCountryCodeFromLocale, isMyNewsAvailable } from '@/hooks/dataHandler';
import { NewsCategory, NewsCategoryFilter } from '@/types/news';

const CATEGORY_LABELS: Record<NewsCategory, string> = {
  business: 'Business',
  strange: 'Strange',
  politics: 'Politics',
  uk: 'UK',
};

const CATEGORY_ORDER: NewsCategory[] = ['business', 'strange', 'politics', 'uk'];

export default function MyNewsScreen() {
  const queryClient = useQueryClient();
  const [selectedFilter, setSelectedFilter] = useState<NewsCategoryFilter>('all');
  const countryCode = getCurrentCountryCodeFromLocale();
  const isRegionSupported = isMyNewsAvailable(countryCode);
  const { data, loading, error, refetch, isRefetching } = useNews();

  const refreshNews = useCallback(async () => {
    const refreshed = await newsService.getNews();
    queryClient.setQueryData(newsKeys.all, refreshed);
    await refetch();
  }, [queryClient, refetch]);
  const backgroundColour = useThemeColour({}, 'background');
  const textSecondary = useThemeColour({}, 'textSecondary');
  const borderColour = useThemeColour({}, 'border');
  const cardBackground = useThemeColour({}, 'cardBackground');

  const onOpenArticle = useCallback(async (url: string) => {
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert('Unable to open link', 'Please try again later.');
      return;
    }
    await Linking.openURL(url);
  }, []);

  const onRefresh = useCallback(async () => {
    try {
      await refreshNews();
    } catch {
      await refetch();
    }
  }, [refreshNews, refetch]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      // Only refresh while this screen is focused.
      const refreshWhileFocused = async () => {
        if (!isActive) return;
        try {
          await refreshNews();
        } catch {
          await refetch();
        }
      };

      refreshWhileFocused();
      const intervalId = setInterval(refreshWhileFocused, 10 * 60 * 1000);

      return () => {
        isActive = false;
        clearInterval(intervalId);
      };
    }, [refreshNews, refetch])
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

  if (loading && !data) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <LoadingSpinner />
      </ThemedView>
    );
  }

  return (
    <View style={[styles.screenContainer, { backgroundColor: backgroundColour }]}>
      <ScrollView
        style={!isRegionSupported ? styles.blurredContent : undefined}
        scrollEnabled={isRegionSupported}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} enabled={isRegionSupported} />}
      >
        <ThemedView style={styles.container} darkColour={backgroundColour} lightColour={backgroundColour}>
          <ThemedText type="subtitle" style={styles.title}>My News</ThemedText>
          <ThemedText style={[styles.helper, { color: textSecondary }]}>Tap a card to open the full article in your browser.</ThemedText>

          <View style={styles.filterRow}>
            <TouchableOpacity style={[styles.filterButton, { borderColor: borderColour, backgroundColor: selectedFilter === 'all' ? cardBackground : 'transparent' }]} onPress={() => setSelectedFilter('all')}>
              <ThemedText style={styles.filterText}>All</ThemedText>
            </TouchableOpacity>
            {CATEGORY_ORDER.map((category) => (
              <TouchableOpacity key={category} style={[styles.filterButton, { borderColor: borderColour, backgroundColor: selectedFilter === category ? cardBackground : 'transparent' }]} onPress={() => setSelectedFilter(category)}>
                <ThemedText style={styles.filterText}>{CATEGORY_LABELS[category]}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          {message ? <ThemedText style={[styles.errorText, { color: textSecondary }]}>{message}</ThemedText> : null}

          {!message && filteredCategories.map((categoryGroup) => (
            <View key={categoryGroup.category} style={styles.section}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>{CATEGORY_LABELS[categoryGroup.category]}</ThemedText>
              {categoryGroup.articles.slice(0, 10).map((article) => (
                <TouchableOpacity key={article.id} style={[styles.card, { backgroundColor: cardBackground, borderColor: borderColour }]} onPress={() => onOpenArticle(article.url)} accessibilityRole="link">
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
  },
  container: {
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
});
