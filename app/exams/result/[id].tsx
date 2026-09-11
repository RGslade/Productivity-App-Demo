import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ThemedText } from '@/components/ThemedText';
import { examService } from '@/services/examService';
import { showAlert } from '@/hooks/dataHandler';

/** Records an exam result and offers the existing Grades add flow. */
export default function ExamResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const examId = Number(id); const [exam, setExam] = useState<any>(null); const [result, setResult] = useState(''); const [status, setStatus] = useState('');
  useEffect(() => { void examService.getExam(examId).then(setExam); }, [examId]);
  if (!exam) return <LoadingSpinner />;
  const save = async () => { if (!result.trim()) { showAlert('Missing result', 'Enter the result before saving.'); return; } try { await examService.updateExam(examId, { result_value: result.trim(), result_status: status.trim() || null }); showAlert('Result saved', 'Would you like to add this result to Grades?', [{ text: 'Later', style: 'cancel', onPress: () => router.back() }, { text: 'Add to Grades', onPress: () => router.push(`/grades/add?subject=${encodeURIComponent(exam.subject)}&grade=${encodeURIComponent(result.trim())}&date=${exam.results_date || new Date().toISOString().slice(0, 10)}` as any) }]); } catch { showAlert('Unable to save', 'Please try again.'); } };
  return <ScrollView style={styles.container} contentContainerStyle={styles.content}><Card style={styles.card}><ThemedText type="subtitle">Enter result: {exam.subject}</ThemedText><Input label="Result *" value={result} onChangeText={setResult} placeholder="e.g. A" /><Input label="Status" value={status} onChangeText={setStatus} placeholder="Optional, e.g. Pass" /><Button analyticsId="app_exams_result_save" title="Save result" onPress={save} /><Button analyticsId="app_exams_result_cancel" title="Cancel" variant="secondary" onPress={() => router.back()} /></Card></ScrollView>;
}
const styles = StyleSheet.create({ container: { flex: 1, width: '100%' }, content: { width: Platform.OS === 'web' ? '70%' : '100%', alignSelf: 'center', padding: 16 }, card: { padding: 16, gap: 10 } });


