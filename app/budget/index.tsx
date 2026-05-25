import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useTransactionsByMonth } from '@/hooks/useTransactions';
import { Transaction } from '@/types/transaction';
import { GetCurrentMonth, GetCurrentYear } from '@/hooks/dataHandler';
import { useCurrentUser } from '@/hooks/useAuth';
import { useTransactionSettings } from '@/hooks/useSettings';
import { useThemeColour } from '@/hooks/useThemeColour';
import { transactionService } from '@/services/transactionService';
import { DEFAULT_CURRENCY_SYMBOL } from '@/constants/CurrencySymbols';

//Render the transactions page.
export default function BudgetMonthScreen() {
  const month = GetCurrentMonth();
  const year = GetCurrentYear();
  const user = useCurrentUser();
  const [refreshing, setRefreshing] = useState(false);
  const [monthTransactions, setMonthTransactions] = useState<Transaction[]>([]);
  const [incomeBarHeight, setIncomeBarHeight] = useState(0);
  const [expenseBarHeight, setExpenseBarHeight] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const { transactions, loading, fetchTransactions } = useTransactionsByMonth(month, year);
  const { data: transactionSettings } = useTransactionSettings();
  const preferredCurrency = transactionSettings?.preferred_currency || DEFAULT_CURRENCY_SYMBOL;
  const backgroundColour = useThemeColour({}, 'background');
  const textColour = useThemeColour({}, 'text');
  const summaryBackgroundColour = useThemeColour({ light: '#F3F4F6', dark: '#2C2C2E' }, 'cardBackground');

  //Refresh the transactions.
  const refreshBudgetData = useCallback(async () => {
    await fetchTransactions();
  }, [fetchTransactions]);

  //Handle Refresh.
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshBudgetData();
    } finally {
      setRefreshing(false);
    }
  }, [refreshBudgetData]);

  //Get the transactions and render the chart.
  useEffect(() => {
    if (transactions && user) {
      setMonthTransactions(transactions);
      calculateChartData(transactions);
    }
  }, [transactions, user]);

  //Gets Transaction information and calculates it so it can be shown in the chart.
  const calculateChartData = (transactions: Transaction[]) => {
    const income = transactions.filter(t => t.type === 'Income').reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const expenses = transactions.filter(t => t.type === 'Expense').reduce((sum, t) => sum + Math.abs(t.amount), 0);

    setTotalIncome(income);
    setTotalExpenses(expenses);
    const maxAmount = Math.max(income, expenses);

    //set minimum amounts.
    if (maxAmount === 0) {
      setIncomeBarHeight(5);
      setExpenseBarHeight(5);
    } else {
      //otherwise set it to the calculated percentage with a minimum of 10%.
      const minHeight = 10;
      setIncomeBarHeight(Math.max(minHeight, maxAmount === income ? 100 : (income / maxAmount) * 100) -2);
      setExpenseBarHeight(Math.max(minHeight, maxAmount === expenses ? 100 : (expenses / maxAmount) * 100)-2);
    }
  };

  const getMonthName = (monthNumber: number): string => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return months[monthNumber - 1] || 'Unknown';
  };

  //format currency based on user settings, which is determined by locale.
  const formatCurrency = (amount: number): string => {
    return transactionService.formatCurrency(amount, preferredCurrency);
  };

  //Handle the add transaction button press, takes the user to the add transaction page with the type, month and year as parameters.
  const addTransaction = (type: 'income' | 'expense') => {
    router.push(`/budget/add?type=${type}&month=${month}&year=${year}`);
  };

  //Shows the loading spinner while transactions are being fetched.
  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <LoadingSpinner />
      </ThemedView>
    );
  }

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <ThemedView style={styles.content} lightColour={backgroundColour} darkColour={backgroundColour}>
        <ThemedView style={styles.header} lightColour={backgroundColour} darkColour={backgroundColour}>
          <ThemedText type="title" style={styles.title}>
            {getMonthName(month)} Overview
          </ThemedText>

          <ThemedView style={styles.actionButtons} lightColour={backgroundColour} darkColour={backgroundColour}>
            <Button title="Add Income" variant="success" size="small" onPress={() => addTransaction('income')} style={styles.actionButton} />
            <Button title="Add Expense" variant="danger" size="small" onPress={() => addTransaction('expense')} style={styles.actionButton} />
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.chartCard} lightColour={backgroundColour} darkColour={backgroundColour}>
          <ThemedView style={styles.chartContainer} lightColour={backgroundColour} darkColour={backgroundColour}>
            <ThemedView style={[styles.yAxisText, { top: -5 }]} lightColour={backgroundColour} darkColour={backgroundColour}><ThemedText style={[styles.yAxisLabel, {color:textColour}]}>{totalIncome > totalExpenses ? formatCurrency(totalIncome) : formatCurrency(totalExpenses)}</ThemedText></ThemedView>
            <ThemedView style={[styles.yAxisText, { bottom: -5 }]} lightColour={backgroundColour} darkColour={backgroundColour}><ThemedText style={[styles.yAxisLabel, {color: textColour}]}>{formatCurrency(0)}</ThemedText></ThemedView>
            <ThemedView style={styles.chartArea}>
              <ThemedView style={styles.yAxis} />
              <ThemedView style={styles.xAxis} />
              <ThemedView style={[styles.bar, styles.incomeBar, { height: `${incomeBarHeight}%` }]}>
                <ThemedText style={styles.barValue}>
                  {formatCurrency(totalIncome)}
                </ThemedText>
                <ThemedText style={styles.barLabel}>Income</ThemedText>
              </ThemedView>

              <ThemedView style={[styles.bar, styles.expenseBar, { height: `${expenseBarHeight}%` }]}>
                <ThemedText style={styles.barValue}>
                  {formatCurrency(totalExpenses)}
                </ThemedText>
                <ThemedText style={styles.barLabel}>Expenses</ThemedText>
              </ThemedView>
            </ThemedView>
          </ThemedView>
        </ThemedView>

        <Card style={styles.breakdownCard}>
          <ThemedText type="subtitle" style={styles.breakdownTitle}>
            Budget Breakdown
          </ThemedText>
          <ThemedText style={styles.breakdownIntro}>
            Expense totals by category compared with this month&apos;s income.
          </ThemedText>

          <ThemedView style={styles.breakdownSummary}>
            <ThemedView style={[styles.breakdownSummaryItem, { backgroundColor: summaryBackgroundColour }]}>
              <ThemedText style={styles.breakdownSummaryLabel}>Income</ThemedText>
              <ThemedText style={[styles.breakdownSummaryValue, { color: '#22C55E' }]}>
                {formatCurrency(totalIncome)}
              </ThemedText>
            </ThemedView>
            <ThemedView style={[styles.breakdownSummaryItem, { backgroundColor: summaryBackgroundColour }]}>
              <ThemedText style={styles.breakdownSummaryLabel}>Expenses</ThemedText>
              <ThemedText style={[styles.breakdownSummaryValue, { color: '#EF4444' }]}>
                {formatCurrency(totalExpenses)}
              </ThemedText>
            </ThemedView>
          </ThemedView>
        </Card>

        {monthTransactions.length === 0 ? (
          <Card style={styles.emptyCard}>
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              No transactions for {getMonthName(month)}
            </ThemedText>
            <ThemedText style={styles.emptyText}>
              Add your first transaction to start tracking this month&lsquo;s finances.
            </ThemedText>
            <ThemedView style={styles.emptyActions}>
              <Button title="Add Income" variant="success" onPress={() => addTransaction('income')} style={styles.emptyButton} />
              <Button title="Add Expense" variant="danger" onPress={() => addTransaction('expense')} style={styles.emptyButton} />
            </ThemedView>
          </Card>
        ) : (
          /* Transaction List */
          <Card style={styles.transactionsCard}>
            <ThemedText type="subtitle" style={styles.transactionsTitle}>
              Transactions ({monthTransactions.length})
            </ThemedText>

            {monthTransactions.map((transaction) => (
              <TouchableOpacity key={transaction.id} style={styles.transactionItem} onPress={() => router.push(`/budget/edit/${transaction.id}`)}>
                <ThemedView style={styles.transactionContent}>
                  <ThemedView style={styles.transactionMain}>
                    <ThemedText type="defaultSemiBold" style={styles.transactionTitle}>
                      {transaction.title}
                    </ThemedText>
                    {transaction.description && (
                      <ThemedText style={styles.transactionDescription}>
                        {transaction.description}
                      </ThemedText>
                    )}
                  </ThemedView>

                  <ThemedView style={styles.transactionMeta}>
                    <ThemedText
                      style={[styles.transactionAmount, { color: transaction.type === 'Income' ? '#22C55E' : '#EF4444' }]}>
                      {transaction.type === 'Income' ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
                    </ThemedText>
                    {transaction.due_date && (
                      <ThemedText style={styles.transactionDate}>
                        {new Date(transaction.due_date).toLocaleDateString()}
                      </ThemedText>
                    )}
                  </ThemedView>
                </ThemedView>
              </TouchableOpacity>
            ))}
          </Card>
        )}
      </ThemedView>
    </ScrollView>
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
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
  },
  chartCard: {
    marginBottom: 16,
    padding: 5,
  },
  breakdownCard: {
    padding: 16,
  },
  breakdownTitle: {
    marginBottom: 6,
  },
  breakdownIntro: {
    opacity: 0.75,
    marginBottom: 12,
  },
  breakdownSummary: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  breakdownSummaryItem: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
  },
  breakdownSummaryLabel: {
    fontSize: 13,
    opacity: 0.7,
    marginBottom: 4,
  },
  breakdownSummaryValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  chartContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartArea: {
    width: '70%',
    height: '100%',
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
  },
  yAxis: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#E5E7EB',//change to dynamic based on theme
  },
  xAxis: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#E5E7EB',
  },
  bar: {
    width: 70,
    minHeight: 5,
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 4,
    borderRadius: 5,
  },
  incomeBar: {
    backgroundColor: '#22C55E',
  },
  expenseBar: {
    backgroundColor: '#EF4444',
  },
  barValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 2,
    textAlign: 'center',
  },
  barLabel: {
    fontSize: 12,
    fontWeight: '600',
    position: 'absolute',
    bottom: -22,
    textAlign: 'center',
  },
  yAxisText: {
    position: 'absolute',
    left: -15,
  },
  yAxisLabel: {
    fontSize: 12,
    color: '#101113',
    textAlign: 'right',
    width: 55,
  },
  transactionsCard: {
    padding: 16,
  },
  transactionsTitle: {
    fontSize: 18,
    marginBottom: 16,
  },
  transactionItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  transactionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionMain: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    marginBottom: 2,
  },
  transactionDescription: {
    fontSize: 14,
    opacity: 0.7,
  },
  transactionMeta: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    opacity: 0.7,
  },
  emptyCard: {
    padding: 15,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  emptyActions: {
    flexDirection: 'row',
    gap: 12,
  },
  emptyButton: {
    minWidth: 120,
  },
});
