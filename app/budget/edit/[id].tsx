import { TrackedTouchableOpacity as TouchableOpacity } from '@/components/ui/TrackedTouchableOpacity';
import React, { useEffect, useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@/components/ui/AppDatePicker';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Switch } from '@/components/ui/Switch';
import { useTransaction, useTransactions } from '@/hooks/useTransactions';
import { goBackOrReplace } from '@/services/navigationService';
import { TransactionType, UpdateTransactionRequest } from '@/types/transaction';
import { RecurrenceFrequency } from '@/types/recurringTransaction';
import { useThemeColour } from '@/hooks/useThemeColour';
import { formatDate, showAlert } from '@/hooks/dataHandler';
import { isCurrencyAmountInput, isValidCurrencyAmount } from '@/lib/currencyAmount';

/** Renders the edit transaction form and updates or deletes an existing transaction. */
export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const transactionId = parseInt(id || '0', 10);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedType, setSelectedType] = useState<'Income' | 'Expense'>('Income');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<RecurrenceFrequency>('monthly');
  const [isGeneratedOccurrence, setIsGeneratedOccurrence] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const { data: transaction, isLoading: transactionLoading } = useTransaction(transactionId);
  const { categories, categoriesLoading, categoriesError, fetchCategories, updateTransaction, deleteTransaction } = useTransactions();
  const backgroundColour = useThemeColour({}, 'background');
  const textColour = useThemeColour({}, 'text');

  /** Gets categories that match the currently selected transaction type. */
  const filteredCategories = useMemo(
    () => categories.filter(category => category.transaction_type === selectedType),
    [categories, selectedType]
  );

  /** Accepts currency amounts with up to two decimal places and nine significant digits. */
  const handleAmountChange = (value: string) => {
    if (isCurrencyAmountInput(value)) {
      setAmount(value);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (transaction) {
        setTitle(transaction.title);
        setDescription(transaction.description || '');
        setAmount(Math.abs(transaction.amount).toString());
        setSelectedType(transaction.type === TransactionType.Expense ? TransactionType.Expense : TransactionType.Income);
        setSelectedCategory(transaction.category_id || null);
        //setMonthNumber(transaction.month);
        setDueDate(transaction.due_date ? new Date(transaction.due_date) : null);
        setIsRecurring(Boolean(transaction.is_recurring));
        setRecurrenceFrequency(transaction.recurrence_frequency || 'monthly');
        setIsGeneratedOccurrence(Boolean(transaction.recurring_source_transaction_id || transaction.recurring_transaction_id));
    }
    if (!transactionLoading) setInitialLoading(false);
  }, [transaction, transactionLoading]);

  useEffect(() => {
    if (!transactionLoading && !transaction) {
      showAlert('Transaction not found', 'This transaction is no longer available.', [
        { text: 'OK', onPress: () => goBackOrReplace('/budget') },
      ]);
    }
  }, [transaction, transactionLoading]);

  useEffect(() => {
    if (selectedCategory && !filteredCategories.some(category => category.id === selectedCategory)) {
      setSelectedCategory(null);
    }
  }, [filteredCategories, selectedCategory]);

  /** Validates input and updates the current transaction row. */
  const handleSave = async () => {
    if (!title.trim() || !amount.trim() || !dueDate || !selectedCategory) {
      console.warn('Please fill in all required fields');
      showAlert('Validation Error', 'Please fill in all required fields.');
      return;
    }

    const numericAmount = parseFloat(amount);
    if (!isValidCurrencyAmount(amount)) {
      console.warn('Please enter a valid amount greater than 0 with no more than 9 significant digits');
      showAlert('Validation Error', 'Please enter a valid amount greater than 0, with no more than 9 significant digits.');
      return;
    }

    setLoading(true);
    try {
      const transactionData: UpdateTransactionRequest = {
        title: title.trim(),
        description: description.trim(),
        category_id: selectedCategory,
        amount: selectedType === 'Expense' ? -Math.abs(numericAmount) : Math.abs(numericAmount),
        type: selectedType,
        due_date: dueDate.toISOString(),
        is_recurring: isGeneratedOccurrence ? false : isRecurring,
        recurrence_frequency: !isGeneratedOccurrence && isRecurring ? recurrenceFrequency : null,
      };

      await updateTransaction({ id: Number(id), data: transactionData });
      goBackOrReplace('/budget');
    } catch (error) {
      console.error('Failed to update transaction:', error);
      showAlert('Unable to save', 'Could not update this transaction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /** Prompts and deletes the selected transaction row when confirmed. */
  const handleDelete = async () => {
    showAlert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTransaction(transactionId);
              goBackOrReplace('/budget');
            } catch (error) {
              console.error('Failed to delete transaction:', error);
              showAlert('Unable to delete', 'Could not delete this transaction. Please try again.');
            }
          },
        },
      ]
    );
  };

  /** Updates date input state from the native picker. */
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDueDate(selectedDate);
    }
  };

  if (initialLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <LoadingSpinner />
      </ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView enabled={Platform.OS === 'ios'} style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        <ThemedView style={styles.content} lightColour={backgroundColour} darkColour={backgroundColour}>
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              Edit {selectedType}
            </ThemedText>
          </View>
          <View style={styles.form}>
            {/* Type Selection */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Type *</ThemedText>
              <View style={styles.typeButtons}>
                <TouchableOpacity analyticsId="budget_edit_income_type" analyticsControlType="selector" style={[styles.typeButton, {backgroundColor: backgroundColour}, selectedType === 'Income' && styles.typeButtonActive, selectedType === 'Income' && { backgroundColor: '#22C55E' }
                  ]} onPress={() => setSelectedType('Income')} >
                  <ThemedText style={[styles.typeButtonText, {color: textColour}, selectedType === 'Income' && styles.typeButtonTextActive]}>
                    Income
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity analyticsId="budget_edit_expense_type" analyticsControlType="selector" style={[styles.typeButton, { backgroundColor: backgroundColour }, selectedType === 'Expense' && styles.typeButtonActive, selectedType === 'Expense' && { backgroundColor: '#EF4444' }]}
                  onPress={() => setSelectedType('Expense')}>
                  <ThemedText style={[ {color: textColour},
                    styles.typeButtonText,
                    selectedType === 'Expense' && styles.typeButtonTextActive
                  ]}>
                    Expense
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Category *</ThemedText>
              {categoriesError ? (
                <ThemedText style={styles.errorText}>Categories could not be loaded. Please try again.</ThemedText>
              ) : null}
              {categoriesLoading ? (
                <ThemedText style={styles.helperText}>Loading categories...</ThemedText>
              ) : null}
              <View style={styles.categoryButtons}>
                {filteredCategories.map((category) => (
                  <Button analyticsId="app_budget_edit_item_set_selected_category"
                    key={category.id}
                    title={category.name}
                    variant={selectedCategory === category.id ? 'primary' : 'secondary'}
                    size="small"
                    onPress={() => setSelectedCategory(category.id)}
                    style={styles.categoryButton}
                  />
                ))}
              </View>
            </View>

            {/* Title */}
            <View style={styles.inputGroup}>
              <Input placeholder={`Enter ${selectedType.toLowerCase()} title`} value={title} onChangeText={setTitle} label="Title" required={true} labelStyle={styles.label}
                style={styles.input} />
            </View>

            {/* Amount */}
            <View style={styles.inputGroup}>
              <Input
                placeholder="Enter amount" value={amount} onChangeText={handleAmountChange} keyboardType="decimal-pad" label="Amount" required={true} labelStyle={styles.label} style={styles.input} />
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Input placeholder="Optional description" value={description} onChangeText={setDescription} multiline numberOfLines={3} label="Description" labelStyle={styles.label}
                style={[styles.input, styles.textArea]} />
            </View>

            {/* Due Date */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Date</ThemedText>
              <Button analyticsId="app_budget_edit_item_date_button" title={dueDate ? formatDate(dueDate.toString()) : 'Select Date'} variant="secondary" onPress={() => setShowDatePicker(true)} style={styles.dateButton} textStyle={styles.dateButtonText} />
            </View>

            {!isGeneratedOccurrence ? (
              <View style={styles.inputGroup}>
                <Switch
                  label="Recurring"
                  description={isRecurring ? `Repeats ${recurrenceFrequency === 'monthly' ? 'each month on this date' : 'every week from this date'}.` : 'Create this as a one-off transaction.'}
                  value={isRecurring}
                  onValueChange={setIsRecurring}
                />
                {isRecurring ? (
                  <View style={styles.frequencyButtons}>
                    <Button analyticsId="app_budget_edit_recurring_monthly" title="Monthly" variant={recurrenceFrequency === 'monthly' ? 'primary' : 'secondary'} size="small" onPress={() => setRecurrenceFrequency('monthly')} style={styles.frequencyButton} />
                    <Button analyticsId="app_budget_edit_recurring_weekly" title="Weekly" variant={recurrenceFrequency === 'weekly' ? 'primary' : 'secondary'} size="small" onPress={() => setRecurrenceFrequency('weekly')} style={styles.frequencyButton} />
                  </View>
                ) : null}
              </View>
            ) : null}

          </View>
          <View style={styles.buttonContainer}>
            <Button analyticsId="app_budget_edit_item_cancel" title="Cancel" variant="secondary" onPress={() => goBackOrReplace('/budget')} style={styles.button} />
            <Button analyticsId="app_budget_edit_item_delete" title="Delete" variant="danger" onPress={handleDelete} style={styles.button} />
            <Button analyticsId="app_budget_edit_item_save_changes" title="Save Changes" variant="primary" onPress={handleSave} loading={loading} disabled={loading || !selectedCategory} style={styles.button} />
          </View>
        </ThemedView>
      </ScrollView>

      {showDatePicker && (
        <DateTimePicker value={dueDate || new Date()} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onValueChange={handleDateChange} />
      )}
    </KeyboardAvoidingView>
  );
}

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
    width: '100%',
    maxWidth: Platform.OS === 'web' ? '70%' : 1200,
    alignSelf: 'center',
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  closeText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  card: {
    marginBottom: 24,
    padding: 16,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 13,
    marginBottom: 8,
    opacity: 0.72,
  },
  errorText: {
    fontSize: 13,
    marginBottom: 8,
    color: '#B4472F',
  },
  input: {
    minHeight: 44,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    minWidth: 100,
  },
  frequencyButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  frequencyButton: {
    flex: 1,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DEE2E6',
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
  },
  typeButtonActive: {
    borderColor: 'transparent',
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
  },
  dateButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DEE2E6',
    backgroundColor: '#F8F9FA',
    minHeight: 44,
    justifyContent: 'center',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#000000',
  },
  clearDateButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  clearDateText: {
    fontSize: 14,
    color: '#EF4444',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 'auto',
    paddingTop: 16,
  },
  button: {
    flex: 1,
  },
});
