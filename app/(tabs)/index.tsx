import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { GetCurrentMonth, GetCurrentYear, getCurrentCountryCodeFromLocale, isMyNewsAvailable } from '@/hooks/dataHandler';
import { useEducationGrades } from '@/hooks/useEducationGrades';
import { useNotes } from '@/hooks/useNotes';
import { useSettings } from '@/hooks/useSettings';
import { useThemeColour } from '@/hooks/useThemeColour';
import { useTodos } from '@/hooks/useTodos';
import { useTransactionsByMonth } from '@/hooks/useTransactions';
import { lifeNestService } from '@/services/lifeNestService';
import { newsService } from '@/services/newsService';
import { transactionService } from '@/services/transactionService';
import { todoService } from '@/services/todoService';
import { dashboardCustomizationService, DashboardCardKey, DashboardLayoutState } from '@/services/dashboardCustomizationService';
import { DEFAULT_CURRENCY_SYMBOL } from '@/constants/CurrencySymbols';
import { Conversation } from '@/types/chatBot';
import { NewsArticle, NewsCategory } from '@/types/news';
import { ToDoItem } from '@/types/todo';
import { UserInfo } from '@/types/user';

//Set the interface for the dashboard information which will be used throughout.
interface DashboardSummary {
  userInfo: UserInfo;
  todoStats: {
    total: number;
    completed: number;
    overdue: number;
    dueSoonCount: number;
  };
  checklistStats: {
    total: number;
    completed: number;
    overdue: number;
    dueSoonCount: number;
  };
  transactionStats: {
    monthlyIncome: number;
    monthlyExpenses: number;
    balance: number;
  };
}

//Constants for the dashboard card headings and News card categories.
const CARD_LABELS: Record<DashboardCardKey, string> = {
  tasks: 'Tasks Overview',
  checklists: 'Checklists',
  finances: 'This Months Finances',
  news: 'My News',
  grades: 'Latest Grades',
  notes: 'Notes',
  lifenest: 'LifeNest',
  movingOut: 'Moving Out Checklist',
};

const NEWS_CATEGORIES: { key: NewsCategory; label: string }[] = [
  { key: 'business', label: 'Business' },
  { key: 'strange', label: 'Strange' },
  { key: 'politics', label: 'Politics' },
  { key: 'uk', label: 'UK' },
];

//Get the Note title, which could be the first line of the note or 'Untitled note' if there is not note content.
const getNoteTitle = (content: string) => {
  const firstLine = content.split('\n').find(line => line.trim().length > 0) || '';
  const trimmed = firstLine.trim();
  if (!trimmed) return 'Untitled note';
  return trimmed.length > 60 ? `${trimmed.slice(0, 60)}...` : trimmed;
};

