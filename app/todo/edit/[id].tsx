import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useTodos } from '@/hooks/useTodos';
import { useAuth } from '@/hooks/useAuth';
import { ChecklistItem, ToDoItemKind, ToDoTypes, UpdateToDoRequest } from '@/types/todo';
import { TriOptionsButton } from '@/components/ui/TriOptionsButton';
import { Switch } from '@/components/ui';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatDate } from '@/hooks/dataHandler';

//
export default function EditTodoScreen() {
  //
  const { id } = useLocalSearchParams();
  //
  const todoId = parseInt(id as string);
  //
  const [title, setTitle] = useState('');
  //
  const [description, setDescription] = useState('');
  //
  const [categoryId, setCategoryId] = useState<number | null>(null);
  //
  const [premiumCategoryId, setPremiumCategoryId] = useState<number | null>(null);
  //
  const [dueDate, setDueDate] = useState<Date | null>(null);
  //
  const [isComplete, setIsComplete] = useState(false);
  //
  const [showDatePicker, setShowDatePicker] = useState(false);
  //
  const [loading, setLoading] = useState(false);
  //
  const [initialLoading, setInitialLoading] = useState(true);
  //
  const { categories, premiumCategories, todos, updateTodo, fetchCategories, fetchTodos } = useTodos();
  //
  const { userInfo } = useAuth();
  //
  const [unit, setUnit] = useState('');
  //
  const [remindMe, setRemindMe] = useState(false);
  //
  const [selected, setSelected] = useState('Numerical');
  //
  const [progress, setProgress] = useState('0');
  //
  const [itemKind, setItemKind] = useState<ToDoItemKind>('task');
  //
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);

  //
  const loadData = useCallback(async () => {
    //
    try {
      await fetchCategories();
      await fetchTodos();

      // Find the todo to edit
      //
      const todo = todos?.find(t => t.id === todoId);
      //
      if (todo) {
        setTitle(todo.title);
        setDescription(todo.description);
        setCategoryId(todo.category_id);
        setPremiumCategoryId(todo.premium_category_id ?? null);
        setDueDate(todo['due_date_&_time'] ? new Date(todo['due_date_&_time']) : null);
        setIsComplete(todo.is_complete);
        setUnit(todo.unit || '');
        setRemindMe(todo.remind_me);
        setProgress(todo.progress.toString())
        setSelected(todo.type)
        setItemKind(todo.item_kind === 'checklist' ? 'checklist' : 'task');
        setChecklistItems(todo.checklist_items || []);
      } else {
        Alert.alert('Error', 'Task not found', [{ text: 'OK', onPress: () => router.back() }]);
      }
    } catch (error) {
      console.error('Failed to load task data:', error);
    } finally {
      setInitialLoading(false);
    }
  }, [fetchCategories, fetchTodos, todos, todoId]);

  //
  useEffect(() => {
    if(!title) loadData();
  }, [loadData, title]);

  //
  const handleSave = async () => {
    //
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for the task');
      return;
    }

    //
    if (itemKind === 'task') {
      //
      if (!unit) {
        Alert.alert('Error', 'Please select a unit');
        return;
      }

      //
      if (Number.isNaN(Number.parseFloat(progress))) {
        Alert.alert('Error', 'Please enter a valid number')
        return;
      }

      //
      if (!description.trim()) {
        Alert.alert('Error', 'Please enter a description for the task');
        return;
      }

      //
      if (!categoryId) {
        Alert.alert('Error', 'Please select a category');
        return;
      }
    }

    setLoading(true);
    //
    try {
      //
      const todoData: UpdateToDoRequest = itemKind === 'checklist'
        ? {
          title: title.trim(),
          description: '',
          is_complete: checklistItems.length > 0 && checklistItems.every((item) => item.is_complete),
          due_date_time: dueDate?.toISOString(),
          checklist_items: checklistItems.map((item) => ({ id: item.id, is_complete: item.is_complete })),
        }
        : {
          title: title.trim(),
          description: description.trim(),
          category_id: categoryId,
          due_date_time: dueDate?.toISOString(),
          is_complete: isComplete,
          unit: unit?.trim() || undefined,
          remind_me: remindMe,
          progress: Number.parseFloat(progress),
          premium_category_id: premiumCategoryId,
        };

      await updateTodo({ id: todoId, data: todoData });
      Alert.alert('Success', 'Task updated successfully!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Failed to update task:', error);
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
  if (initialLoading) {
    //
    return (
      <ThemedView style={styles.loadingContainer}>
        <LoadingSpinner />
      </ThemedView>
    );
  }

  //
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.scrollView}>
        <ThemedView style={styles.content}>
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              {itemKind === 'checklist' ? 'Edit Checklist' : 'Edit Task'}
            </ThemedText>
          </View>
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Input placeholder="Enter task title" label='Title' required={true} labelStyle={styles.label} value={title} onChangeText={setTitle} style={styles.input} />
            </View>
            {itemKind === 'checklist' ? (
              <>
                <View style={styles.inputGroup}>
                  <ThemedText style={styles.label}>Due By</ThemedText>
                  <View style={styles.dateContainer}>
                    <Button title={dueDate ? formatDate(dueDate.toString()) : 'Select Due By'} variant="secondary" onPress={() => setShowDatePicker(true)} style={styles.dateButton} />
                    {dueDate && (
                      <Button title="Clear" variant="danger" size="small" onPress={clearDate} style={styles.clearButton} />
                    )}
                  </View>
                  {showDatePicker && (
                    <DateTimePicker value={dueDate || new Date()} mode="date" display="default" onChange={handleDateChange} minimumDate={new Date()} />
                  )}
                </View>
                <View style={styles.inputGroup}>
                  <ThemedText style={styles.label}>Checklist Items</ThemedText>
                  {checklistItems.map((item) => (
                    <Switch
                      key={item.id}
                      label={item.text}
                      labelStyle={styles.checklistLabel}
                      value={item.is_complete}
                      onValueChange={(value) => setChecklistItems((current) => current.map((currentItem) => currentItem.id === item.id ? { ...currentItem, is_complete: value } : currentItem))}
                    />
                  ))}
                </View>
              </>
            ) : (
              <>
                <TriOptionsButton options={ToDoTypes} containerStyle={styles.inputGroup} onSelect={setSelected} selectedOption={selected} enabled={false} />
                {selected === 'Numerical' ? (
                  <>
                    <View style={styles.inputGroup}>
                      <Input label='Milestone' required={true} labelStyle={styles.label} placeholder="Enter task milestone" keyboardType={'number-pad'} value={description} onChangeText={setDescription} style={[styles.input]} />
                    </View>
                    <View style={styles.inputGroup}>
                      <Input label='Unit' required={true} labelStyle={styles.label} placeholder="Enter milestone unit" value={unit} onChangeText={setUnit} style={styles.input} />
                    </View>
                    <View style={styles.inputGroup}>
                      <Input label='Progress' labelStyle={styles.label} placeholder='Enter the progress made so far' keyboardType={'number-pad'} style={styles.input} value={progress} onChangeText={setProgress} />
                      <ThemedText style={{fontSize: 12, color: '#6b7280'}}>Enter the progress made so far</ThemedText>
                    </View>
                  </>
                ) : (selected === 'Percentage') ? (
                  <>
                    <View style={styles.inputGroup}>
                      <Input label='Percentage' required={true} labelStyle={styles.label} placeholder="Enter task percentage" value={description} onChangeText={setDescription} keyboardType={'decimal-pad'} style={styles.input} />
                    </View>
                    <View style={styles.inputGroup}>
                      <Input label='Unit' required={true} labelStyle={styles.label} placeholder="Enter percentage unit" value={unit} onChangeText={setUnit} style={styles.input} />
                    </View>
                    <View style={styles.inputGroup}>
                      <Input label='Progress' labelStyle={styles.label} placeholder='Enter the progress made so far' keyboardType={'number-pad'} style={styles.input} value={progress} onChangeText={setProgress} />
                    </View>
                  </>
                ) : (selected === 'Yes/No | True/False') ? (
                  <View style={styles.inputGroup}>
                    <Input label='Description' required={true} labelStyle={styles.label} placeholder="Enter task description" value={description} onChangeText={setDescription} style={styles.input} />
                  </View>
                ) : (
                  <View style={styles.inputGroup}>
                    <Input label='Description' required={true} labelStyle={styles.label} placeholder="Enter task description" value={description} onChangeText={setDescription} multiline numberOfLines={3} style={[styles.input, styles.textArea]} />
                  </View>
                )}
                <View style={styles.inputGroup}>
                  <ThemedText style={styles.label}>Category *</ThemedText>
                  <View style={styles.categoryButtons}>
                    {categories?.map((category) => (
                      <Button key={category.id} title={category.name} variant={categoryId === category.id ? 'primary' : 'secondary'} size="small" onPress={() => setCategoryId(category.id)} style={styles.categoryButton} />
                    ))}
                  </View>
                </View>
                <View style={styles.inputGroup}>
                  <ThemedText style={styles.label}>Premium Categories/Types</ThemedText>
                  <View style={styles.categoryButtons}>
                    {premiumCategories?.map((category) => (
                      <Button
                        key={category.id}
                        title={category.name}
                        variant={premiumCategoryId === category.id ? 'primary' : 'secondary'}
                        size="small"
                        disabled={!userInfo?.is_premium_user}
                        onPress={() => setPremiumCategoryId(prev => prev === category.id ? null : category.id)}
                        style={styles.categoryButton}
                      />
                    ))}
                  </View>
                </View>
                <View style={styles.inputGroup}>
                  <ThemedText style={styles.label}>Due Date</ThemedText>
                  <View style={styles.dateContainer}>
                    <Button title={dueDate ? formatDate(dueDate.toString()) : 'Select Due Date'} variant="secondary" onPress={() => setShowDatePicker(true)} style={styles.dateButton} />
                    {dueDate && (
                      <Button title="Clear" variant="danger" size="small" onPress={clearDate} style={styles.clearButton} />
                    )}
                  </View>
                  {showDatePicker && (
                    <DateTimePicker value={dueDate || new Date()} mode="date" display="default" onChange={handleDateChange} minimumDate={new Date()} />
                  )}
                </View>
                <View style={styles.inputGroup}>
                  <Switch label="Remind Me" description="Enable reminders for this task" value={remindMe} onValueChange={setRemindMe} />
                </View>
                {selected !== 'Yes/No | True/False' && selected !== 'Text/non-quantifiable' && (
                  <ProgressBar percentage={(Number(progress) / Number(description)) * 100} />
                )}
                <View style={styles.inputGroup}>
                  <View style={styles.statusRow}>
                    <ThemedText style={styles.label}>Task Status</ThemedText>
                    <Button title={isComplete ? 'Completed' : 'Pending'} variant={isComplete ? 'success' : 'warning'} size="small" onPress={() => setIsComplete(!isComplete)} style={styles.statusButton} />
                  </View>
                </View>
              </>
            )}
            <View style={styles.actions}>
              <Button title="Cancel" variant="secondary" onPress={() => router.back()} style={styles.cancelButton} />
              <Button title={loading ? "Updating..." : itemKind === 'checklist' ? "Update Checklist" : "Update Task"} onPress={handleSave} loading={loading} disabled={loading || !title.trim() || (itemKind === 'task' && !categoryId)} style={styles.saveButton} />
            </View>
          </View>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

//
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    minHeight: 44,
  },
  checklistLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  categoryButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    minWidth: 100,
  },
  dateContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dateButton: {
    flex: 1,
  },
  clearButton: {
    minWidth: 80,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusButton: {
    minWidth: 120,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 2,
  },
});
