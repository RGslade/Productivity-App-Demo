import { TrackedTouchableOpacity as TouchableOpacity } from '@/components/ui/TrackedTouchableOpacity';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Card } from '@/components/ui/Card';
import { Eyebrow, HeroCard, ListRow, SectionHeading, useHeroSurface } from '@/components/ui/Surfaces';
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
import { recurringTransactionService } from '@/services/recurringTransactionService';

/** Shows the current month budget overview and transactions list. */
export default function BudgetMonthScreen() {
  const month = GetCurrentMonth();
  const year = GetCurrentYear();
  const user = useCurrentUser();
  const [refreshing, setRefreshing] = useState(false);
  const [monthTransactions, setMonthTransactions] = useState<Transaction[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [categoryNames, setCategoryNames] = useState<Record<string, string>>({});
  const { transactions, loading, fetchTransactions } = useTransactionsByMonth(month, year);
  const { data: transactionSettings } = useTransactionSettings();
  const preferredCurrency = transactionSettings?.preferred_currency || DEFAULT_CURRENCY_SYMBOL;
  const backgroundColour = useThemeColour({}, 'background');
  // const borderColour = useThemeColour({ light: 'rgba(30, 28, 25, 0.10)', dark: 'rgba(247, 244, 236, 0.14)' }, 'border');
  const summaryBackgroundColour = useThemeColour({ light: 'rgba(30, 28, 25, 0.05)', dark: '#24211D' }, 'cardBackground');
  const heroSurface = useHeroSurface();
  const successColour = useThemeColour({}, 'success');
  const dangerColour = useThemeColour({}, 'danger');
  // const categoryBreakdown = monthTransactions.filter(transaction => transaction.type === 'Expense').reduce<Promise<Record<string, number>>>(async (accumulator, transaction) => {
  //     const categoryName = await transactionService.getTransactionCategory(transaction.category_id) || 'Uncategorized';
  //     accumulator[categoryName.name] = (accumulator[categoryName.] || 0) + Math.abs(transaction.amount);
  //     return accumulator;
  //   }, {});
  // const sortedCategoryBreakdown = Object.entries(categoryBreakdown).sort(([, amountA], [, amountB]) => amountB - amountA);

  /** Category id to name, so the breakdown can be labelled. */
  useEffect(() => {
    let cancelled = false;

    void recurringTransactionService.generateDueTransactions()
      .then((generated) => {
        if (!cancelled && generated > 0) {
          void fetchTransactions();
        }
      })
      .catch((error) => console.error('BudgetMonthScreen.recurringCatchUp', error));

    return () => {
      cancelled = true;
    };
  }, [fetchTransactions]);

  useEffect(() => {
    let cancelled = false;
    transactionService.getTransactionCategories()
      .then((categories) => {
        if (cancelled) return;
        const map: Record<string, string> = {};
        categories.forEach((category: { id: number; name: string }) => {
          map[String(category.id)] = category.name;
        });
        setCategoryNames(map);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  /** Refreshes monthly transactions data from the source. */
  const refreshBudgetData = useCallback(async () => {
    await fetchTransactions();
  }, [fetchTransactions]);

  useFocusEffect(
    useCallback(() => {
      void refreshBudgetData();
    }, [refreshBudgetData])
  );

  /** Handles pull-to-refresh for the transactions overview. */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshBudgetData();
    } finally {
      setRefreshing(false);
    }
  }, [refreshBudgetData]);

  useEffect(() => {
    if (transactions && user) {
      setMonthTransactions(transactions);
      calculateChartData(transactions);
    }
  }, [transactions, user]);

  /** Recalculates summary totals and bar heights for chart display. */
  const calculateChartData = (transactions: Transaction[]) => {
    const income = transactions
      .filter(t => t.type === 'Income')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const expenses = transactions
      .filter(t => t.type === 'Expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    setTotalIncome(income);
    setTotalExpenses(expenses);

  };

  /** Expense totals per category, largest first, scaled for the bars. */
  const categoryBreakdown = useMemo(() => {
    const totals = new Map<string, number>();
    monthTransactions
      .filter((transaction) => transaction.type === 'Expense')
      .forEach((transaction) => {
        const name = categoryNames[String(transaction.category_id)] || 'Uncategorised';
        totals.set(name, (totals.get(name) ?? 0) + Math.abs(transaction.amount));
      });

    const max = Math.max(...totals.values(), 1);
    return [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, amount]) => ({ name, amount, share: Math.round((amount / max) * 100) }));
  }, [categoryNames, monthTransactions]);

  const getMonthName = (monthNumber: number): string => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return months[monthNumber - 1] || 'Unknown';
  };

  const formatCurrency = (amount: number): string => {
    return transactionService.formatCurrency(amount, preferredCurrency);
  };

  const addTransaction = (type: 'income' | 'expense') => {
    router.push(`/budget/add?type=${type}&month=${month}&year=${year}`);
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <LoadingSpinner />
      </ThemedView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <HeroCard style={styles.hero}>
        <Eyebrow tone="hero">{getMonthName(month)}</Eyebrow>
        <ThemedText type="display" style={[styles.heroBalance, { color: heroSurface.text }]}>
          {formatCurrency(totalIncome - totalExpenses)}
        </ThemedText>
        <ThemedText style={[styles.heroCaption, { color: heroSurface.textSecondary }]}>
          Left to spend this month
        </ThemedText>

        <ThemedView style={styles.heroSplit} lightColour="transparent" darkColour="transparent">
          <ThemedView
            style={[styles.heroSplitSegment, { backgroundColor: successColour, flexGrow: Math.max(totalIncome, 1) }]}
            lightColour="transparent"
            darkColour="transparent"
          />
          <ThemedView
            style={[styles.heroSplitSegment, { backgroundColor: dangerColour, flexGrow: Math.max(totalExpenses, 1) }]}
            lightColour="transparent"
            darkColour="transparent"
          />
        </ThemedView>

        <ThemedView style={styles.heroLegend} lightColour="transparent" darkColour="transparent">
          <ThemedView style={styles.heroLegendEntry} lightColour="transparent" darkColour="transparent">
            <ThemedView style={[styles.legendDot, { backgroundColor: successColour }]} lightColour="transparent" darkColour="transparent" />
            <ThemedText style={[styles.heroLegendText, { color: heroSurface.textSecondary }]}>
              In {formatCurrency(totalIncome)}
            </ThemedText>
          </ThemedView>
          <ThemedView style={styles.heroLegendEntry} lightColour="transparent" darkColour="transparent">
            <ThemedView style={[styles.legendDot, { backgroundColor: dangerColour }]} lightColour="transparent" darkColour="transparent" />
            <ThemedText style={[styles.heroLegendText, { color: heroSurface.textSecondary }]}>
              Out {formatCurrency(totalExpenses)}
            </ThemedText>
          </ThemedView>
        </ThemedView>
      </HeroCard>

      <ThemedView style={styles.actionButtons} lightColour={backgroundColour} darkColour={backgroundColour}>
        <Button analyticsId="app_budget_index_add_income_2" title="Add Income" variant="success" size="small" onPress={() => addTransaction('income')} style={styles.actionButton} />
        <Button analyticsId="app_budget_index_add_expense_2" title="Add Expense" variant="danger" size="small" onPress={() => addTransaction('expense')} style={styles.actionButton} />
      </ThemedView>

      <SectionHeading eyebrow="Where it goes" title="By category" style={styles.sectionHeading} />

      <Card style={styles.categoryCard} bodyStyle={styles.categoryCardBody}>
        {categoryBreakdown.length === 0 ? (
          <ThemedText style={styles.emptyText}>
            No expense categories recorded for {getMonthName(month)} yet.
          </ThemedText>
        ) : (
          categoryBreakdown.map((entry) => (
            <ThemedView key={entry.name} style={styles.categoryRow} lightColour="transparent" darkColour="transparent">
              <ThemedView style={styles.categoryCopy} lightColour="transparent" darkColour="transparent">
                <ThemedText type="defaultSemiBold">{entry.name}</ThemedText>
                <ThemedText style={styles.categoryAmount}>{formatCurrency(entry.amount)}</ThemedText>
              </ThemedView>
              <ThemedView style={[styles.categoryTrack, { backgroundColor: summaryBackgroundColour }]} lightColour="transparent" darkColour="transparent">
                <ThemedView
                  style={[styles.categoryFill, { backgroundColor: dangerColour, width: `${entry.share}%` }]}
                  lightColour="transparent"
                  darkColour="transparent"
                />
              </ThemedView>
            </ThemedView>
          ))
        )}
      </Card>

      <SectionHeading eyebrow="Recent" title={monthTransactions.length === 1 ? '1 movement' : `${monthTransactions.length} movements`}
        style={styles.sectionHeading} />

      {monthTransactions.length === 0 ? (
        <Card style={styles.emptyCard}>
          <ThemedText type="subtitle" style={styles.emptyTitle}>
            Nothing yet for {getMonthName(month)}
          </ThemedText>
          <ThemedText style={styles.emptyText}>
            Add your first transaction to start tracking this month.
          </ThemedText>
        </Card>
      ) : (
        <ThemedView style={styles.entryList} lightColour={backgroundColour} darkColour={backgroundColour}>
          {monthTransactions.map((transaction) => {
            const isIncome = transaction.type === 'Income';
            return (
              <TouchableOpacity
                analyticsId="app_budget_index_transaction_item"
                analyticsControlType="list_item"
                key={transaction.id}
                onPress={() => router.push(`/budget/edit/${transaction.id}`)}
              >
                <ListRow>
                  <ThemedView
                    style={[styles.entryMark, { backgroundColor: isIncome ? `${successColour}22` : `${dangerColour}22` }]}
                    lightColour="transparent"
                    darkColour="transparent"
                  >
                    <ThemedText style={[styles.entryMarkText, { color: isIncome ? successColour : dangerColour }]}>
                      {isIncome ? '\u2191' : '\u2193'}
                    </ThemedText>
                  </ThemedView>

                  <ThemedView style={styles.entryCopy} lightColour="transparent" darkColour="transparent">
                    <ThemedText type="defaultSemiBold" numberOfLines={1}>{transaction.title}</ThemedText>
                    {transaction.description ? (
                      <ThemedText style={styles.entryMeta} numberOfLines={1}>{transaction.description}</ThemedText>
                    ) : null}
                  </ThemedView>

                  <ThemedView style={styles.entryAmountWrap} lightColour="transparent" darkColour="transparent">
                    <ThemedText style={[styles.entryAmount, { color: isIncome ? successColour : dangerColour }]}>
                      {isIncome ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
                    </ThemedText>
                    {transaction.due_date ? (
                      <ThemedText style={styles.entryDate}>
                        {new Date(transaction.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </ThemedText>
                    ) : null}
                  </ThemedView>
                </ListRow>
              </TouchableOpacity>
            );
          })}
        </ThemedView>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  content: {
    width: Platform.OS === 'web' ? '70%' : '100%',
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hero: {
    marginBottom: 14,
  },
  heroBalance: {
    marginTop: 10,
  },
  heroCaption: {
    marginTop: 4,
    fontSize: 13,
  },
  heroSplit: {
    flexDirection: 'row',
    gap: 4,
    height: 7,
    marginTop: 16,
  },
  heroSplitSegment: {
    borderRadius: 999,
  },
  heroLegend: {
    flexDirection: 'row',
    gap: 18,
    marginTop: 12,
  },
  heroLegendEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  heroLegendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 9,
  },
  actionButton: {
    flex: 1,
  },
  sectionHeading: {
    marginTop: 26,
  },
  categoryCard: {
    marginBottom: 0,
  },
  categoryCardBody: {
    gap: 13,
  },
  categoryRow: {
    gap: 6,
  },
  categoryCopy: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  categoryAmount: {
    fontSize: 13,
    fontWeight: '600',
  },
  categoryTrack: {
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  categoryFill: {
    height: '100%',
    borderRadius: 999,
  },
  entryList: {
    gap: 8,
  },
  entryMark: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  entryMarkText: {
    fontSize: 13,
    fontWeight: '700',
  },
  entryCopy: {
    flex: 1,
    gap: 2,
  },
  entryMeta: {
    fontSize: 12,
    opacity: 0.7,
  },
  entryAmountWrap: {
    alignItems: 'flex-end',
    gap: 2,
  },
  entryAmount: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0,
  },
  entryDate: {
    fontSize: 11,
    opacity: 0.7,
  },
  emptyCard: {
    marginBottom: 0,
  },
  emptyTitle: {
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    opacity: 0.75,
    lineHeight: 19,
  },
});
