import React from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PROJECT_SUPPORT_EMAIL } from '@/constants/ProjectInfo';
import { LEGAL_DOCUMENTS } from '@/constants/LegalDocuments';
import type { LegalDocumentKey } from '@/constants/LegalDocuments';
import { useThemeColour } from '@/hooks/useThemeColour';

/** Returns true when a route parameter maps to a bundled legal document. */
function isLegalDocumentKey(value: unknown): value is LegalDocumentKey {
  return value === 'terms' || value === 'privacy' || value === 'lifenest';
}

/** Shows an in-app legal document so acceptance links never leave the product. */
export default function LegalDocumentScreen() {
  const { document } = useLocalSearchParams<{ document?: string }>();
  const backgroundColour = useThemeColour({}, 'background');
  const cardBackgroundColour = useThemeColour({}, 'cardBackground');
  const borderColour = useThemeColour({}, 'border');
  const legalDocument = isLegalDocumentKey(document) ? LEGAL_DOCUMENTS[document] : null;

  if (!legalDocument) {
    return (
      <ThemedView style={[styles.container, styles.centered]} darkColour={backgroundColour} lightColour={backgroundColour}>
        <Card style={[styles.card, { backgroundColor: cardBackgroundColour }]}>
          <ThemedText type="subtitle" style={styles.title}>Legal document not found</ThemedText>
          <ThemedText style={styles.paragraph}>
            We could not open that document. Please go back and try again, or contact support at {PROJECT_SUPPORT_EMAIL}.
          </ThemedText>
          <Button analyticsId="app_legal_document_back_not_found" title="Go back" variant="secondary" onPress={() => router.back()} />
        </Card>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container} darkColour={backgroundColour} lightColour={backgroundColour}>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>{legalDocument.title}</ThemedText>
          <ThemedText style={styles.meta}>
            Version {legalDocument.version} - updated {legalDocument.updatedAt}
          </ThemedText>
        </View>

        <Card style={[styles.card, { backgroundColor: cardBackgroundColour, borderColor: borderColour }]}>
          {legalDocument.sections.map((section) => (
            <View key={section.heading} style={styles.section}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>{section.heading}</ThemedText>
              {section.body.map((paragraph) => (
                <ThemedText key={paragraph} style={styles.paragraph}>{paragraph}</ThemedText>
              ))}
            </View>
          ))}
        </Card>

        <Button analyticsId="app_legal_document_back" title="Back" variant="secondary" onPress={() => router.back()} style={styles.backButton} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    padding: 16,
  },
  scrollContainer: {
    width: '100%',
    maxWidth: Platform.OS === 'web' ? '70%' : 960,
    alignSelf: 'center',
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    marginBottom: 8,
  },
  meta: {
    fontSize: 14,
    opacity: 0.72,
  },
  card: {
    padding: 16,
  },
  section: {
    marginBottom: 22,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 10,
  },
  backButton: {
    marginTop: 16,
  },
});

