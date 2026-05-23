import React, { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useNotes } from '@/hooks/useNotes';
import { useSettings } from '@/hooks/useSettings';
import { useThemeColour } from '@/hooks/useThemeColour';
import { showAlert } from '@/hooks/dataHandler';
import {tempNotesStore} from '@/services/tempNotesStore';

/** Renders note creation with explicit title and content inputs. */
//
export default function AddNoteScreen() {
  //
  const [title, setTitle] = useState('');
  //
  const [content, setContent] = useState('');
  //
  const [isTemporary, setIsTemporary] = useState(false);
  //
  const { createNote, isCreating } = useNotes();
  //
  const { defaultFont } = useSettings();
  //
  const backgroundColor = useThemeColour({}, 'background');
  //
  const textColor = useThemeColour({}, 'text');
  //
  const inputBackground = useThemeColour({}, 'inputBackground');
  //
  const inputBorder = useThemeColour({}, 'inputBorder');
  //
  const inputPlaceholder = useThemeColour({}, 'inputPlaceholder');

  //
  const hasTitle = useMemo(() => title.trim().length > 0, [title]);
  //
  const hasContent = useMemo(() => content.trim().length > 0, [content]);

  /** Saves the note as temporary or persistent based on the current toggle state. */
  //
  const handleSave = async () => {
    //
    if (!hasTitle) {
      showAlert('Missing Title', 'Please enter a title before saving.');
      return;
    }
    //
    if (!hasContent) {
      showAlert('Empty Note', 'Please add some content before saving.');
      return;
    }
    //
    try {
      //
      if (isTemporary) {
        tempNotesStore.add(title.trim(), content);
      } else {
        await createNote({ title: title.trim(), content });
      }
      router.back();
    } catch (error) {
      console.error('Failed to save note:', error);
      showAlert('Save Failed', 'Unable to save your note. Please try again.');
    }
  };

  /** Cancels note creation and confirms discard when the form has changes. */
  //
  const handleCancel = () => {
    //
    if (!hasTitle && !hasContent) {
      router.back();
      return;
    }
    showAlert('Discard Note', 'Your changes will be lost. Continue?', [
      { text: 'Keep Editing', onPress: undefined, style: 'cancel' },
      { text: 'Discard', onPress: () => router.back(), style: 'destructive' },
    ]);
  };

  //
  const temporaryLabel = isTemporary ? 'Temp On' : 'Temp Off';
  //
  const temporaryVariant = isTemporary ? 'warning' : 'secondary';

  //
  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <View style={styles.header}>
        <Button title={isTemporary ? 'Done' : isCreating ? 'Saving...' : 'Save'} onPress={handleSave} disabled={isCreating} size="small" />
        <Button title="Cancel" variant="secondary" onPress={handleCancel} size="small" />
        <Button title={temporaryLabel} variant={temporaryVariant} onPress={() => setIsTemporary(prev => !prev)} size="small" />
      </View>

      {isTemporary && (
        <ThemedText style={styles.tempHint}>
          Temporary notes are stored only for this session.
        </ThemedText>
      )}

      <Input
        label="Title"
        required={true}
        value={title}
        onChangeText={setTitle}
        placeholder="Enter note title"
        style={styles.titleInput}
      />

      <TextInput
        style={[styles.editor, { fontFamily: defaultFont, color: textColor, backgroundColor: inputBackground, borderColor: inputBorder }]}
        value={content}
        onChangeText={setContent}
        placeholder="Start your note..."
        placeholderTextColor={inputPlaceholder}
        multiline
        textAlignVertical="top"
      />
    </ThemedView>
  );
}

//
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tempHint: {
    fontSize: 13,
    opacity: 0.7,
    marginBottom: 8,
  },
  titleInput: {
    marginBottom: 12,
  },
  editor: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    lineHeight: 22,
  },
});