//Render the dashboard screen.
export default function DashboardScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);
  const [dueToday, setDueToday] = useState<ToDoItem[]>([]);
  const [dueSoon, setDueSoon] = useState<ToDoItem[]>([]);
  const [recentChats, setRecentChats] = useState<Conversation[]>([]);
  const [newsCategory, setNewsCategory] = useState<NewsCategory>('business');
  const [dashboardHeadlines, setDashboardHeadlines] = useState<NewsArticle[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [layoutState, setLayoutState] = useState<DashboardLayoutState>(dashboardCustomizationService.getDefaultLayout());
  const [draftLayoutState, setDraftLayoutState] = useState<DashboardLayoutState>(dashboardCustomizationService.getDefaultLayout());
  const countryCode = useMemo(() => getCurrentCountryCodeFromLocale(), []);
  const isMyNewsRegionSupported = useMemo(() => isMyNewsAvailable(countryCode), [countryCode]);
  const currentMonth = useMemo(() => GetCurrentMonth(), []);
  const currentYear = useMemo(() => GetCurrentYear(), []);
  const { transactions, loading: transactionsLoading, fetchTransactions } = useTransactionsByMonth(currentMonth, currentYear);
  const { user, userInfo } = useAuth();
  const { todos, premiumCategories, loading: todosLoading, fetchTodos } = useTodos();
  const checklistTodos = useMemo(() => todos.filter((todo) => todo.item_kind === 'checklist'), [todos]);
  const taskTodos = useMemo(() => todos.filter((todo) => todo.item_kind !== 'checklist'), [todos]);
  const movingOutCategory = premiumCategories.find((category) => category.name === 'Moving Out');
  const movingOutTodos = useMemo(() => { //Get the todos for the moving out premium category and sort them by progress and due date. This will be repurposed for when other premium categories are added.
    if (!movingOutCategory) return [];
    return [...todos].filter((todo) => todo.premium_category_id === movingOutCategory.id).sort((a, b) => {
      if (b.progress !== a.progress) return b.progress - a.progress;
      return new Date(b['due_date_&_time'] || '').getTime() - new Date(a['due_date_&_time'] || '').getTime();
    }).slice(0, 5);
  }, [movingOutCategory, todos]);

  //renders a completion percentage for the moving out category card. This uses a memoised expression which reclaculates moveouttodos if its value changes.
  const movingOutCompletion = useMemo(() => {
    if (movingOutTodos.length === 0) return 0;
    const completeCount = movingOutTodos.filter((todo) => todo.is_complete).length;
    return Math.round((completeCount / movingOutTodos.length) * 100);
  }, [movingOutTodos]);
  const { settings } = useSettings();
  const { notes, fetchNotes } = useNotes();
  const { grades, fetchGrades } = useEducationGrades();
  const borderColour = useThemeColour({ light: '#E5E7EB', dark: '#3A3A3C' }, 'border');
  const loading = todosLoading || transactionsLoading;
  const backgroundColour = useThemeColour({}, 'background');
  const cardBackground = useThemeColour({}, 'cardBackground');

  //calls the customisation layout method to get what the current order and visible items should be.
  useEffect(() => {
    dashboardCustomizationService.getLayout().then((layout) => {
      setLayoutState(layout);
      setDraftLayoutState(layout);
    }).catch((error) => {
      console.error('Failed loading dashboard layout:', error);
    });
  }, []);

  //Gets Due To do items so it can display the correct items in the necessary columns
  useEffect(() => {
    const fetchDueItems = async () => {
      if (!settings) return;
      const todayItems = (await todoService.getTodosDueToday()).filter((todo) => todo.item_kind !== 'checklist');
      const soonItems = (await todoService.getTodosDueSoon(settings.todo.todo_soon_determiner)).filter((todo) => todo.item_kind !== 'checklist');
      setDueToday(todayItems);
      setDueSoon(soonItems);
    };
    fetchDueItems();
  }, [settings]);

  //Gets the news and lifenest chats for the dashboard.
  const fetchDashboardExtras = useCallback(async () => {
    const [newsResult, chatsResult] = await Promise.allSettled([
      newsService.getTopHeadlinesByCategory(newsCategory, 5),
      lifeNestService.getRecentConversations(3),
    ]);

    if (newsResult.status === 'fulfilled') {
      setDashboardHeadlines(newsResult.value);
    } else {
      setDashboardHeadlines([]);
    }

    if (chatsResult.status === 'fulfilled') {
      setRecentChats(chatsResult.value);
    } else {
      setRecentChats([]);
    }

  }, [newsCategory]);

  //Gets more dashboard items.
  useEffect(() => {
    fetchTodos();
    fetchTransactions();
    fetchNotes();
    fetchGrades();
    fetchDashboardExtras()
  }, [fetchNotes, fetchTodos, fetchTransactions, fetchGrades, fetchDashboardExtras]);

  // on load, alert the user if there are todo items they need to be aware of.
  useEffect(() => {
    showAlert(dueToday, 'Due Today');
    showAlert(dueSoon, 'Due Soon');
  }, [dueSoon, dueToday]);

  useEffect(() => {
    if (!user || todosLoading || transactionsLoading || !todos || !transactions || !userInfo || !settings) return;
    const now = new Date();
    const dueSoonCutoffDate = new Date();
    dueSoonCutoffDate.setDate(now.getDate() + settings.todo.todo_soon_determiner);

    const isChecklistComplete = (todo: ToDoItem) => Boolean(todo.checklist_items?.length) && (todo.checklist_items || []).every((item) => item.is_complete);
    const buildStats = (items: ToDoItem[]) => ({//Gets the statistics for a list of checklists
      total: items.length,
      completed: items.filter(todo => todo.item_kind === 'checklist' ? isChecklistComplete(todo) : todo.is_complete).length,
      overdue: items.filter(todo => !(todo.item_kind === 'checklist' ? isChecklistComplete(todo) : todo.is_complete) && todo['due_date_&_time'] && new Date(todo['due_date_&_time']) < now).length,
      dueSoonCount: items.filter(todo => !(todo.item_kind === 'checklist' ? isChecklistComplete(todo) : todo.is_complete) && todo['due_date_&_time'] && new Date(todo['due_date_&_time']) >= now && new Date(todo['due_date_&_time']) <= dueSoonCutoffDate).length,
    });

    const todoStats = buildStats(taskTodos);
    const checklistStats = buildStats(checklistTodos);
    const monthlyIncome = transactions.filter(t => t.type === 'Income').reduce((sum, t) => sum + t.amount, 0);
    const monthlyExpenses = Math.abs(transactions.filter(t => t.type === 'Expense').reduce((sum, t) => sum + t.amount, 0));
    const transactionStats = { monthlyIncome, monthlyExpenses, balance: monthlyIncome - monthlyExpenses };

    setDashboardSummary({ userInfo: userInfo, todoStats, checklistStats, transactionStats });
  }, [transactions, user, userInfo, settings, currentMonth, taskTodos, checklistTodos, todos, todosLoading, transactionsLoading]);

  //Handle screen refresh so information is up to date.
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const refreshTasks = [
        { label: 'todos', run: fetchTodos },
        { label: 'transactions', run: fetchTransactions },
        { label: 'notes', run: fetchNotes },
        { label: 'grades', run: fetchGrades },
        { label: 'dashboard_extras', run: fetchDashboardExtras },
      ] as const;
      const results = await Promise.allSettled(refreshTasks.map((task) => task.run()));
      const failedTasks = results.map((result, index) => ({ result, label: refreshTasks[index].label })).filter((entry): entry is { result: PromiseRejectedResult; label: typeof refreshTasks[number]['label'] } => entry.result.status === 'rejected').map((entry) => ({
        label: entry.label,
        reason: entry.result.reason instanceof Error ? entry.result.reason.message : String(entry.result.reason),
      }));
      void failedTasks;
    } finally {
      setRefreshing(false);
    }
  }, [fetchDashboardExtras, fetchNotes, fetchTodos, fetchTransactions, fetchGrades]);

  //Specific alert handler for the todo items.
  const showAlert = (items: ToDoItem[], title: string) => {
    if (items.length > 0) {
      Alert.alert(title, `You have ${items.length} task item(s) ${title.toLowerCase()}.`, [{ text: 'OK' }]);
    }
  };

  //Get the recently updates Notes
  const recentNoteTitles = useMemo(() => {
    return [...notes].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 5).map(note => getNoteTitle(note.content || ''));
  }, [notes]);

  const preferredCurrency = settings?.transactions.preferred_currency || DEFAULT_CURRENCY_SYMBOL;
  const formatAmount = useCallback((amount: number) => transactionService.formatCurrency(amount, preferredCurrency), [preferredCurrency]);
  //Get grade information sorted by its achieved date and return only the latest 3.
  const recentGrades = useMemo(() => {
    return [...grades].sort((a, b) => {
      if (!a.date_achieved && !b.date_achieved) return 0;
      if (!a.date_achieved) return 1;
      if (!b.date_achieved) return -1;
      return new Date(b.date_achieved).getTime() - new Date(a.date_achieved).getTime();
    }).slice(0, 3);
  }, [grades]);

  const activeLayout = editMode ? draftLayoutState : layoutState;
  const visibleOrder = activeLayout.order.filter((key) => !activeLayout.hidden.includes(key) && (key !== 'news' || isMyNewsRegionSupported));
  const toggleHide = (key: DashboardCardKey) => {
    const isHidden = draftLayoutState.hidden.includes(key);
    if (!isHidden && draftLayoutState.order.length - draftLayoutState.hidden.length <= 2) {
      return;
    }
    setDraftLayoutState((prev) => ({
      ...prev, hidden: isHidden ? prev.hidden.filter((item) => item !== key) : [...prev.hidden, key],
    }));
  };

  //Handle the moving of the dashboard card.
  const moveCard = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= draftLayoutState.order.length) return;

    setDraftLayoutState((prev) => {
      const nextOrder = [...prev.order];
      const temp = nextOrder[index];
      nextOrder[index] = nextOrder[nextIndex];
      nextOrder[nextIndex] = temp;
      return { ...prev, order: nextOrder };
    });
  };

  //When finished with editing the dashboard layout page.
  const handleDone = async () => {
    setLayoutState(draftLayoutState);
    setEditMode(false);
    await dashboardCustomizationService.saveLayout(draftLayoutState);
  };

  //Gets the todo card border colours which coincides with the date when it is due.
  const getDashboardCardBorder = (stats: { completed: number; dueSoonCount: number; overdue: number; total: number }) => {
    const statusColour = stats.overdue > 0 ? '#EF4444' : stats.dueSoonCount > 0 ? '#F59E0B' : stats.total > 0 && stats.completed === stats.total ? '#22C55E' : '#3B82F6';
    return { borderWidth: 0, borderLeftWidth: 4, borderColor: statusColour };
  };

  //Gets the text colour for similar criteria to the border handled above.
  const getItemTextStyle = (todo: ToDoItem) => {
    const isComplete = todo.item_kind === 'checklist' ? Boolean(todo.checklist_items?.length) && (todo.checklist_items || []).every((item) => item.is_complete) : todo.is_complete;
    if (isComplete) return { color: '#22C55E' };
    if (todo['due_date_&_time'] && new Date(todo['due_date_&_time']) < new Date()) return { color: '#EF4444' };
    if (settings?.todo.todo_soon_determiner && todo['due_date_&_time'] && new Date(todo['due_date_&_time']) <= new Date(Date.now() + settings.todo.todo_soon_determiner * 24 * 60 * 60 * 1000)) return { color: '#F59E0B' };
    return undefined;
  };

  //Renders a dashboard card based on its type.
  const renderCard = (key: DashboardCardKey) => {
    switch (key) {
      case 'tasks':
        return dashboardSummary ? (
          <TouchableOpacity onPress={() => router.replace({ pathname: '/todo', params: { type: 'tasks' } })}>
            <Card style={[styles.card, getDashboardCardBorder(dashboardSummary.todoStats)]}><ThemedText type="subtitle" style={styles.cardTitle}>Tasks Overview</ThemedText><ThemedView style={styles.infoContainer}><ThemedView style={styles.cardItem}><ThemedText type="defaultSemiBold" style={styles.cardNumber}>{dashboardSummary.todoStats.total}</ThemedText><ThemedText style={styles.cardLabel}>Total</ThemedText></ThemedView><ThemedView style={styles.cardItem}><ThemedText type="defaultSemiBold" style={[styles.cardNumber, { color: '#22C55E' }]}>{dashboardSummary.todoStats.completed}</ThemedText><ThemedText style={styles.cardLabel}>Completed</ThemedText></ThemedView><ThemedView style={styles.cardItem}><ThemedText type="defaultSemiBold" style={[styles.cardNumber, { color: '#EF4444' }]}>{dashboardSummary.todoStats.overdue}</ThemedText><ThemedText style={styles.cardLabel}>Overdue</ThemedText></ThemedView><ThemedView style={styles.cardItem}><ThemedText type="defaultSemiBold" style={[styles.cardNumber, { color: '#F59E0B' }]}>{dashboardSummary.todoStats.dueSoonCount}</ThemedText><ThemedText style={styles.cardLabel}>Due Soon</ThemedText></ThemedView></ThemedView><ThemedText style={styles.tapHint}>Tap to view all tasks {'->'}</ThemedText></Card>
          </TouchableOpacity>
        ) : null;
      case 'checklists':
        return dashboardSummary ? (
          <TouchableOpacity onPress={() => router.replace({ pathname: '/todo', params: { type: 'checklists' } })}>
            <Card style={[styles.card, getDashboardCardBorder(dashboardSummary.checklistStats)]}><ThemedText type="subtitle" style={styles.cardTitle}>Checklists</ThemedText><ThemedView style={styles.infoContainer}><ThemedView style={styles.cardItem}><ThemedText type="defaultSemiBold" style={styles.cardNumber}>{dashboardSummary.checklistStats.total}</ThemedText><ThemedText style={styles.cardLabel}>Total</ThemedText></ThemedView><ThemedView style={styles.cardItem}><ThemedText type="defaultSemiBold" style={[styles.cardNumber, { color: '#22C55E' }]}>{dashboardSummary.checklistStats.completed}</ThemedText><ThemedText style={styles.cardLabel}>Completed</ThemedText></ThemedView><ThemedView style={styles.cardItem}><ThemedText type="defaultSemiBold" style={[styles.cardNumber, { color: '#EF4444' }]}>{dashboardSummary.checklistStats.overdue}</ThemedText><ThemedText style={styles.cardLabel}>Overdue</ThemedText></ThemedView><ThemedView style={styles.cardItem}><ThemedText type="defaultSemiBold" style={[styles.cardNumber, { color: '#F59E0B' }]}>{dashboardSummary.checklistStats.dueSoonCount}</ThemedText><ThemedText style={styles.cardLabel}>Due Soon</ThemedText></ThemedView></ThemedView>{checklistTodos.length === 0 ? <ThemedText style={styles.listItemText}>No checklists yet.</ThemedText> : checklistTodos.slice(0, 3).map((todo) => (<ThemedText key={todo.id} style={[styles.listItemText, getItemTextStyle(todo)]}>{todo.title}</ThemedText>))}<ThemedText style={styles.tapHint}>Tap to view all checklists {'->'}</ThemedText></Card>
          </TouchableOpacity>
        ) : null;
      case 'finances':
        return dashboardSummary ? <TouchableOpacity onPress={() => router.replace('/budget')}><Card style={styles.card}><ThemedText type="subtitle" style={styles.cardTitle}>This Months Finances</ThemedText><ThemedView style={styles.financeContainer}><ThemedView style={styles.financeRow}><ThemedText style={styles.financeLabel}>Income:</ThemedText><ThemedText style={[styles.financeAmount, { color: '#22C55E' }]}>{formatAmount(dashboardSummary.transactionStats.monthlyIncome)}</ThemedText></ThemedView><ThemedView style={styles.financeRow}><ThemedText style={styles.financeLabel}>Expenses:</ThemedText><ThemedText style={[styles.financeAmount, { color: '#EF4444' }]}>{formatAmount(dashboardSummary.transactionStats.monthlyExpenses)}</ThemedText></ThemedView><ThemedView style={[styles.financeRow, styles.balanceRow, { borderTopColor: borderColour }]}><ThemedText type="defaultSemiBold" style={styles.financeLabel}>Balance:</ThemedText><ThemedText type="defaultSemiBold" style={[styles.financeAmount, { color: dashboardSummary.transactionStats.balance >= 0 ? '#22C55E' : '#EF4444' }]}>{formatAmount(dashboardSummary.transactionStats.balance)}</ThemedText></ThemedView></ThemedView></Card></TouchableOpacity> : null;
      case 'news':
        if (!isMyNewsRegionSupported) return null;
        return <TouchableOpacity onPress={() => router.replace('/myNews')}><Card style={styles.card}><ThemedText type="subtitle" style={styles.cardTitle}>My News - Top 5 Headlines</ThemedText><View style={styles.newsCategoryRow}>{NEWS_CATEGORIES.map((category) => (<TouchableOpacity key={category.key} style={[styles.newsCategoryChip, { borderColor: newsCategory === category.key ? cardBackground : borderColour, backgroundColor: newsCategory === category.key ? cardBackground : 'transparent' }]} onPress={() => setNewsCategory(category.key)}><ThemedText style={styles.newsCategoryText}>{category.label}</ThemedText></TouchableOpacity>))}</View>{dashboardHeadlines.map((article, index) => (<ThemedText key={article.id} numberOfLines={1} ellipsizeMode="tail" style={styles.listItemText}>{`${index + 1}. ${article.title}`}</ThemedText>))}</Card></TouchableOpacity>;
      case 'grades':
        return <TouchableOpacity onPress={() => router.push('/grades')}><Card style={styles.card}><ThemedText type="subtitle" style={styles.cardTitle}>Latest Grades</ThemedText>{recentGrades.length === 0 ? <ThemedText style={styles.listItemText}>No grades added yet.</ThemedText> : recentGrades.map((item, index) => (<ThemedText key={item.id} style={styles.listItemText}>{`${index + 1}. ${item.subject} (${item.qualification_type}): ${item.grade}`}</ThemedText>))}</Card></TouchableOpacity>;
      case 'notes':
        return <TouchableOpacity onPress={() => router.replace('/notes')}><Card style={styles.card}><ThemedText type="subtitle" style={styles.cardTitle}>Notes - Last 5 Titles</ThemedText>{recentNoteTitles.length === 0 ? <ThemedText style={styles.listItemText}>No notes yet.</ThemedText> : recentNoteTitles.map((title, index) => (<ThemedText key={`${title}-${index}`} style={styles.listItemText}>{`${index + 1}. ${title}`}</ThemedText>))}</Card></TouchableOpacity>;
      case 'lifenest':
        return <Card style={styles.card}><ThemedText type="subtitle" style={styles.cardTitle}>LifeNest - Last 3 Chats</ThemedText>{recentChats.length === 0 ? <TouchableOpacity onPress={() => router.replace('/lifenest')}><ThemedText style={styles.lifeNestLine}>No chat history yet ...</ThemedText></TouchableOpacity> : recentChats.map((chat, index) => (<TouchableOpacity key={chat.id} style={styles.lifeNestRow} onPress={() => router.replace({ pathname: '/lifenest', params: { conversationId: chat.id } })}><ThemedText style={styles.lifeNestLine}>{`${index + 1}. ${chat.title || 'New conversation'}`}</ThemedText></TouchableOpacity>))}</Card>;
      case 'movingOut':
        return <TouchableOpacity onPress={() => router.replace({ pathname: '/todo', params: { premiumCategory: 'Moving Out' } })}><Card style={[styles.card, getDashboardCardBorder({ total: movingOutTodos.length, completed: movingOutTodos.filter((todo) => todo.is_complete).length, overdue: movingOutTodos.filter((todo) => !todo.is_complete && todo['due_date_&_time'] && new Date(todo['due_date_&_time']) < new Date()).length, dueSoonCount: movingOutTodos.filter((todo) => !todo.is_complete && todo['due_date_&_time'] && settings?.todo.todo_soon_determiner && new Date(todo['due_date_&_time']) >= new Date() && new Date(todo['due_date_&_time']) <= new Date(Date.now() + settings.todo.todo_soon_determiner * 24 * 60 * 60 * 1000)).length })]}><ThemedText type="subtitle" style={styles.cardTitle}>Moving Out Checklist</ThemedText><ThemedText style={styles.listItemMeta}>Completion: {movingOutCompletion}%</ThemedText>{movingOutTodos.length === 0 ? <ThemedText style={styles.listItemText}>No moving out tasks yet.</ThemedText> : movingOutTodos.map((todo) => (<TouchableOpacity key={todo.id} onPress={() => router.push(`/todo/edit/${todo.id}`)}><ThemedText style={[styles.listItemText, getItemTextStyle(todo)]}>{todo.title}</ThemedText></TouchableOpacity>))}</Card></TouchableOpacity>;
      default:
        return null;
    }
  };

  //Show a loading spinner instead of the dashboard if in the loading state.
  if (loading && !dashboardSummary) {
    return <ThemedView style={styles.loadingContainer}><LoadingSpinner /></ThemedView>;
  }

  //Handles the rendering of the dashboard, this includes the edit mode which shows the drag and drop and hide options for the dashboard cards, as well as the normal mode which just shows the cards in their order.
  return (
    <ScrollView style={{ backgroundColor: backgroundColour }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <ThemedView style={styles.content} darkColour={backgroundColour} lightColour={backgroundColour}>
        <View style={styles.customizeHeader}>
          <Button title={editMode ? 'Done' : 'Customise'} onPress={editMode ? handleDone : () => {
            //Handles the edit button press to enter edit mode.
            if (!userInfo?.is_premium_user) {
              setTooltipVisible(true);
              setTimeout(() => setTooltipVisible(false), 2200);
              return;
            }
            setDraftLayoutState(layoutState);
            setEditMode(true);
          }} variant={userInfo?.is_premium_user ? 'primary' : 'secondary'} />
          {editMode && (
            <>
              <Button title="Cancel" variant="secondary" onPress={() => { setDraftLayoutState(layoutState); setEditMode(false); }} />
              <Button title="Reset" variant="warning" onPress={() => setDraftLayoutState(dashboardCustomizationService.getDefaultLayout())} />
            </>
          )}
        </View>
        {tooltipVisible && <ThemedText style={styles.premiumTooltip}>Premium feature: upgrade to customise your dashboard.</ThemedText>}

        {editMode && draftLayoutState.hidden.length > 0 && (
          <View style={styles.unhideWrap}>
            <ThemedText style={styles.label}>Unhide dashboard items</ThemedText>
            <View style={styles.unhideButtonsWrap}>
              {draftLayoutState.hidden.map((key) => (
                <Button key={key} title={`Unhide ${CARD_LABELS[key]}`} size="small" variant="secondary"
                  onPress={() => toggleHide(key)} />
              ))}
            </View>
          </View>
        )}

        {editMode && draftLayoutState.order.map((key, index) => (
          <Card key={key} style={styles.editCard}>
            <ThemedText>{CARD_LABELS[key]}</ThemedText>
            <View style={styles.editActions}>
              <Button title="↑" size="small" variant="secondary" onPress={() => moveCard(index, -1)} />
              <Button title="↓" size="small" variant="secondary" onPress={() => moveCard(index, 1)} />
              <Button title={draftLayoutState.hidden.includes(key) ? 'Unhide' : 'Hide'} size="small" variant="secondary" onPress={() => toggleHide(key)} disabled={!draftLayoutState.hidden.includes(key) && draftLayoutState.order.length - draftLayoutState.hidden.length <= 2} />
            </View>
          </Card>
        ))}

        {!editMode && visibleOrder.map((key) => (
          <View key={key}>{renderCard(key)}</View>
        ))}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 10,
  },
  card: {
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardItem: {
    alignItems: 'center',
    flex: 1,
  },
  cardNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'center',
  },
  financeContainer: { marginBottom: 16 },
  financeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  balanceRow: { marginTop: 8, paddingTop: 8, borderTopWidth: 1 },
  financeLabel: { fontSize: 14 },
  financeAmount: { fontSize: 16, fontWeight: '600' },
  tapHint: { fontSize: 12, opacity: 0.6, textAlign: 'center', marginTop: 8 },
  listItemText: { fontSize: 14, marginBottom: 6, opacity: 0.85 },
  listItemMeta: { fontSize: 12, marginTop: 2, opacity: 0.7 },
  newsCategoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  newsCategoryChip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  newsCategoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  lifeNestRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  lifeNestLine: { fontSize: 14, flex: 1 },
  customizeHeader: { flexDirection: 'row', gap: 8, marginBottom: 10, alignItems: 'center' },
  premiumTooltip: { fontSize: 12, marginBottom: 10, opacity: 0.8 },
  unhideWrap: { marginBottom: 8 },
  unhideButtonsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  label: { fontSize: 14, fontWeight: '600' },
  editCard: { marginBottom: 8 },
  editActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
});
