import React, { useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import DateTimePicker from '@/components/ui/AppDatePicker';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ThemedText } from '@/components/ThemedText';
import { useExams } from '@/hooks/useExams';
import { showAlert } from '@/hooks/dataHandler';

/** Creates an exam and its plain-text study resource list. */
export default function AddExamScreen() {
  const { createExam, isSaving } = useExams();
  const [subject, setSubject] = useState('');
  const [examDate, setExamDate] = useState<Date | null>(null);
  const [resultsDate, setResultsDate] = useState<Date | null>(null);
  const [resources, setResources] = useState<string[]>([]);
  const [resourceDraft, setResourceDraft] = useState('');
  const [activePicker, setActivePicker] = useState<'exam' | 'results' | null>(null);

  const toDateString = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const handleDateChange = (type: 'exam' | 'results') => (_event: unknown, selectedDate?: Date) => {
    setActivePicker(null);
    if (!selectedDate) return;
    if (type === 'exam') setExamDate(selectedDate);
    else setResultsDate(selectedDate);
  };

  const addResource = () => {
    const resource = resourceDraft.trim();
    if (!resource) return;
    setResources(current => [...current, resource]);
    setResourceDraft('');
  };

  const save = async () => {
    if (!subject.trim() || !examDate) {
      showAlert('Missing details', 'Enter a subject and exam date.');
      return;
    }
    try {
      await createExam({
        subject,
        exam_date: toDateString(examDate),
        results_date: resultsDate ? toDateString(resultsDate) : null,
        study_resources: resources,
      });
      router.back();
    } catch {
      showAlert('Unable to save', 'Please try again.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <ThemedText type="subtitle">Add exam</ThemedText>
        <Input label="Subject *" value={subject} onChangeText={setSubject} placeholder="e.g. Mathematics" />

        <ThemedText style={styles.label}>Exam date *</ThemedText>
        <Button analyticsId="app_exams_add_exam_date" title={examDate ? toDateString(examDate) : 'Select exam date'} variant="secondary" onPress={() => setActivePicker('exam')} />
        {activePicker === 'exam' && <DateTimePicker value={examDate || new Date()} mode="date" display="default" onValueChange={handleDateChange('exam')} />}
        {examDate && <Button analyticsId="app_exams_add_clear_exam_date" title="Clear" variant="danger" size="small" onPress={() => setExamDate(null)} style={styles.clearDate} />}

        <ThemedText style={styles.label}>Results date</ThemedText>
        <Button analyticsId="app_exams_add_results_date" title={resultsDate ? toDateString(resultsDate) : 'Select results date'} variant="secondary" onPress={() => setActivePicker('results')} />
        {activePicker === 'results' && <DateTimePicker value={resultsDate || examDate || new Date()} mode="date" display="default" onValueChange={handleDateChange('results')} />}
        {resultsDate && <Button analyticsId="app_exams_add_clear_results_date" title="Clear" variant="danger" size="small" onPress={() => setResultsDate(null)} style={styles.clearDate} />}

        <ThemedText style={styles.label}>Study resources</ThemedText>
        <View style={styles.resourceEntry}>
          <Input value={resourceDraft} onChangeText={setResourceDraft} placeholder="Add a study resource" viewStyle={styles.resourceInput} />
          <Button analyticsId="app_exams_add_resource" title="Add" size="small" onPress={addResource} />
        </View>
        {resources.length === 0 ? <ThemedText style={styles.emptyResources}>No resources added yet.</ThemedText> : resources.map((resource, index) => (
          <View key={`resource-${index}`} style={styles.resourceRow}>
            <Input value={resource} onChangeText={value => setResources(current => current.map((item, itemIndex) => itemIndex === index ? value : item))} viewStyle={styles.resourceInput} />
            <Button analyticsId="app_exams_remove_resource" title="Remove" variant="danger" size="small" onPress={() => setResources(current => current.filter((_, itemIndex) => itemIndex !== index))} />
          </View>
        ))}
        <View style={styles.actionRow}>
          <Button analyticsId="app_exams_add_save" title="Save" loading={isSaving} onPress={save} style={styles.button} />
          <Button analyticsId="app_exams_add_cancel" title="Cancel" variant="secondary" onPress={() => router.back()} style={styles.button} />
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%'
  },
  content: {
    width: Platform.OS === 'web' ? '70%' : '100%',
    alignSelf: 'center',
    padding: 16
    },
  card: {
    padding: 16,
    gap: 10
  },
  label: {
    fontWeight: '700'
  },
  resourceEntry: { 
    flexDirection: 'row', 
    alignItems: 'flex-end', 
    gap: 8,
    marginBottom: 8,
  },
  resourceInput: { 
    flex: 1,
  
  },
  resourceRow: { 
    flexDirection: 'row', 
    alignItems: 'flex-end', 
    gap: 8,
    marginBottom: 8,
  },
  emptyResources: { 
    opacity: 0.7 
  },
  actionRow: { 
    flexDirection: 'row', 
    gap: 8, 
    marginTop: 10 
  },
  button:{
    flex: 1,
  },
  clearDate: {
    marginTop: 4,
    marginBottom: 8,
  },
});


