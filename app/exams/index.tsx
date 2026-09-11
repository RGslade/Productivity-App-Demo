import React, { useCallback, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ThemedText } from '@/components/ThemedText';
import { useExams } from '@/hooks/useExams';
import { useEducationGrades } from '@/hooks/useEducationGrades';
import { examService } from '@/services/examService';
import { showAlert } from '@/hooks/dataHandler';

/** Shows upcoming exams, study resources, and result reminders. */
export default function ExamsScreen() {
  const { exams, loading, refetch } = useExams();
  const { grades, loading: gradesLoading, fetchGrades } = useEducationGrades();
  const [reminderChecked, setReminderChecked] = useState(false);
  useFocusEffect(useCallback(() => {
    let cancelled = false;
    void refetch();
    void fetchGrades();
    void examService.checkAndNotifyDueReminders().then((reminders) => {
      if (cancelled || reminderChecked || reminders.length === 0) return;
      setReminderChecked(true);
      const resultReminder = reminders.find((item) => item.kind === 'results_date');
      if (resultReminder) showAlert(`Enter your ${resultReminder.exam.subject} result`, 'Your results date has arrived. Enter the result now or return later.', [{ text: 'Later', style: 'cancel' }, { text: 'Enter result', onPress: () => router.push(`/exams/result/${resultReminder.exam.id}` as any) }]);
    }).catch((error) => console.error('ExamsScreen.checkReminders', error));
    return () => { cancelled = true; };
  }, [fetchGrades, refetch, reminderChecked]));

  if ((loading || gradesLoading) && exams.length === 0 && grades.length === 0) return <LoadingSpinner />;
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ThemedText type="title">Education</ThemedText>
      <ThemedText style={styles.intro}>Keep exams, study resources, results, and grades together.</ThemedText>
      <View style={styles.sectionHeader}>
        <ThemedText type="subtitle">Exams</ThemedText>
        <Button analyticsId="app_education_add_exam" title="Add exam" size="small" onPress={() => router.push('/exams/add' as any)} />
      </View>
      {exams.length === 0 ? <Card style={styles.card}><ThemedText type="subtitle">No exams added yet</ThemedText><ThemedText>Add your next exam to keep its study plan close.</ThemedText></Card> : exams.map((exam) => (
        <Card key={exam.id} style={styles.card}>
          <ThemedText type="subtitle">{exam.subject}</ThemedText>
          <ThemedText>Exam date: {exam.exam_date}</ThemedText>
          <ThemedText>Results date: {exam.results_date || 'Not set'}</ThemedText>
          <ThemedText>{exam.result_value ? `Result: ${exam.result_value}` : `${exam.study_resources.length} study resource${exam.study_resources.length === 1 ? '' : 's'}`}</ThemedText>
          <View style={styles.actions}>
            <Button analyticsId="app_exams_edit" title="Edit" size="small" variant="outline" onPress={() => router.push(`/exams/edit/${exam.id}` as any)} />
            {!exam.result_value && <Button analyticsId="app_exams_result" title="Enter result" size="small" variant="secondary" onPress={() => router.push(`/exams/result/${exam.id}` as any)} />}
            {exam.study_resources.length > 0 && <Button analyticsId="app_exams_checklist" title={exam.generated_checklist_todo_id ? 'Checklist ready' : 'Make checklist'} size="small" onPress={async () => { try { await examService.createStudyChecklist(exam); showAlert('Checklist created', 'The study resources are now available in Nest.'); await refetch(); } catch { showAlert('Unable to create checklist', 'Please try again.'); } }} />}
          </View>
        </Card>
      ))}
      <View style={styles.sectionHeader}>
        <ThemedText type="subtitle">Grades</ThemedText>
        <Button analyticsId="app_education_add_grade" title="Add grade" size="small" onPress={() => router.push('/grades/add' as any)} />
      </View>
      {grades.length === 0 ? (
        <Card style={styles.card}><ThemedText>No grades added yet.</ThemedText></Card>
      ) : grades.map(grade => (
        <Card key={grade.id} style={styles.card}>
          <ThemedText type="subtitle">{grade.subject}</ThemedText>
          <ThemedText>Qualification: {grade.qualification_type}</ThemedText>
          <ThemedText>Grade: {grade.grade}</ThemedText>
          <ThemedText style={styles.meta}>Institution: {grade.institution_name || 'Not provided'}</ThemedText>
          <ThemedText style={styles.meta}>Date achieved: {grade.date_achieved ? new Date(grade.date_achieved).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : 'No date added'}</ThemedText>
          <Button analyticsId="app_education_edit_grade" title="Edit" size="small" variant="outline" onPress={() => router.push(`/grades/edit/${grade.id}` as any)} />
        </Card>
      ))}
    </ScrollView>
  );
}
const styles = StyleSheet.create({ 
  container: { flex: 1 }, 
  content: { 
    padding: 16, 
    gap: 12,
    width: Platform.OS === 'web' ? '70%' : undefined,
    alignSelf: 'center'
  }, 
  intro: { 
    marginBottom: 4, 
    opacity: 0.75 
  }, 
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  card: { 
    padding: 16, 
    gap: 6 
  }, 
  actions: { 
    flexDirection: 'row', 
    flexWrap: 'wrap',
     gap: 8, 
     marginTop: 8 
    },
  meta: {
    opacity: 0.75,
  },
});


