import { TrackedTouchableOpacity as TouchableOpacity } from '@/components/ui/TrackedTouchableOpacity';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Platform } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useNotes } from '@/hooks/useNotes';
import { NotesListItem, TempNote } from '@/types/notes';
import {tempNotesStore} from '@/services/tempNotesStore';
import { useThemeColour } from '@/hooks/useThemeColour';
import { useSettings } from '@/hooks/useSettings';
import { formatDate, showAlert } from '@/hooks/dataHandler';

type NotesFilter = 'all' | 'saved' | 'temporary';
type NotesSort = 'updated' | 'newest' | 'oldest';

const getTitle = (title: string) => {
  const cleaned = title.trim();
  if (!cleaned) return 'Untitled note';
  return cleaned.length > 60 ? `${cleaned.slice(0, 60)}...` : cleaned;
};

const getPreview = (content: string) => {
  const cleaned = content.replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'No content yet.';
  return cleaned.length > 120 ? `${cleaned.slice(0, 120)}...` : cleaned;
};

export default function NotesScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<NotesFilter>('all');
  const [sortBy, setSortBy] = useState<NotesSort>('updated');
  const [tempNotes, setTempNotes] = useState<TempNote[]>(tempNotesStore.getAll());
  const { notes, loading, fetchNotes, deleteNote } = useNotes();
  const { defaultFont } = useSettings();
  const backgroundColor = useThemeColour({}, 'background');
  const isFocused = useIsFocused();

  useEffect(() => {
    if (!isFocused) return;
    setTempNotes(tempNotesStore.getAll());
  }, [isFocused]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchNotes();
      setTempNotes(tempNotesStore.getAll());
    } finally {
      setRefreshing(false);
    }
  }, [fetchNotes]);

  const handleDelete = (note: NotesListItem) => {
    const label = note.isTemporary ? 'Delete Temporary Note' : 'Delete Note';
    const message = note.isTemporary ? 'This temporary note will be removed and cannot be recovered.' : 'This note will be deleted and cannot be recovered.';
    showAlert(label, message, [
      { text: 'Cancel', onPress: undefined, style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (note.isTemporary) {
            tempNotesStore.remove(note.id as string);
            setTempNotes(tempNotesStore.getAll());
            return;
          }
          try {
            await deleteNote(note.id as number);
          } catch (error) {
            console.error('Failed to delete note:', error);
            showAlert('Delete Failed', 'Could not delete this note. Please try again.');
          }
        },
      },
    ]);
  };

  const noteItems = useMemo(() => {
    const savedItems: NotesListItem[] = notes.map(note => ({
      id: note.id,
      title: note.title || '',
      content: note.content || '',
      created_at: note.created_at,
      updated_at: note.updated_at,
      isTemporary: false,
    }));
    const tempItems: NotesListItem[] = tempNotes.map(note => ({
      id: note.id,
      title: note.title || '',
      content: note.content || '',
      created_at: note.created_at,
      updated_at: note.updated_at,
      isTemporary: true,
    }));
    let combined = [...savedItems, ...tempItems];
    if (filter === 'saved') combined = combined.filter(note => !note.isTemporary);
    if (filter === 'temporary') combined = combined.filter(note => note.isTemporary);
    return combined.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'updated':
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });
  }, [filter, notes, sortBy, tempNotes]);

  if (loading && notes.length === 0) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <LoadingSpinner />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <ThemedView style={[styles.content, { backgroundColor }]}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          My Notes
        </ThemedText>
        <Button analyticsId="app_notes_index_add_note" title="Add Note" onPress={() => router.push('/notes/add')} size="small" />
      </View>

      <ScrollView style={styles.noteList} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Card style={styles.filtersCard}>
          <ThemedText type="subtitle" style={styles.filtersTitle}>
            Filter & Sort
          </ThemedText>

          <View style={styles.filterRow}>
            <ThemedText style={styles.filterLabel}>Show:</ThemedText>
            <View style={styles.filterButtons}>
              <Button analyticsId="app_notes_index_all" title="All" variant={filter === 'all' ? 'primary' : 'secondary'} size="small" onPress={() => setFilter('all')} style={styles.filterButton} />
              <Button analyticsId="app_notes_index_saved" title="Saved" variant={filter === 'saved' ? 'primary' : 'secondary'} size="small" onPress={() => setFilter('saved')} style={styles.filterButton} />
              <Button analyticsId="app_notes_index_temp" title="Temp" variant={filter === 'temporary' ? 'primary' : 'secondary'} size="small" onPress={() => setFilter('temporary')} style={styles.filterButton} />
            </View>
          </View>

          <View style={styles.filterRow}>
            <ThemedText style={styles.filterLabel}>Sort:</ThemedText>
            <View style={styles.filterButtons}>
              <Button analyticsId="app_notes_index_updated" title="Updated" variant={sortBy === 'updated' ? 'primary' : 'secondary'} size="small" onPress={() => setSortBy('updated')} style={styles.filterButton} />
              <Button analyticsId="app_notes_index_newest" title="Newest" variant={sortBy === 'newest' ? 'primary' : 'secondary'} size="small" onPress={() => setSortBy('newest')} style={styles.filterButton} />
              <Button analyticsId="app_notes_index_oldest" title="Oldest" variant={sortBy === 'oldest' ? 'primary' : 'secondary'} size="small" onPress={() => setSortBy('oldest')} style={styles.filterButton} />
            </View>
          </View>
        </Card>

        {noteItems.length === 0 ? (
          <Card style={styles.emptyCard}>
            <ThemedText style={styles.emptyText}>
              {filter === 'all'
                ? 'No notes yet. Add your first note!'
                : filter === 'saved'
                  ? 'No saved notes yet.'
                  : 'No temporary notes yet.'}
            </ThemedText>
          </Card>
        ) : (
          noteItems.map(note => (
            <TouchableOpacity analyticsId="notes_open_item" analyticsControlType="list_item"
              key={note.id} onPress={() =>
                note.isTemporary
                  ? router.push(`/notes/edit/${note.id}?temp=1`)
                  : router.push(`/notes/edit/${note.id}`)
              }
            >
              <Card style={styles.noteCard}>
                <View style={styles.noteHeader}>
                  <ThemedText type="defaultSemiBold" style={[styles.noteTitle, { fontFamily: defaultFont }]}>
                    {getTitle(note.title)}
                  </ThemedText>
                  {note.isTemporary && (
                    <ThemedText style={styles.tempBadge}>
                      Temp
                    </ThemedText>
                  )}
                </View>
                <ThemedText style={[styles.notePreview, { fontFamily: defaultFont }]}>
                  {getPreview(note.content)}
                </ThemedText>
                <View style={styles.noteFooter}>
                  {note.updated_at ? (
                    <ThemedText style={styles.noteMeta}>
                      Updated {formatDate(note.updated_at)}
                    </ThemedText>
                  ) : <ThemedText style={styles.noteMeta}>
                      Created {formatDate(note.created_at)}
                    </ThemedText>}
                  <TouchableOpacity analyticsId="app_notes_index_delete_button" analyticsControlType="icon" onPress={() => handleDelete(note)} style={styles.deleteButton}>
                    <ThemedText style={styles.deleteText}>Delete</ThemedText>
                  </TouchableOpacity>
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  content: {
    width: Platform.OS === 'web' ? '70%' : '100%',
    alignSelf: 'center',
    flex:1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  noteList: {

    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    flex: 1,
    paddingHorizontal: 16,
  },
  filtersCard: {
    marginTop: 8,
    padding: 4,
  },
  filtersTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    width: 55,
  },
  filterButtons: {
    flexDirection: 'row',
    flex: 1,
    gap: 5,
  },
  filterButton: {
    flex: 1,
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.6,
  },
  noteCard: {
    padding: 12,
    marginBottom: 12,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  tempBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9A3412',
    backgroundColor: '#FED7AA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  notePreview: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
    marginBottom: 10,
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteMeta: {
    fontSize: 12,
    opacity: 0.6,
  },
  deleteButton: {
    padding: 4,
  },
  deleteText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
});
