import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useEducationGrade, useEducationGrades } from '@/hooks/useEducationGrades';
import { useThemeColour } from '@/hooks/useThemeColour';
import { EDUCATION_GRADES, EDUCATION_TYPES, EducationType } from '@/types/educationGrade';

const MONTHS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const YEARS = Array.from({ length: 60 }, (_, index) => String(new Date().getFullYear() - index));

export default function EditEducationGradeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const gradeId = Number(id);
  const { data: grade, isLoading } = useEducationGrade(gradeId);
  const { updateGrade, deleteGrade, isUpdating, isDeleting } = useEducationGrades();
  const cardBackground = useThemeColour({}, 'cardBackground');
  const [subject, setSubject] = useState('');
  const [qualificationType, setQualificationType] = useState<EducationType>('GCSE');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [otherGrade, setOtherGrade] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [notes, setNotes] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');

  useEffect(() => {
    if (!grade) return;
    setSubject(grade.subject || '');
    setQualificationType(grade.qualification_type);

    if (grade.qualification_type === 'Other') setOtherGrade(grade.grade || '');
    else setSelectedGrade(grade.grade || '');
    setInstitutionName(grade.institution_name || '');
    setNotes(grade.notes || '');

    if (grade.date_achieved) {
      const [storedYear, storedMonth] = grade.date_achieved.split('-');
      setYear(storedYear || '');
      setMonth(storedMonth || '');
    }
  }, [grade]);

  const availableGrades = useMemo(() => {
    if (qualificationType === 'Other') return [];
    return EDUCATION_GRADES[qualificationType];
  }, [qualificationType]);

  const handleSave = async () => {
    const trimmedSubject = subject.trim();
    const gradeValue = qualificationType === 'Other' ? otherGrade.trim() : selectedGrade;

    if (!trimmedSubject || !qualificationType || !gradeValue) {
      Alert.alert('Missing required fields', 'Subject, qualification type and grade are required.');
      return;
    }

    const dateAchieved = month && year ? `${year}-${month}-01` : null;

    try {
      await updateGrade({
        id: gradeId,
        payload: {
          subject: trimmedSubject,
          qualification_type: qualificationType,
          grade: gradeValue,
          institution_name: institutionName.trim() || null,
          date_achieved: dateAchieved,
          notes: notes.trim() || null,
        },
      });
      router.back();
    } catch (error) {
      console.error('EditEducationGradeScreen.handleSave', error);
      Alert.alert('Unable to save', 'Please try again.');
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete grade', 'Are you sure you want to delete this grade?', [
      { text: 'Cancel', style: 'cancel' }, {text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deleteGrade(gradeId);
            router.back();
          } catch (error) {
            console.error('EditEducationGradeScreen.handleDelete', error);
            Alert.alert('Unable to delete', 'Please try again.');
          }
        },
      },
    ]);
  };

  if (isLoading || !grade) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <LoadingSpinner />
      </ThemedView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={[styles.card, { backgroundColor: cardBackground }]}> 
        <ThemedText type="subtitle" style={styles.title}>Edit Grade</ThemedText>
        <ThemedText style={styles.label}>Qualification type *</ThemedText>
        <Picker selectedValue={qualificationType} onValueChange={(value) => { setQualificationType(value as EducationType); setSelectedGrade(''); }}>
          {EDUCATION_TYPES.map(type => <Picker.Item key={type} label={type} value={type} />)}
        </Picker>
        <Input label="Subject *" value={subject} onChangeText={setSubject} placeholder="e.g. Maths" />
        {qualificationType !== 'Other' ? (
          <>
            <ThemedText style={styles.label}>Grade *</ThemedText>
            <Picker selectedValue={selectedGrade} onValueChange={(value) => setSelectedGrade(value)}>
              <Picker.Item label="Select grade" value="" />
              {availableGrades.map(item => <Picker.Item key={item} label={item} value={item} />)}
            </Picker>
          </>
        ) : (
          <Input label="Grade details *" value={otherGrade} onChangeText={setOtherGrade} multiline numberOfLines={4} style={styles.textArea} />
        )}
        <Input label="School / Institution" value={institutionName} onChangeText={setInstitutionName} placeholder="Optional" />
        <ThemedText style={styles.label}>Date achieved</ThemedText>
        <ThemedView style={styles.dateRow}>
          <ThemedView style={styles.datePickerWrap}>
            <Picker selectedValue={month} onValueChange={(value) => setMonth(value)}>
              <Picker.Item label="Month" value="" />
              {MONTHS.map(item => <Picker.Item key={item} label={item} value={item} />)}
            </Picker>
          </ThemedView>
          <ThemedView style={styles.datePickerWrap}>
            <Picker selectedValue={year} onValueChange={(value) => setYear(value)}>
              <Picker.Item label="Year" value="" />
              {YEARS.map(item => <Picker.Item key={item} label={item} value={item} />)}
            </Picker>
          </ThemedView>
        </ThemedView>
        <Input label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional" multiline numberOfLines={4} style={styles.textArea} />
        <ThemedView style={styles.buttonRow}>
          <Button title={isUpdating ? 'Saving...' : 'Save'} onPress={handleSave} disabled={isUpdating} style={styles.button} />
          <Button title="Cancel" variant="secondary" onPress={() => router.back()} style={styles.button} />
        </ThemedView>
        <Button title={isDeleting ? 'Deleting...' : 'Delete'} variant="danger" onPress={handleDelete} disabled={isDeleting} style={styles.deleteButton} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  card: { padding: 16 },
  title: { marginBottom: 12 },
  label: { marginTop: 6, marginBottom: 4, fontWeight: '600' },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  dateRow: { flexDirection: 'row', gap: 8 },
  datePickerWrap: { flex: 1 },
  buttonRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  button: { flex: 1 },
  deleteButton: { marginTop: 8 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
