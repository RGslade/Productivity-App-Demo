import { TrackedTouchableOpacity as TouchableOpacity } from '@/components/ui/TrackedTouchableOpacity';
import React, { useEffect, useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@/components/ui/AppDatePicker';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { useCreateTransaction, useTransactionCategories } from '@/hooks/useTransactions';
import { CreateTransactionRequest, TransactionType } from '@/types/transaction';
import { RecurrenceFrequency } from '@/types/recurringTransaction';
import { useThemeColour } from '@/hooks/useThemeColour';
import { formatDate, showAlert } from '@/hooks/dataHandler';
import { isCurrencyAmountInput, isValidCurrencyAmount } from '@/lib/currencyAmount';

/** Renders the add transaction form and saves a new transaction entry. */
export default function AddTransactionScreen() {
  const { type } = useLocalSearchParams<{ type?: string; month?: string; year?: string; }>();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedType, setSelectedType] = useState<TransactionType>(type === 'expense' ? TransactionType.Expense : TransactionType.Income);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  // const [monthNumber] = useState(month ? parseInt(month, 10) : new Date().getMonth() + 1);
  const [dueDate, setDueDate] = useState<Date>(new Date);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<RecurrenceFrequency>('monthly');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const createTransactionMutation = useCreateTransaction();
  const { data: categories = [], error: categoriesError, isLoading: categoriesLoading } = useTransactionCategories();
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
    if (selectedCategory && !filteredCategories.some(category => category.id === selectedCategory)) {
      setSelectedCategory(null);
    }
  }, [filteredCategories, selectedCategory]);

  /** Validates input and saves a new transaction row. */
  const handleSave = async () => {
    if (!title.trim() || !amount.trim() || !dueDate || !selectedCategory) {
      showAlert('Validation Error', 'Please fill in all required fields.');
      console.warn('Please fill in all required fields');
      return;
    }

    const numericAmount = parseFloat(amount);
    if (!isValidCurrencyAmount(amount)) {
      showAlert('Validation Error', 'Please enter a valid amount greater than 0, with no more than 9 significant digits.');
      console.warn('Please enter a valid amount greater than 0');
      return;
    }

    setLoading(true);
    try {
      const transactionData: CreateTransactionRequest = {
        title: title.trim(),
        description: description.trim(),
        category_id: selectedCategory,
        amount: selectedType === 'Expense' ? -Math.abs(numericAmount) : Math.abs(numericAmount),
        type: selectedType,
        due_date: dueDate.toISOString(),
        is_recurring: isRecurring,
        recurrence_frequency: isRecurring ? recurrenceFrequency : null,
      };
      await createTransactionMutation.mutateAsync(transactionData);
      showAlert('Success', 'Transaction created successfully.');
      router.back();
    } catch (error) {
      showAlert('Error', 'Failed to create transaction. Please try again.');
      console.error('Failed to create transaction:', error);
    } finally {
      setLoading(false);
    }
  };

  /** Updates date input state from the native picker. */
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDueDate(selectedDate);
    }
  };

  return (
    <KeyboardAvoidingView enabled={Platform.OS === 'ios'} style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.content} lightColour={backgroundColour} darkColour={backgroundColour}>
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              Add {selectedType}
            </ThemedText>
          </View>
          <View style={styles.form}>
            {/* Type Selection */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Type *</ThemedText>
              <View style={styles.typeButtons}>
                <TouchableOpacity analyticsId="budget_add_income_type" analyticsControlType="selector" style={[styles.typeButton, {backgroundColor: backgroundColour}, selectedType === TransactionType.Income && styles.typeButtonActive, selectedType === TransactionType.Income && { backgroundColor: '#22C55E' }]}
                  onPress={() => setSelectedType(TransactionType.Income)}>
                  <ThemedText style={[styles.typeButtonText, {color: textColour}, selectedType === TransactionType.Income && styles.typeButtonTextActive]}>
                    Income
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity analyticsId="budget_add_expense_type" analyticsControlType="selector"
                  style={[styles.typeButton, {backgroundColor: backgroundColour}, selectedType === TransactionType.Expense && styles.typeButtonActive, selectedType === TransactionType.Expense && { backgroundColor: '#EF4444' }]}
                  onPress={() => setSelectedType(TransactionType.Expense)}>
                  <ThemedText style={[styles.typeButtonText, {color: textColour}, selectedType === TransactionType.Expense && styles.typeButtonTextActive]}>
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
                  <Button analyticsId="app_budget_add_set_selected_category"
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
              <Input key="title-input" placeholder={`Enter ${selectedType.toLowerCase()} title`} value={title} onChangeText={setTitle} label="Title" required={true} labelStyle={styles.label}
                style={styles.input} />
            </View>

            {/* Amount */}
            <View style={styles.inputGroup}>
              <Input key="amount-input" placeholder="Enter amount" value={amount} onChangeText={handleAmountChange} keyboardType="decimal-pad" label="Amount" required={true} labelStyle={styles.label}
                style={styles.input} />
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Input key="description-input" placeholder="Optional description" value={description} onChangeText={setDescription} multiline numberOfLines={3} label="Description"
                labelStyle={styles.label} style={[styles.input, styles.textArea]} />
            </View>

            {/* Due Date */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Date</ThemedText>
              <Button analyticsId="app_budget_add_set_show_date_picker" title={dueDate ? formatDate(dueDate.toString()) : 'Select Date'} variant="secondary" onPress={() => setShowDatePicker(true)} style={styles.dateButton} textStyle={styles.dateButtonText} />
            </View>

            <View style={styles.inputGroup}>
              <Switch
                label="Recurring"
                description={isRecurring ? `Repeats ${recurrenceFrequency === 'monthly' ? 'each month on this date' : 'every week from this date'}.` : 'Create this as a one-off transaction.'}
                value={isRecurring}
                onValueChange={setIsRecurring}
              />
              {isRecurring ? (
                <View style={styles.frequencyButtons}>
                  <Button
                    analyticsId="app_budget_add_recurring_monthly"
                    title="Monthly"
                    variant={recurrenceFrequency === 'monthly' ? 'primary' : 'secondary'}
                    size="small"
                    onPress={() => setRecurrenceFrequency('monthly')}
                    style={styles.frequencyButton}
                  />
                  <Button
                    analyticsId="app_budget_add_recurring_weekly"
                    title="Weekly"
                    variant={recurrenceFrequency === 'weekly' ? 'primary' : 'secondary'}
                    size="small"
                    onPress={() => setRecurrenceFrequency('weekly')}
                    style={styles.frequencyButton}
                  />
                </View>
              ) : null}
            </View>
          </View>
          <View style={styles.buttonContainer}>
            <Button analyticsId="app_budget_add_cancel" title="Cancel" variant="secondary" onPress={() => router.back()} style={styles.cancelButton}/>
            <Button analyticsId="app_budget_add_handle_save" title={`Add ${selectedType}`} variant="primary" onPress={handleSave} loading={loading} disabled={loading || categoriesLoading || !selectedCategory} style={styles.saveButton}/>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    width: '100%',
    maxWidth: Platform.OS === 'web' ? '70%' : 1200,
    alignSelf: 'center',
    flexGrow: 1,
    paddingBottom: 20,
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
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 'auto',
    paddingTop: 16,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
});
