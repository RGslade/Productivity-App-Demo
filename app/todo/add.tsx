import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import DateTimePicker from '@/components/ui/AppDatePicker';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { TriOptionsButton } from '@/components/ui/TriOptionsButton';
import { formatDate, showAlert } from '@/hooks/dataHandler';
import { useCategories, useCreateTodo, usePremiumCategories } from '@/hooks/useTodos';
import { lifeNestService } from '@/services/lifeNestService';
import { showTokenUsageToast } from '@/services/tokenToastService';
import { createTokenOperationId, tokenUsageService } from '@/services/tokenUsageService';
import { CreateToDoRequest, ToDoItemKind, ToDoTypes, ToDoMeasurementType } from '@/types/todo';

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

type DraftChecklistItem = {
  id: string;
  text: string;
};

/** Renders the add flow for either a task or a checklist. */
export default function AddTodoScreen() {
  const [itemKind, setItemKind] = useState<ToDoItemKind>('task');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [premiumCategoryId, setPremiumCategoryId] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [remindMe, setRemindMe] = useState(false);
  const [selected, setSelected] = useState<ToDoMeasurementType>(ToDoTypes[0]);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [checklistItems, setChecklistItems] = useState<DraftChecklistItem[]>([]);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiUsed, setAiUsed] = useState(false);
  const nextChecklistItemId = useRef(0);
  const { data: categories = [], error: categoriesError, isLoading: categoriesLoading } = useCategories();
  const { data: premiumCategories = [] } = usePremiumCategories();
  const createTodo = useCreateTodo();

  /** Changes measurement type and assigns the fixed currency unit when needed. */
  const handleMeasurementTypeChange = (value: string) => {
    const next = value as ToDoMeasurementType;
    setSelected(next);
    setUnit(next === 'Â£$â‚¬' ? 'Â£$â‚¬' : '');
  };

  /** Accepts only non-negative numeric input for measurement targets. */
  const handleNumericMeasurementChange = (value: string) => {
    if (/^\d*(\.\d*)?$/.test(value)) {
      setDescription(value);
    }
  };

  const createDraftChecklistItem = (text: string): DraftChecklistItem => ({
    id: `draft-checklist-item-${nextChecklistItemId.current++}`,
    text,
  });

  useEffect(() => {
    let active = true;
    lifeNestService.getCurrentMonthlyUsageSummary()
      .then((summary) => {
        if (active) setTokenBalance(summary.totalTokensRemaining);
      })
      .catch(() => {
        if (active) setTokenBalance(0);
      });
    return () => { active = false; };
  }, []);

  const handleAddChecklistItem = () => {
    const item = newChecklistItem.trim();
    if (!item) return;
    setChecklistItems((current) => [...current, createDraftChecklistItem(item)]);
    setNewChecklistItem('');
  };

  const updateChecklistItem = (id: string, value: string) => {
    setChecklistItems((current) => current.map((item) => (item.id === id ? { ...item, text: value } : item)));
  };

  /** Removes a checklist item from the creation draft. */
  const removeChecklistItem = (id: string) => {
    setChecklistItems((current) => current.filter((item) => item.id !== id));
  };

  const applyPreset = (preset: typeof CHECKLIST_PRESETS[number]) => {
    setItemKind('checklist');
    setTitle(preset.title);
    setChecklistItems(preset.items.map(createDraftChecklistItem));
    setNewChecklistItem('');
  };

  const runChecklistAI = async () => {
    if (aiUsed) {
      showAlert('Use another token?', 'Are you sure you would like to use Enhance/Complete again?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => void enhanceChecklist() },
      ]);
      return;
    }
    await enhanceChecklist();
  };

  const enhanceChecklist = async () => {
    setItemKind('checklist');
    setAiLoading(true);
    try {
      const generated = await lifeNestService.generateChecklist(title, [...checklistItems.map((item) => item.text), newChecklistItem].filter((item) => item.trim()));
      setTitle(generated.title);
      setChecklistItems(generated.items.map(createDraftChecklistItem));
      setNewChecklistItem('');
      setAiUsed(true);
      if (generated.usage) {
        showTokenUsageToast(generated.usage.tokensUsed);
        setTokenBalance((current) => (current === null ? current : Math.max(current - generated.usage!.tokensUsed, 0)));
      }
    } catch (error) {
      console.error('Failed to generate checklist:', error);
      showAlert('Error', 'Could not enhance this checklist. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      showAlert('Error', `Please enter a title for the ${itemKind}`);
      return;
    }

    if (itemKind === 'checklist') {
      const trimmedItems = checklistItems.map((item) => item.text.trim()).filter(Boolean);
      if (trimmedItems.length === 0) {
        showAlert('Error', 'Please add at least one checklist item');
        return;
      }
      setLoading(true);
      try {
        await createTodo.mutateAsync({
          title: title.trim(),
          description: '',
          category_id: null,
          remind_me: false,
          type: 'Checklist',
          item_kind: 'checklist',
          due_date_time: dueDate?.toISOString(),
          checklist_items: trimmedItems,
        });
        showAlert('Success', 'Checklist created successfully!', [{ text: 'OK', onPress: () => router.back() }]);
      } catch (error) {
        console.error('Failed to create checklist:', error);
        showAlert('Error', 'Could not create this checklist. Please try again.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!dueDate) {
      showAlert('Error', 'Please select a due date');
      return;
    }

    if (!description.trim()) {
      showAlert('Error', 'Please enter a description for the task');
      return;
    }

    if (!unit.trim() && (selected === '123' || selected === '%' || selected === 'Â£$â‚¬')) {
      showAlert('Error', 'Please enter a unit for the task');
      return;
    }

    if ((selected === '123' || selected === 'Â£$â‚¬') && !/^\d+(\.\d+)?$/.test(description.trim())) {
      showAlert('Error', selected === 'Â£$â‚¬' ? 'Please enter a valid currency amount' : 'Please enter a valid numerical milestone');
      return;
    }

    if (selected === '%' && (!/^\d+(\.\d+)?$/.test(description.trim()) || Number(description) < 0 || Number(description) > 100)) {
      showAlert('Error', 'Please enter a percentage between 0 and 100');
      return;
    }

    if (!categoryId) {
      showAlert('Error', 'Please select a category');
      return;
    }
    setLoading(true);

    let premiumSpend: Awaited<ReturnType<typeof tokenUsageService.spend>> | null = null;
    try {
      if (premiumCategoryId !== null) {
        premiumSpend = await tokenUsageService.spend({ feature: 'premium_todo_category', operationId: createTokenOperationId('todo-category') });
      }
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

      await createTodo.mutateAsync(todoData);
      if (premiumSpend) {
        setTokenBalance(premiumSpend.balance);
        showTokenUsageToast(premiumSpend.tokens);
      }
      showAlert('Success', 'Task created successfully!', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (error) {
      if (premiumSpend) await tokenUsageService.refund(premiumSpend).catch(() => undefined);
      console.error('Failed to create task:', error);
      showAlert('Error', 'Could not create this task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDueDate(selectedDate);
    }
  };

  const clearDate = () => {
    setDueDate(null);
  };

  return (
    <KeyboardAvoidingView enabled={Platform.OS === 'ios'} style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContainer}>
        <ThemedView style={styles.content}>
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>{itemKind === 'checklist' ? 'Add Checklist' : 'Add New Task'}</ThemedText>
          </View>
          <View style={styles.form}>
            <TriOptionsButton analyticsId="todo_add_item_kind" options={['Task', 'Checklist']} containerStyle={styles.inputGroup} onSelect={(value) => setItemKind(value.toLowerCase() as ToDoItemKind)} selectedOption={itemKind === 'task' ? 'Task' : 'Checklist'} enabled={true} />
            {itemKind === 'checklist' ? (
              <>
                <View style={styles.presetButtons}>
                  {CHECKLIST_PRESETS.map((preset) => (
                    <Button analyticsId="app_todo_add_apply_preset" key={preset.title} title={preset.title} variant="secondary" size="small" onPress={() => applyPreset(preset)} style={styles.presetButton} />
                  ))}
                  <Button analyticsId="app_todo_add_run_checklist_ai" title={aiLoading ? 'Enhancing...' : 'ðŸªº Enhance/Complete'} variant="primary" size="small" onPress={runChecklistAI} loading={aiLoading} disabled={aiLoading || tokenBalance === null || tokenBalance <= 0} style={styles.presetButton} />
                </View>
                <View style={styles.inputGroup}>
                  <Input label="Title" required={true} labelStyle={styles.label} placeholder="Enter checklist title" value={title} onChangeText={setTitle} style={styles.input} />
                </View>
                <View style={styles.inputGroup}>
                  <ThemedText style={styles.label}>Due By</ThemedText>
                  <View style={styles.dateContainer}>
                    <Button analyticsId="app_todo_add_set_show_date_picker" title={dueDate ? formatDate(dueDate.toString()) : 'Select Due By'} variant="secondary" onPress={() => setShowDatePicker(true)} style={styles.dateButton} />
                    {dueDate && (<Button analyticsId="app_todo_add_clear_2" title="Clear" variant="danger" size="small" onPress={clearDate} style={styles.clearButton} />)}
                  </View>
                  {showDatePicker && (<DateTimePicker value={dueDate || new Date()} mode="date" display="default" onValueChange={handleDateChange} minimumDate={new Date()} />)}
                </View>
                <View style={styles.inputGroup}>
                  <Input label="Checklist item" labelStyle={styles.label} placeholder="Enter an item" value={newChecklistItem} onChangeText={setNewChecklistItem} style={styles.input} onSubmitEditing={handleAddChecklistItem} />
                  <Button analyticsId="app_todo_add_add_item" title="Add Item" variant="secondary" onPress={handleAddChecklistItem} disabled={!newChecklistItem.trim()} />
                </View>
                {checklistItems.map((item, index) => (
                  <View key={item.id} style={styles.checklistRow}>
                    <Input label={`Item ${index + 1}`} labelStyle={styles.label} placeholder="Checklist item" value={item.text} onChangeText={(value) => updateChecklistItem(item.id, value)} style={styles.input} />
                    <Button analyticsId="app_todo_add_remove_item" title="Remove" variant="danger" size="small" onPress={() => removeChecklistItem(item.id)} />
                  </View>
                ))}
              </>
            ) : (
              <>
                <View style={styles.inputGroup}>
                  <Input label="Title" required={true} labelStyle={styles.label} placeholder="Enter task title" value={title} onChangeText={setTitle} style={styles.input} keyboardType="default" autoCapitalize="none" autoCorrect={true} />
                </View>
                <ThemedText style={styles.label}>Measurement type</ThemedText>
                <TriOptionsButton analyticsId="todo_add_task_type" options={[...ToDoTypes]} containerStyle={styles.inputGroup} onSelect={handleMeasurementTypeChange} selectedOption={selected} enabled={true} />
                {selected === '123' ? (
                  <>
                    <View style={styles.inputGroup}><Input label="Milestone" required={true} labelStyle={styles.label} placeholder="Task milestone e.g. miles ran/jobs applied for" value={description} onChangeText={handleNumericMeasurementChange} keyboardType="decimal-pad" style={styles.input} /></View>
                    <View style={styles.inputGroup}><Input label="Unit" required={true} labelStyle={styles.label} placeholder="Enter unit" value={unit} onChangeText={setUnit} style={styles.input} /></View>
                  </>
                ) : selected === '%' ? (
                  <>
                    <View style={styles.inputGroup}><Input label="Percentage" required={true} labelStyle={styles.label} placeholder="Enter task percentage" value={description} onChangeText={handleNumericMeasurementChange} keyboardType="decimal-pad" style={styles.input} /></View>
                    <View style={styles.inputGroup}><Input label="Unit" required={true} labelStyle={styles.label} placeholder="Enter percentage unit" value={unit} onChangeText={setUnit} style={styles.input} /></View>
                  </>
                ) : selected === 'Â£$â‚¬' ? (
                  <>
                  <View style={styles.inputGroup}><Input label="Milestone" required={true} labelStyle={styles.label} placeholder="Task milestone e.g. Amount saved" value={description} onChangeText={handleNumericMeasurementChange} keyboardType="decimal-pad" style={styles.input} /></View>
                  <View style={styles.inputGroup}><Input label="Amount" required={true} labelStyle={styles.label} placeholder="Enter currency amount" value={description} onChangeText={handleNumericMeasurementChange} keyboardType="decimal-pad" style={styles.input} /></View>
               </>
               ) : selected === 'âœ“ / âœ•' || selected === 'Abc' ? (
                  <View style={styles.inputGroup}><Input label="Description" required={true} labelStyle={styles.label} placeholder="Enter task description" value={description} onChangeText={setDescription} multiline numberOfLines={3} style={[styles.input, styles.textArea]} /></View>
                ) : (
                <View style={styles.inputGroup}><Input label="Description" required={true} labelStyle={styles.label} placeholder="Enter task description" value={description} onChangeText={setDescription}  style={styles.input} /></View>
                )}
                <View style={styles.inputGroup}>
                  <ThemedText style={styles.label}>Category *</ThemedText>
                  {categoriesError ? <ThemedText style={styles.errorText}>Categories could not be loaded. Please try again.</ThemedText> : null}
                  {categoriesLoading ? <ThemedText style={styles.helperText}>Loading categories...</ThemedText> : null}
                  <View style={styles.categoryButtons}>{categories.map((category) => (<Button analyticsId="app_todo_add_set_category_id" key={category.id} title={category.name} variant={categoryId === category.id ? 'primary' : 'secondary'} size="small" onPress={() => setCategoryId(category.id)} style={styles.categoryButton} />))}</View>
                </View>
                <View style={styles.inputGroup}>
                  <ThemedText style={styles.label}>Premium Categories/Types</ThemedText>
                  <View style={styles.categoryButtons}>{premiumCategories.map((category) => (<Button analyticsId="app_todo_add_set_premium_category_id" key={category.id} title={category.name} variant={premiumCategoryId === category.id ? 'primary' : 'secondary'} size="small" onPress={() => setPremiumCategoryId((prev) => (prev === category.id ? null : category.id))} style={styles.categoryButton} />))}</View>
                </View>
                <View style={styles.inputGroup}>
                  <ThemedText style={styles.label}>Due Date</ThemedText>
                  <View style={styles.dateContainer}>
                    <Button analyticsId="app_todo_add_set_show_date_picker_2" title={dueDate ? formatDate(dueDate.toString()) : 'Select Due Date'} variant="secondary" onPress={() => setShowDatePicker(true)} style={styles.dateButton} />
                    {dueDate && (<Button analyticsId="app_todo_add_clear_2" title="Clear" variant="danger" size="small" onPress={clearDate} style={styles.clearButton} />)}
                  </View>
                  {showDatePicker && (<DateTimePicker value={dueDate || new Date()} mode="date" display="default" onValueChange={handleDateChange} minimumDate={new Date()} />)}
                </View>
                <View style={styles.inputGroup}><Switch label="Reminder" description="Enable reminders for this task" labelStyle={styles.label} value={remindMe} onValueChange={setRemindMe} /></View>
              </>
            )}
            <View style={styles.actions}>
              <Button analyticsId="app_todo_add_cancel" title="Cancel" variant="secondary" onPress={() => router.back()} style={styles.cancelButton} />
              <Button analyticsId="app_todo_add_handle_save" title={loading ? 'Creating...' : itemKind === 'checklist' ? 'Create Checklist' : 'Create Task'} onPress={handleSave} loading={loading} disabled={loading || (itemKind === 'task' && categoriesLoading) || !title.trim()} style={styles.saveButton} />
            </View>
          </View>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, width: '100%' },
  scrollView: { flex: 1 },
  scrollContainer: { flexGrow: 1, justifyContent: 'center' },
  content: { flex: 1, padding: 16, width: Platform.OS === 'web' ? '70%' : undefined, alignSelf: 'center'   },
  header: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 'bold' },
  form: { gap: 20 },
  inputGroup: { gap: 8 },
  label: { fontSize: 16, fontWeight: '600' },
  helperText: { fontSize: 13, opacity: 0.72 },
  errorText: { fontSize: 13, color: '#B4472F' },
  input: { minHeight: 44 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  categoryButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryButton: { minWidth: 100 },
  presetButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetButton: { minWidth: 140, flexGrow: 1 },
  checklistRow: { gap: 8 },
  dateContainer: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  dateButton: { flex: 1 },
  clearButton: { minWidth: 80 },
  actions: { flexDirection: 'row', gap: 12 },
  cancelButton: { flex: 1 },
  saveButton: { flex: 2 },
});
