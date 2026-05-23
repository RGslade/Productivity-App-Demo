import React, { useEffect, useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useTransactions } from '@/hooks/useTransactions';
import { TransactionType, UpdateTransactionRequest } from '@/types/transaction';
import { useThemeColour } from '@/hooks/useThemeColour';

//Render Edit Transaction screen.
export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const transactionId = parseInt(id || '0', 10);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedType, setSelectedType] = useState<'Income' | 'Expense'>('Income');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const { transactions, categories, fetchCategories, updateTransaction, deleteTransaction } = useTransactions();
  const backgroundColour = useThemeColour({}, 'background');
  const textColour = useThemeColour({}, 'text');

  // Filter categories based on selected type to only show relevant categories for income or expense.
  const filteredCategories = useMemo(
    () => categories.filter(category => category.transaction_type === selectedType),
    [categories, selectedType]
  );

  //call the fetch categories method on load to ensure we have the latest categories for the category selection.
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  //Get the existing transaction information based on the id route parameter.
  useEffect(() => {
    if (transactions && transactionId) {
      const transaction = transactions.find(t => t.id === transactionId);

      if (transaction) {
        setTitle(transaction.title);
        setDescription(transaction.description || '');
        setAmount(Math.abs(transaction.amount).toString());
        setSelectedType(transaction.type === TransactionType.Expense ? TransactionType.Expense : TransactionType.Income);
        setSelectedCategory(transaction.category_id || null);
        setDueDate(transaction.due_date ? new Date(transaction.due_date) : null);
      }
      setInitialLoading(false);
    }
  }, [transactions, transactionId]);

  //Remove the category selected if no longer valid.
  useEffect(() => {
    if (selectedCategory && !filteredCategories.some(category => category.id === selectedCategory)) {
      setSelectedCategory(null);
    }
  }, [filteredCategories, selectedCategory]);

  //Handle the transaction update
  const handleSave = async () => {
    if (!title.trim() || !amount.trim() || !dueDate || !selectedCategory) {
      console.warn('Please fill in all required fields');
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      console.warn('Please enter a valid amount greater than 0');
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
      };

      await updateTransaction({ id: Number(id), data: transactionData });
      router.back();
    } catch (error) {
      console.error('Failed to update transaction:', error);
    } finally {
      setLoading(false);
    }
  };

  //Prompts and deletes the selected transaction row when confirmed. Takes the user to the previous screen after.
  const handleDelete = async () => {
    Alert.alert('Delete Transaction', 'Are you sure you want to delete this transaction? This action cannot be undone.',
      [{ text: 'Cancel', style: 'cancel' }, {text: 'Delete', style: 'destructive', onPress: async () => {
            try {
              await deleteTransaction(transactionId);
              router.back();
            } catch (error) {
              console.error('Failed to delete transaction:', error);
            }
          },
        },
      ]
    );
  };

  //Handle the transaction date change and ensure the date is valid.
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDueDate(selectedDate);
    }
  };

  //Show the loading spiinner while in loading state.
  if (initialLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <LoadingSpinner />
      </ThemedView>
    );
  }

  //Show the form.
  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.scrollView}>
        <ThemedView style={styles.content} lightColour={backgroundColour} darkColour={backgroundColour}>
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              Edit {selectedType}
            </ThemedText>
          </View>
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Type *</ThemedText>
              <View style={styles.typeButtons}>
                <TouchableOpacity style={[styles.typeButton, selectedType === 'Income' && styles.typeButtonActive, selectedType === 'Income' && { backgroundColor: '#22C55E' }
                  ]} onPress={() => setSelectedType('Income')} >
                  <ThemedText style={[styles.typeButtonText, {color: textColour}, selectedType === 'Income' && styles.typeButtonTextActive]}>
                    Income
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.typeButton, selectedType === 'Expense' && styles.typeButtonActive, selectedType === 'Expense' && { backgroundColor: '#EF4444' }]}
                  onPress={() => setSelectedType('Expense')}>
                  <ThemedText style={[ {color: textColour}, styles.typeButtonText, selectedType === 'Expense' && styles.typeButtonTextActive]}>
                    Expense
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Category *</ThemedText>
              <View style={styles.categoryButtons}>
                {filteredCategories.map((category) => (
                  <Button key={category.id} title={category.name} 
                    variant={selectedCategory === category.id ? 'primary' : 'secondary'} size="small"
                    onPress={() => setSelectedCategory(category.id)} style={styles.categoryButton} />
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
                value={amount} onChangeText={setAmount} keyboardType="numeric" label="Amount" required={true} labelStyle={styles.label} style={styles.input} />
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Input placeholder="Optional description" value={description} onChangeText={setDescription} multiline numberOfLines={3} label="Description" labelStyle={styles.label}
                style={[styles.input, styles.textArea]} />
            </View>

            {/* Due Date */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Due Date</ThemedText>
              <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
                <ThemedText style={styles.dateButtonText}>
                  {dueDate?.toLocaleDateString('en-GB') ?? 'Select date'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.buttonContainer}>
            <Button title="Cancel" variant="secondary" onPress={() => router.back()} style={styles.button} />
            <Button title="Delete" variant="danger" onPress={handleDelete} style={styles.button} />
            <Button title="Save Changes" variant="primary" onPress={handleSave} loading={loading} disabled={loading || !selectedCategory} style={styles.button} />
          </View>
        </ThemedView>
      </ScrollView>

      {showDatePicker && (
        <DateTimePicker value={dueDate || new Date()} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={handleDateChange} />
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
