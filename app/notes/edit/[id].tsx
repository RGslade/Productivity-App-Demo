import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useNotes, useNote } from '@/hooks/useNotes';
import { useSettings } from '@/hooks/useSettings';
import { useThemeColour } from '@/hooks/useThemeColour';
import { showAlert } from '@/hooks/dataHandler';
import {tempNotesStore} from '@/services/tempNotesStore';

/** Renders note editing with optional title-edit mode and content editor. */
//
export default function EditNoteScreen() {
  //
  const { id, temp } = useLocalSearchParams<{ id: string; temp?: string }>();
  //
  const isTemporary = temp === '1';
  //
  const noteId = isTemporary ? 0 : Number(id);
  //
  const { data: note, isLoading } = useNote(noteId);
  //
  const { updateNote, isUpdating } = useNotes();
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
  const [title, setTitle] = useState('');
  //
  const [originalTitle, setOriginalTitle] = useState('');
  //
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  //
  const [content, setContent] = useState('');
  //
  const [originalContent, setOriginalContent] = useState('');

  //
  useEffect(() => {
    //
    if (!isTemporary && note) {
      //
      const initialTitle = note.title || 'Untitled note';
      //
      const initial = note.content || '';
      setTitle(initialTitle);
      setOriginalTitle(initialTitle);
      setContent(initial);
      setOriginalContent(initial);
    }
  }, [isTemporary, note]);

  //
  useEffect(() => {
    //
    if (isTemporary || isLoading) return;
    //
    if (note === null) {
      showAlert('Note Not Found', 'This note is no longer available.');
      router.back();
    }
  }, [isLoading, isTemporary, note]);

  //
  useEffect(() => {
    //
    if (!isTemporary) return;
    //
    const tempNote = tempNotesStore.getById(id);
    //
    if (!tempNote) {
      showAlert('Note Not Found', 'This temporary note is no longer available.');
      router.back();
      return;
    }
    setTitle(tempNote.title || 'Untitled note');
    setOriginalTitle(tempNote.title || 'Untitled note');
    setContent(tempNote.content || '');
    setOriginalContent(tempNote.content || '');
  }, [id, isTemporary]);

  //
  const hasChanges = useMemo(() => title !== originalTitle || content !== originalContent, [title, originalTitle, content, originalContent]);
  //
  const hasTitle = useMemo(() => title.trim().length > 0, [title]);
  //
  const hasContent = useMemo(() => content.trim().length > 0, [content]);

  /** Saves note title/content changes for persistent or temporary notes. */
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
        tempNotesStore.update(id, { title: title.trim(), content });
      } else {
        await updateNote({ id: noteId, data: { title: title.trim(), content } });
      }
      router.back();
    } catch (error) {
      console.error('Failed to update note:', error);
      showAlert('Save Failed', 'Unable to save your changes. Please try again.');
    }
  };

  /** Cancels editing and confirms discard when the note has unsaved changes. */
  //
  const handleCancel = () => {
    //
    if (!hasChanges) {
      router.back();
      return;
    }
    showAlert('Discard Changes', 'Your changes will be lost. Continue?', [
      { text: 'Keep Editing', onPress: undefined, style: 'cancel' },
      { text: 'Discard', onPress: () => router.back(), style: 'destructive' },
    ]);
  };

  //
  if (!isTemporary && isLoading) {
    //
    return (
      <ThemedView style={styles.loadingContainer}>
        <LoadingSpinner />
      </ThemedView>
    );
  }

  //
  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <View style={styles.header}>
        <Button title={isUpdating ? 'Saving...' : 'Save'} onPress={handleSave} disabled={isUpdating} size="small" />
        <Button title="Cancel" variant="secondary" onPress={handleCancel} size="small" />
        <Button title={isEditingTitle ? 'Title Done' : 'Edit Title'} variant="secondary" onPress={() => setIsEditingTitle(prev => !prev)} size="small" />
      </View>

      {isTemporary && (
        <ThemedText style={styles.tempHint}>
          Temporary notes are stored only for this session.
        </ThemedText>
      )}

      {isEditingTitle ? (
        <Input
          label="Title"
          required={true}
          value={title}
          onChangeText={setTitle}
          placeholder="Enter note title"
          style={styles.titleInput}
        />
      ) : (
        <ThemedText type="title" style={styles.noteTitle}>
          {title || 'Untitled note'}
        </ThemedText>
      )}

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  noteTitle: {
    fontSize: 24,
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
