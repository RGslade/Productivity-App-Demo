import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useEducationGrades } from '@/hooks/useEducationGrades';
import { useThemeColour } from '@/hooks/useThemeColour';
import { showAlert } from '@/hooks/dataHandler';
import {
  EDUCATION_GRADES,
  EDUCATION_TYPES,
  EducationType,
  getEducationGradeValidationError,
  normalizeEducationGradeValue,
} from '@/types/educationGrade';

const MONTHS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const YEARS = Array.from({ length: 60 }, (_, index) => String(new Date().getFullYear() - index));

export default function AddEducationGradeScreen() {
  const { subject: subjectParam, grade: gradeParam, date: dateParam } = useLocalSearchParams<{ subject?: string; grade?: string; date?: string }>();
  const { createGrade, isCreating } = useEducationGrades();
  const [subject, setSubject] = useState('');
  const [qualificationType, setQualificationType] = useState<EducationType>('GCSE');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [otherGrade, setOtherGrade] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [notes, setNotes] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const cardBackground = useThemeColour({}, 'cardBackground');

  React.useEffect(() => {
    if (subjectParam) setSubject(Array.isArray(subjectParam) ? subjectParam[0] : subjectParam);
    if (gradeParam) { const value = Array.isArray(gradeParam) ? gradeParam[0] : gradeParam; setOtherGrade(value); setSelectedGrade(value); setQualificationType('Other'); }
    if (dateParam) { const value = Array.isArray(dateParam) ? dateParam[0] : dateParam; setYear(value.slice(0, 4)); setMonth(value.slice(5, 7)); }
  }, [dateParam, gradeParam, subjectParam]);

  const availableGrades = useMemo(() => {
    if (qualificationType === 'Other') return [];
    return EDUCATION_GRADES[qualificationType];
  }, [qualificationType]);

  const handleSave = async () => {
    const trimmedSubject = normalizeEducationGradeValue(subject);
    const normalizedQualificationType = normalizeEducationGradeValue(qualificationType) as EducationType;
    const gradeValue = normalizeEducationGradeValue(qualificationType === 'Other' ? otherGrade : selectedGrade);
    const validationError = getEducationGradeValidationError(trimmedSubject, normalizedQualificationType, gradeValue);
    if (validationError) {
      showAlert('Missing required fields', validationError);
      return;
    }

    const dateAchieved = month && year ? `${year}-${month}-01` : null;

    try {
      await createGrade({
        subject: trimmedSubject,
        qualification_type: normalizedQualificationType,
        grade: gradeValue,
        institution_name: institutionName.trim() || null,
        date_achieved: dateAchieved,
        notes: notes.trim() || null,
      });
      router.back();
    } catch (error) {
      console.error('AddEducationGradeScreen.handleSave', error);
      showAlert('Unable to save', 'Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView enabled={Platform.OS === 'ios'} style={styles.keyboardContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
      >
      <Card style={[styles.card, { backgroundColor: cardBackground }]}> 
        <ThemedText type="subtitle" style={styles.title}>Add Grade</ThemedText>

        <ThemedText style={styles.label}>Qualification type *</ThemedText>
        <Picker selectedValue={qualificationType} onValueChange={(value) => { setQualificationType(normalizeEducationGradeValue(value) as EducationType); setSelectedGrade(''); setOtherGrade(''); }}>
          {EDUCATION_TYPES.map(type => <Picker.Item key={type} label={type} value={type} />)}
        </Picker>

        <Input label="Subject *" value={subject} onChangeText={setSubject} placeholder="e.g. Maths" />

        {qualificationType !== 'Other' ? (
          <>
            <ThemedText style={styles.label}>Grade *</ThemedText>
            <Picker selectedValue={selectedGrade} onValueChange={(value) => setSelectedGrade(normalizeEducationGradeValue(value))}>
              <Picker.Item label="Select grade" value="" />
              {availableGrades.map(grade => <Picker.Item key={grade} label={grade} value={grade} />)}
            </Picker>
          </>
        ) : (
          <Input
            label="Grade details *"
            value={otherGrade}
            onChangeText={setOtherGrade}
            placeholder="Enter your grade details"
            multiline
            numberOfLines={4}
            style={styles.textArea}
          />
        )}

        <Input label="School / Institution" value={institutionName} onChangeText={setInstitutionName} placeholder="Optional" />

        <ThemedText style={styles.label}>Date achieved</ThemedText>
        <ThemedView style={styles.dateRow}>
          <ThemedView style={styles.datePickerWrap}>
            <Picker selectedValue={month} onValueChange={(value) => setMonth(normalizeEducationGradeValue(value))}>
              <Picker.Item label="Month" value="" />
              {MONTHS.map(item => <Picker.Item key={item} label={item} value={item} />)}
            </Picker>
          </ThemedView>
          <ThemedView style={styles.datePickerWrap}>
            <Picker selectedValue={year} onValueChange={(value) => setYear(normalizeEducationGradeValue(value))}>
              <Picker.Item label="Year" value="" />
              {YEARS.map(item => <Picker.Item key={item} label={item} value={item} />)}
            </Picker>
          </ThemedView>
        </ThemedView>

        <Input label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional" multiline numberOfLines={4} style={styles.textArea} />

        <ThemedView style={styles.buttonRow}>
          <Button analyticsId="app_grades_add_handle_save" title={isCreating ? 'Saving...' : 'Save'} onPress={handleSave} disabled={isCreating} style={styles.button} />
          <Button analyticsId="app_grades_add_cancel" title="Cancel" variant="secondary" onPress={() => router.back()} style={styles.button} />
        </ThemedView>
      </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: { flex: 1 },
  container: { flex: 1, width: '100%' },
  content: { width: Platform.OS === 'web' ? '70%' : '100%', alignSelf: 'center', padding: 16 },
  card: { padding: 16 },
  title: { marginBottom: 12 },
  label: { marginTop: 6, marginBottom: 4, fontWeight: '600' },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  dateRow: { flexDirection: 'row', gap: 8 },
  datePickerWrap: { flex: 1 },
  buttonRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  button: { flex: 1 },
});
