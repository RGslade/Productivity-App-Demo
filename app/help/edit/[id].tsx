import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { TrackedTouchableOpacity as TouchableOpacity } from '@/components/ui/TrackedTouchableOpacity';
import { Chip, Eyebrow, SectionHeading } from '@/components/ui/Surfaces';
import { BrandColours, Radii } from '@/constants/Colours';
import { showAlert } from '@/hooks/dataHandler';
import { useThemeColour } from '@/hooks/useThemeColour';
import { customLinksService, isCustomLinksUnavailableError } from '@/services/customLinksService';
import { logError } from '@/services/crashLogger';
import { goBackOrReplace } from '@/services/navigationService';

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

const EMPTY_FORM = { title: '', description: '', url: '', category: CUSTOM_CATEGORY };

function normaliseUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^(https?:\/\/|tel:|mailto:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/** Edits a user-supplied Help link with the same validation as the add screen. */
export default function EditHelpLinkScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const background = useThemeColour({}, 'background');
  const cardBackground = useThemeColour({}, 'cardBackground');
  const border = useThemeColour({}, 'cardBorder');
  const secondary = useThemeColour({}, 'textSecondary');

  useEffect(() => {
    let active = true;
    const loadLink = async () => {
      try {
        const links = await customLinksService.getCustomLinks();
        const link = links.find(item => item.id === `custom-${id}`);
        if (!link) {
          showAlert('Link not found', 'This custom link is no longer available.', [
            { text: 'OK', onPress: () => goBackOrReplace('/help') },
          ]);
          return;
        }
        if (active) {
          setForm({ title: link.title, description: link.description, url: link.url, category: link.category });
        }
      } catch (error) {
        if (isCustomLinksUnavailableError(error)) {
          showAlert('Custom links unavailable', 'Custom links are not set up yet. Regional links still work.', [
            { text: 'OK', onPress: () => goBackOrReplace('/help') },
          ]);
          return;
        }
        logError('EditHelpLinkScreen.loadLink', error, { id });
        showAlert('Unable to load link', 'Please try again.', [
          { text: 'OK', onPress: () => goBackOrReplace('/help') },
        ]);
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadLink();
    return () => { active = false; };
  }, [id]);

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
      await customLinksService.updateCustomLink(`custom-${id}`, { title, description, url, category });
      showAlert('Link updated', 'Your custom link has been updated.', [
        { text: 'OK', onPress: () => goBackOrReplace('/help') },
      ]);
    } catch (error) {
      if (isCustomLinksUnavailableError(error)) {
        showAlert('Custom links unavailable', 'Custom links are not set up yet. Regional links still work.');
        return;
      }
      logError('EditHelpLinkScreen.handleSave', error, { id, category, url });
      showAlert('Unable to update link', 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <ThemedView style={styles.loading}><LoadingSpinner /><ThemedText>Loading link...</ThemedText></ThemedView>;
  }

  return (
    <ThemedView style={styles.container} lightColour={background} darkColour={background}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Eyebrow>Saved</Eyebrow>
          <ThemedText type="title">Edit custom link</ThemedText>
          <ThemedText style={[styles.description, { color: secondary }]}>Update this saved link for quick access from Help.</ThemedText>
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
                  <TouchableOpacity key={category} analyticsId="app_help_custom_category" analyticsControlType="filter" onPress={() => updateForm({ category })}>
                    <Chip label={category} active={form.category === category} />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
          {formError ? <ThemedText style={styles.formError}>{formError}</ThemedText> : null}
          <Button analyticsId="app_help_update_custom" title="Save changes" onPress={handleSave} fullWidth loading={saving} />
          <Button analyticsId="app_help_cancel_custom_edit" title="Cancel" onPress={() => goBackOrReplace('/help')} variant="secondary" fullWidth disabled={saving} />
        </Card>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 20, gap: 20, paddingBottom: 40 },
  header: { gap: 8 },
  description: { lineHeight: 20 },
  card: { gap: 13, padding: 16, borderWidth: 1, borderRadius: Radii.card },
  categoryPicker: { gap: 8 },
  fieldLabel: { fontSize: 15 },
  categoryPickerRow: { flexDirection: 'row', gap: 8, paddingRight: 20 },
  formError: { color: BrandColours.notificationOverdue, fontSize: 13, fontWeight: '700' },
});


