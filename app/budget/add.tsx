import React, { useEffect, useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useTransactions } from '@/hooks/useTransactions';
import { CreateTransactionRequest, TransactionType } from '@/types/transaction';
import { useThemeColour } from '@/hooks/useThemeColour';
import { formatDate } from '@/hooks/dataHandler';

//Render the add transactions screen.
export default function AddTransactionScreen() {
  const { type } = useLocalSearchParams<{ type?: string; month?: string; year?: string; }>();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedType, setSelectedType] = useState<TransactionType>(type === 'expense' ? TransactionType.Expense : TransactionType.Income);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState<Date>(new Date);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const { createTransaction, categories, fetchCategories } = useTransactions();
  const backgroundColour = useThemeColour({}, 'background');
  const textColour = useThemeColour({}, 'text');
  const filteredCategories = useMemo(
    () => categories.filter(category => category.transaction_type === selectedType),
    [categories, selectedType]
  );

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (selectedCategory && !filteredCategories.some(category => category.id === selectedCategory)) {
      setSelectedCategory(null);
    }
  }, [filteredCategories, selectedCategory]);

  //Handle the transaction addition.
  const handleSave = async () => {
    if (!title.trim() || !amount.trim() || !dueDate || !selectedCategory) {
      Alert.alert('Validation Error', 'Please fill in all required fields.');
      console.warn('Please fill in all required fields');
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid amount greater than 0.');
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
      };

      //Calls the hook method with the payload.
      await createTransaction(transactionData);
      Alert.alert('Success', 'Transaction created successfully.');
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to create transaction. Please try again.');
      console.error('Failed to create transaction:', error);
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

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
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
                <TouchableOpacity style={[styles.typeButton, {backgroundColor: backgroundColour}, selectedType === TransactionType.Income && styles.typeButtonActive, selectedType === TransactionType.Income && { backgroundColor: '#22C55E' }]}
                  onPress={() => setSelectedType(TransactionType.Income)}>
                  <ThemedText style={[styles.typeButtonText, {color: textColour}, selectedType === TransactionType.Income && styles.typeButtonTextActive]}>
                    Income
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
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
              <View style={styles.categoryButtons}>
                {filteredCategories.map((category) => (
                  <Button key={category.id} title={category.name}
                    variant={selectedCategory === category.id ? 'primary' : 'secondary'} size="small"
                    onPress={() => setSelectedCategory(category.id)} style={styles.categoryButton}/>
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
              <Input key="amount-input" placeholder="Enter amount" value={amount} onChangeText={setAmount} keyboardType="numeric" label="Amount" required={true} labelStyle={styles.label}
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
              <Button title={dueDate ? formatDate(dueDate.toString()) : 'Select Date'} variant="secondary" onPress={() => setShowDatePicker(true)} style={styles.dateButton} textStyle={styles.dateButtonText} />
            </View>
          </View>
          <View style={styles.buttonContainer}>
            <Button title="Cancel" variant="secondary" onPress={() => router.back()} style={styles.cancelButton}/>
            <Button title={`Add ${selectedType}`} variant="primary" onPress={handleSave} loading={loading} disabled={loading || !selectedCategory} style={styles.saveButton}/>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
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
    // borderColor: '#DEE2E6',
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