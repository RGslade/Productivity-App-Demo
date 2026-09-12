import { router } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { TrackedTouchableOpacity as TouchableOpacity } from '@/components/ui/TrackedTouchableOpacity';
import { Chip, Eyebrow, SectionHeading } from '@/components/ui/Surfaces';
import { BrandColours, Radii } from '@/constants/Colours';
import { showAlert } from '@/hooks/dataHandler';
import { useThemeColour } from '@/hooks/useThemeColour';
import { customLinksService, isCustomLinksUnavailableError } from '@/services/customLinksService';
import { logError } from '@/services/crashLogger';

const CUSTOM_CATEGORY = 'Custom';
const SELECTABLE_CATEGORIES = [
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

const EMPTY_FORM = {
  title: '',
  description: '',
  url: '',
  category: CUSTOM_CATEGORY,
};

/** Normalises custom URLs so browser opening works reliably. */
function normaliseUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^(https?:\/\/|tel:|mailto:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/** Adds a user-supplied Help link using the same validation as the former inline form. */
export default function AddHelpLinkScreen() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const background = useThemeColour({}, 'background');
  const cardBackground = useThemeColour({}, 'cardBackground');
  const border = useThemeColour({}, 'cardBorder');
  const secondary = useThemeColour({}, 'textSecondary');

  const updateForm = (changes: Partial<typeof EMPTY_FORM>) => {
    setForm(current => ({ ...current, ...changes }));
    setFormError(null);
  };

  const handleSave = async () => {
    const title = form.title.trim();
    const url = normaliseUrl(form.url);
    const description = form.description.trim() || 'Saved by you.';
    const category = form.category || CUSTOM_CATEGORY;

    if (!title || !url) {
      setFormError('Add a title and link address.');
      return;
    }

    if (!/^(https?:\/\/|tel:|mailto:)/i.test(url)) {
      setFormError('Use a web address, phone number, or email link.');
      return;
    }

    try {
      setSaving(true);
      await customLinksService.createCustomLink({ title, description, url, category });
      showAlert('Link saved', 'Your custom link has been added.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      if (isCustomLinksUnavailableError(error)) {
        console.warn('AddHelpLinkScreen.customLinksUnavailable', {
          message: error instanceof Error ? error.message : String(error),
          migration: 'database/013_custom_links.sql',
        });
        showAlert('Custom links unavailable', 'Custom links are not set up yet. Regional links still work.');
        return;
      }

      logError('AddHelpLinkScreen.handleSave', error, { category, url });
      showAlert('Unable to save link', 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ThemedView style={styles.container} lightColour={background} darkColour={background}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Eyebrow>Saved</Eyebrow>
          <ThemedText type="title">Add a useful place</ThemedText>
          <ThemedText style={[styles.description, { color: secondary }]}>Save a website, phone number, or email link for quick access from Help.</ThemedText>
        </View>

        <Card style={[styles.card, { backgroundColor: cardBackground, borderColor: border }]}>
          <SectionHeading eyebrow="Custom link" title="Link details" />
          <Input label="Title" value={form.title} onChangeText={title => updateForm({ title })} placeholder="Council portal" />
          <Input label="Link" value={form.url} onChangeText={url => updateForm({ url })} placeholder="https://example.com" autoCapitalize="none" keyboardType="url" />
          <Input label="Description" value={form.description} onChangeText={description => updateForm({ description })} placeholder="Why this matters" />

          <View style={styles.categoryPicker}>
            <ThemedText type="defaultSemiBold" style={styles.fieldLabel}>Category</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.categoryPickerRow}>
                {SELECTABLE_CATEGORIES.map(category => (
                  <TouchableOpacity
                    key={category}
                    analyticsId="app_help_custom_category"
                    analyticsControlType="filter"
                    onPress={() => updateForm({ category })}
                  >
                    <Chip label={category} active={form.category === category} />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {formError ? <ThemedText style={styles.formError}>{formError}</ThemedText> : null}
          <Button analyticsId="app_help_save_custom" title="Save link" onPress={handleSave} fullWidth loading={saving} />
          <Button analyticsId="app_help_cancel_custom" title="Cancel" onPress={() => router.back()} variant="secondary" fullWidth disabled={saving} />
        </Card>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 20, gap: 20, paddingBottom: 40 },
  header: { gap: 8 },
  description: { lineHeight: 20 },
  card: { gap: 13, padding: 16, borderWidth: 1, borderRadius: Radii.card },
  categoryPicker: { gap: 8 },
  fieldLabel: { fontSize: 15 },
  categoryPickerRow: { flexDirection: 'row', gap: 8, paddingRight: 20 },
  formError: { color: BrandColours.notificationOverdue, fontSize: 13, fontWeight: '700' },
});


