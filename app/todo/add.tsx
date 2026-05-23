import React, { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { TriOptionsButton } from '@/components/ui/TriOptionsButton';
import { formatDate } from '@/hooks/dataHandler';
import { useAuth } from '@/hooks/useAuth';
import { useTodos } from '@/hooks/useTodos';
import { lifeNestService } from '@/services/lifeNestService';
import { showTokenUsageToast } from '@/services/tokenToastService';
import { CreateToDoRequest, ToDoItemKind, ToDoTypes } from '@/types/todo';

//
const CHECKLIST_PRESETS = [
  {
    title: 'Moving out for the first time',
    items: ['Council tax', 'Utilities', 'Broadband', 'GP registration', 'Dentist', 'National Insurance', 'Tenancy agreement', 'Benefits eligibility', 'Emergency contacts', 'Food budget', 'ID documents'],
  },
  {
    title: 'First week in a new home',
    items: ['Collect keys', 'Take meter readings', 'Test smoke alarms', 'Locate fuse box', 'Check stopcock', 'Photograph condition', 'Set up bins', 'Buy cleaning basics', 'Plan first food shop'],
  },
  {
    title: 'Job interview preparation',
    items: ['Research the employer', 'Plan travel route', 'Prepare ID documents', 'Choose interview outfit', 'Practise key answers', 'Prepare questions to ask', 'Charge phone', 'Set morning alarm'],
  },
];

//
type DraftChecklistItem = {
  id: string;
  text: string;
};

/** Renders the add flow for either a task or a checklist. */
//
export default function AddTodoScreen() {
  //
  const [itemKind, setItemKind] = useState<ToDoItemKind>('task');
  //
  const [title, setTitle] = useState('');
  //
  const [description, setDescription] = useState('');
  //
  const [unit, setUnit] = useState('');
  //
  const [categoryId, setCategoryId] = useState<number | null>(null);
  //
  const [premiumCategoryId, setPremiumCategoryId] = useState<number | null>(null);
  //
  const [dueDate, setDueDate] = useState<Date | null>(null);
  //
  const [showDatePicker, setShowDatePicker] = useState(false);
  //
  const [loading, setLoading] = useState(false);
  //
  const [remindMe, setRemindMe] = useState(false);
  //
  const [selected, setSelected] = useState(ToDoTypes[0]);
  //
  const [newChecklistItem, setNewChecklistItem] = useState('');
  //
  const [checklistItems, setChecklistItems] = useState<DraftChecklistItem[]>([]);
  //
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  //
  const [aiLoading, setAiLoading] = useState(false);
  //
  const [aiUsed, setAiUsed] = useState(false);
  //
  const nextChecklistItemId = useRef(0);
  //
  const { categories, premiumCategories, createTodo, fetchCategories } = useTodos();
  //
  const { userInfo } = useAuth();

  //
  const createDraftChecklistItem = (text: string): DraftChecklistItem => ({
    id: `draft-checklist-item-${nextChecklistItemId.current++}`,
    text,
  });

  //
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  //
  useEffect(() => {
    //
    let active = true;
    lifeNestService.getCurrentMonthlyUsageSummary()
      .then((summary) => {
        //
        if (active) setTokenBalance(summary.totalTokensRemaining);
      })
      .catch(() => {
        //
        if (active) setTokenBalance(0);
      });
    //
    return () => { active = false; };
  }, []);

  //
  const handleAddChecklistItem = () => {
    //
    const item = newChecklistItem.trim();
    //
    if (!item) return;
    setChecklistItems((current) => [...current, createDraftChecklistItem(item)]);
    setNewChecklistItem('');
  };

  //
  const updateChecklistItem = (id: string, value: string) => {
    setChecklistItems((current) => current.map((item) => (item.id === id ? { ...item, text: value } : item)));
  };

  //
  const applyPreset = (preset: typeof CHECKLIST_PRESETS[number]) => {
    setItemKind('checklist');
    setTitle(preset.title);
    setChecklistItems(preset.items.map(createDraftChecklistItem));
    setNewChecklistItem('');
  };

  //
  const runChecklistAI = async () => {
    //
    if (aiUsed) {
      Alert.alert('Use another token?', 'Are you sure you would like to use Enhance/Complete again?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => void enhanceChecklist() },
      ]);
      return;
    }
    await enhanceChecklist();
  };

  //
  const enhanceChecklist = async () => {
    setItemKind('checklist');
    setAiLoading(true);
    //
    try {
      //
      const generated = await lifeNestService.generateChecklist(title, [...checklistItems.map((item) => item.text), newChecklistItem].filter((item) => item.trim()));
      setTitle(generated.title);
      setChecklistItems(generated.items.map(createDraftChecklistItem));
      setNewChecklistItem('');
      setAiUsed(true);
      //
      if (generated.usage) {
        showTokenUsageToast(generated.usage.tokensUsed);
        setTokenBalance((current) => (current === null ? current : Math.max(current - generated.usage!.tokensUsed, 0)));
      }
    } catch (error) {
      console.error('Failed to generate checklist:', error);
      Alert.alert('Error', 'Could not enhance this checklist. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  //
  const handleSave = async () => {
    //
    if (!title.trim()) {
      Alert.alert('Error', `Please enter a title for the ${itemKind}`);
      return;
    }

    //
    if (itemKind === 'checklist') {
      //
      const trimmedItems = checklistItems.map((item) => item.text.trim()).filter(Boolean);
      //
      if (trimmedItems.length === 0) {
        Alert.alert('Error', 'Please add at least one checklist item');
        return;
      }
      setLoading(true);
      //
      try {
        await createTodo({
          title: title.trim(),
          description: '',
          category_id: null,
          remind_me: false,
          type: 'Checklist',
          item_kind: 'checklist',
          due_date_time: dueDate?.toISOString(),
          checklist_items: trimmedItems,
        });
        Alert.alert('Success', 'Checklist created successfully!', [{ text: 'OK', onPress: () => router.back() }]);
      } catch (error) {
        console.error('Failed to create checklist:', error);
      } finally {
        setLoading(false);
      }
      return;
    }

    //
    if (!dueDate) {
      Alert.alert('Error', 'Please select a due date');
      return;
    }

    //
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description for the task');
      return;
    }

    //
    if (!unit.trim() && (selected === 'Numerical' || selected === 'Percentage')) {
      Alert.alert('Error', 'Please enter a unit for the task');
      return;
    }

    //
    if (!categoryId) {
      Alert.alert('Error', 'Please select a category');
      return;
    }
    setLoading(true);

    //
    try {
      //
      const todoData: CreateToDoRequest = {
        title: title.trim(),
        description: description.trim(),
        unit: unit?.trim() || undefined,
        category_id: categoryId,
        due_date_time: dueDate.toISOString(),
        remind_me: remindMe,
        type: selected,
        premium_category_id: premiumCategoryId,
        item_kind: 'task',
      };

      await createTodo(todoData);
      Alert.alert('Success', 'Task created successfully!', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setLoading(false);
    }
  };

  //
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    //
    if (selectedDate) {
      setDueDate(selectedDate);
    }
  };

  //
  const clearDate = () => {
    setDueDate(null);
  };

  //
  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContainer}>
        <ThemedView style={styles.content}>
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>{itemKind === 'checklist' ? 'Add Checklist' : 'Add New Task'}</ThemedText>
          </View>
          <View style={styles.form}>
            <TriOptionsButton options={['Task', 'Checklist']} containerStyle={styles.inputGroup} onSelect={(value) => setItemKind(value.toLowerCase() as ToDoItemKind)} selectedOption={itemKind === 'task' ? 'Task' : 'Checklist'} enabled={true} />
            {itemKind === 'checklist' ? (
              <>
                <View style={styles.presetButtons}>
                  {CHECKLIST_PRESETS.map((preset) => (
                    <Button key={preset.title} title={preset.title} variant="secondary" size="small" onPress={() => applyPreset(preset)} style={styles.presetButton} />
                  ))}
                  <Button title={aiLoading ? 'Enhancing...' : '🪺 Enhance/Complete'} variant="primary" size="small" onPress={runChecklistAI} loading={aiLoading} disabled={aiLoading || tokenBalance === null || tokenBalance <= 0} style={styles.presetButton} />
                </View>
                <View style={styles.inputGroup}>
                  <Input label="Title" required={true} labelStyle={styles.label} placeholder="Enter checklist title" value={title} onChangeText={setTitle} style={styles.input} />
                </View>
                <View style={styles.inputGroup}>
                  <ThemedText style={styles.label}>Due By</ThemedText>
                  <View style={styles.dateContainer}>
                    <Button title={dueDate ? formatDate(dueDate.toString()) : 'Select Due By'} variant="secondary" onPress={() => setShowDatePicker(true)} style={styles.dateButton} />
                    {dueDate && (<Button title="Clear" variant="danger" size="small" onPress={clearDate} style={styles.clearButton} />)}
                  </View>
                  {showDatePicker && (<DateTimePicker value={dueDate || new Date()} mode="date" display="default" onChange={handleDateChange} minimumDate={new Date()} />)}
                </View>
                <View style={styles.inputGroup}>
                  <Input label="Checklist item" labelStyle={styles.label} placeholder="Enter an item" value={newChecklistItem} onChangeText={setNewChecklistItem} style={styles.input} onSubmitEditing={handleAddChecklistItem} />
                  <Button title="Add Item" variant="secondary" onPress={handleAddChecklistItem} disabled={!newChecklistItem.trim()} />
                </View>
                {checklistItems.map((item, index) => (
                  <View key={item.id} style={styles.inputGroup}>
                    <Input label={`Item ${index + 1}`} labelStyle={styles.label} placeholder="Checklist item" value={item.text} onChangeText={(value) => updateChecklistItem(item.id, value)} style={styles.input} />
                  </View>
                ))}
              </>
            ) : (
              <>
                <View style={styles.inputGroup}>
                  <Input label="Title" required={true} labelStyle={styles.label} placeholder="Enter task title" value={title} onChangeText={setTitle} style={styles.input} keyboardType="default" autoCapitalize="none" autoCorrect={true} />
                </View>
                <TriOptionsButton options={ToDoTypes} containerStyle={styles.inputGroup} onSelect={setSelected} selectedOption={selected} enabled={true} />
                {selected === 'Numerical' ? (
                  <>
                    <View style={styles.inputGroup}><Input label="Milestone" required={true} labelStyle={styles.label} placeholder="Enter task milestone" value={description} onChangeText={setDescription} keyboardType="number-pad" style={styles.input} /></View>
                    <View style={styles.inputGroup}><Input label="Unit" required={true} labelStyle={styles.label} placeholder="Enter unit" value={unit} onChangeText={setUnit} style={styles.input} /></View>
                  </>
                ) : selected === 'Percentage' ? (
                  <>
                    <View style={styles.inputGroup}><Input label="Percentage" required={true} labelStyle={styles.label} placeholder="Enter task percentage" value={description} onChangeText={setDescription} keyboardType="decimal-pad" style={styles.input} /></View>
                    <View style={styles.inputGroup}><Input label="Unit" required={true} labelStyle={styles.label} placeholder="Enter percentage unit" value={unit} onChangeText={setUnit} style={styles.input} /></View>
                  </>
                ) : selected === 'Yes/No | True/False' ? (
                  <View style={styles.inputGroup}><Input label="Description" required={true} labelStyle={styles.label} placeholder="Enter task description" value={description} onChangeText={setDescription} style={styles.input} /></View>
                ) : (
                  <View style={styles.inputGroup}><Input label="Description" required={true} labelStyle={styles.label} placeholder="Enter task description" value={description} onChangeText={setDescription} multiline numberOfLines={3} style={[styles.input, styles.textArea]} /></View>
                )}
                <View style={styles.inputGroup}>
                  <ThemedText style={styles.label}>Category *</ThemedText>
                  <View style={styles.categoryButtons}>{categories?.map((category) => (<Button key={category.id} title={category.name} variant={categoryId === category.id ? 'primary' : 'secondary'} size="small" onPress={() => setCategoryId(category.id)} style={styles.categoryButton} />))}</View>
                </View>
                <View style={styles.inputGroup}>
                  <ThemedText style={styles.label}>Premium Categories/Types</ThemedText>
                  <View style={styles.categoryButtons}>{premiumCategories?.map((category) => (<Button key={category.id} title={category.name} variant={premiumCategoryId === category.id ? 'primary' : 'secondary'} size="small" disabled={!userInfo?.is_premium_user} onPress={() => setPremiumCategoryId((prev) => (prev === category.id ? null : category.id))} style={styles.categoryButton} />))}</View>
                </View>
                <View style={styles.inputGroup}>
                  <ThemedText style={styles.label}>Due Date</ThemedText>
                  <View style={styles.dateContainer}>
                    <Button title={dueDate ? formatDate(dueDate.toString()) : 'Select Due Date'} variant="secondary" onPress={() => setShowDatePicker(true)} style={styles.dateButton} />
                    {dueDate && (<Button title="Clear" variant="danger" size="small" onPress={clearDate} style={styles.clearButton} />)}
                  </View>
                  {showDatePicker && (<DateTimePicker value={dueDate || new Date()} mode="date" display="default" onChange={handleDateChange} minimumDate={new Date()} />)}
                </View>
                <View style={styles.inputGroup}><Switch label="Remind Me" labelStyle={styles.label} value={remindMe} onValueChange={setRemindMe} /></View>
              </>
            )}
            <View style={styles.actions}>
              <Button title="Cancel" variant="secondary" onPress={() => router.back()} style={styles.cancelButton} />
              <Button title={loading ? 'Creating...' : itemKind === 'checklist' ? 'Create Checklist' : 'Create Task'} onPress={handleSave} loading={loading} disabled={loading || !title.trim()} style={styles.saveButton} />
            </View>
          </View>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

//
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContainer: { flexGrow: 1, justifyContent: 'center' },
  content: { flex: 1, padding: 16 },
  header: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 'bold' },
  form: { gap: 20 },
  inputGroup: { gap: 8 },
  label: { fontSize: 16, fontWeight: '600' },
  input: { minHeight: 44 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  categoryButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryButton: { minWidth: 100 },
  presetButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetButton: { minWidth: 140, flexGrow: 1 },
  dateContainer: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  dateButton: { flex: 1 },
  clearButton: { minWidth: 80 },
  actions: { flexDirection: 'row', gap: 12 },
  cancelButton: { flex: 1 },
  saveButton: { flex: 2 },
});
