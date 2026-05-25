import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useEducationGrades } from '@/hooks/useEducationGrades';
import { useThemeColour } from '@/hooks/useThemeColour';
import { Colours } from '@/constants/Colours';

const formatDate = (date?: string | null) => {
  if (!date) return 'No date added';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'No date added';
  return parsed.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
};

export default function EducationGradesScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const { grades, loading, fetchGrades } = useEducationGrades();
  const backgroundColour = useThemeColour({}, 'background');

  const sortedGrades = useMemo(() => [...grades], [grades]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchGrades();
    } finally {
      setRefreshing(false);
    }
  }, [fetchGrades]);

  if (loading && grades.length === 0) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <LoadingSpinner />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: backgroundColour }]}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} contentContainerStyle={styles.content}>
        <ThemedText type="title" style={styles.title}>Grades</ThemedText>
        <ThemedText style={styles.subtitle}>Track your education achievements in one place.</ThemedText>

        {sortedGrades.length === 0 ? (
          <Card style={styles.emptyCard}>
            <ThemedText type="subtitle">No grades added yet</ThemedText>
            <ThemedText style={styles.emptyText}>Use the add button to save your first grade.</ThemedText>
          </Card>
        ) : (
          sortedGrades.map(grade => (
            <TouchableOpacity key={grade.id} onPress={() => router.push(`/grades/edit/${grade.id}`)}>
              <Card style={styles.gradeCard}>
                <ThemedText type="defaultSemiBold">{grade.subject}</ThemedText>
                <ThemedText style={styles.gradeMeta}>Qualification: {grade.qualification_type}</ThemedText>
                <ThemedText style={styles.gradeText}>Grade: {grade.grade}</ThemedText>
                <ThemedText style={styles.gradeMeta}>Institution: {grade.institution_name || 'Not provided'}</ThemedText>
                <ThemedText style={styles.gradeMeta}>Date achieved: {formatDate(grade.date_achieved)}</ThemedText>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/grades/add')}>
        <ThemedText style={styles.fabText}>+</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 96 },
  title: { fontSize: 24, marginBottom: 4 },
  subtitle: { opacity: 0.7, marginBottom: 16 },
  gradeCard: { padding: 16 },
  gradeText: { marginTop: 8, fontSize: 16 },
  gradeMeta: { marginTop: 4, opacity: 0.75 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyCard: { padding: 16 },
  emptyText: { marginTop: 8, opacity: 0.8 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colours.light.primary,
    elevation: 6,
  },
  fabText: { color: '#FFFFFF', fontSize: 30, lineHeight: 34 },
});
