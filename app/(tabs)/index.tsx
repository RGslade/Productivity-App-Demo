import { TrackedTouchableOpacity as TouchableOpacity } from '@/components/ui/TrackedTouchableOpacity';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform, RefreshControl, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Eyebrow, HeroCard, useHeroSurface } from '@/components/ui/Surfaces';
import { ReadinessRing } from '@/components/ui/ReadinessRing';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { GetCurrentMonth, GetCurrentYear, getCurrentCountryCodeFromLocale, isMyNewsAvailable, showAlert } from '@/hooks/dataHandler';
import { useEducationGrades } from '@/hooks/useEducationGrades';
import { useNotes } from '@/hooks/useNotes';
import { useSettings } from '@/hooks/useSettings';
import { useThemeColour } from '@/hooks/useThemeColour';
import { useTodos } from '@/hooks/useTodos';
import { useTransactionsByMonth } from '@/hooks/useTransactions';
import { lifeNestService } from '@/services/lifeNestService';
import { newsService } from '@/services/newsService';
import { transactionService } from '@/services/transactionService';
import { replaceTopLevelRoute } from '@/services/navigationService';
import { dashboardCustomizationService, DashboardCardKey, DashboardLayoutState } from '@/services/dashboardCustomizationService';
import { createTokenOperationId, tokenUsageService } from '@/services/tokenUsageService';
import { showTokenUsageToast } from '@/services/tokenToastService';
import { DEFAULT_CURRENCY_SYMBOL } from '@/constants/CurrencySymbols';
import { Conversation } from '@/types/chatBot';
import { NewsArticle, NewsCategory } from '@/types/news';
import { ToDoItem } from '@/types/todo';
import { UserInfo } from '@/types/user';

interface DashboardInfo {
  userInfo: UserInfo;
  todoStats: {
    total: number;
    completed: number;
    overdue: number;
    dueSoonDate: number;
  };
  checklistStats: {
    total: number;
    completed: number;
    overdue: number;
    dueSoonDate: number;
  };
  transactionStats: {
    monthlyIncome: number;
    monthlyExpenses: number;
    balance: number;
  };
}

const CARD_LABELS: Record<DashboardCardKey, string> = {
  tasks: 'Tasks Overview',
  checklists: 'Checklists',
  finances: 'This Months Finances',
  appNews: 'App News',
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

const getNoteTitle = (content: string) => {
  const firstLine = content.split('\n').find(line => line.trim().length > 0) || '';
  const trimmed = firstLine.trim();
  if (!trimmed) return 'Untitled note';
  return trimmed.length > 60 ? `${trimmed.slice(0, 60)}...` : trimmed;
};

/** Renders the dashboard and premium customisation controls. */
export default function DashboardScreen() {
  const { width } = useWindowDimensions();
  const useWideGrid = width >= 900;
  const [refreshing, setRefreshing] = useState(false);
  const [info, setInfo] = useState<DashboardInfo | null>(null);
  const [recentChats, setRecentChats] = useState<Conversation[]>([]);
  const [newsCategory, setNewsCategory] = useState<NewsCategory>('business');
  const [dashboardHeadlines, setDashboardHeadlines] = useState<NewsArticle[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [customizationSaving, setCustomizationSaving] = useState(false);
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
  const movingOutTodos = useMemo(() => {
    if (!movingOutCategory) return [];
    return [...todos]
      .filter((todo) => todo.premium_category_id === movingOutCategory.id)
      .sort((a, b) => {
        if (b.progress !== a.progress) return b.progress - a.progress;
        return new Date(b['due_date_&_time'] || '').getTime() - new Date(a['due_date_&_time'] || '').getTime();
      })
      .slice(0, 5);
  }, [movingOutCategory, todos]);
  const movingOutCompletion = useMemo(() => {
    if (movingOutTodos.length === 0) return 0;
    const completeCount = movingOutTodos.filter((todo) => todo.is_complete).length;
    return Math.round((completeCount / movingOutTodos.length) * 100);
  }, [movingOutTodos]);
  const { settings } = useSettings();
  const { notes, fetchNotes } = useNotes();
  const { grades, fetchGrades } = useEducationGrades();
  const borderColour = useThemeColour({ light: 'rgba(30, 28, 25, 0.10)', dark: 'rgba(247, 244, 236, 0.14)' }, 'border');
  const loading = todosLoading || transactionsLoading;
  const backgroundColour = useThemeColour({}, 'background');
  const cardBackground = useThemeColour({}, 'cardBackground');
  const successColour = useThemeColour({}, 'success');
  const dangerColour = useThemeColour({}, 'danger');
  const warningColour = useThemeColour({}, 'warning');
  const primaryColour = useThemeColour({}, 'primary');

  useEffect(() => {
    dashboardCustomizationService.getLayout().then((layout) => {
      setLayoutState(layout);
      setDraftLayoutState(layout);
    }).catch((error) => {
      console.error('Failed loading dashboard layout:', error);
    });
  }, []);

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

  useEffect(() => {
    fetchDashboardExtras();
  }, [fetchDashboardExtras]);

  const dueToday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    return taskTodos.filter((todo) => {
      if (todo.is_complete) return false;
      if (!todo['due_date_&_time']) return false;
      const dueDate = new Date(todo['due_date_&_time']);
      return dueDate >= today && dueDate < tomorrow;
    });
  }, [taskTodos]);

  const dueSoon = useMemo(() => {
    if (!settings) return [];
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + settings.todo.todo_soon_determiner);

    return taskTodos.filter((todo) => {
      if (todo.is_complete) return false;
      if (!todo['due_date_&_time']) return false;
      const dueDate = new Date(todo['due_date_&_time']);
      return dueDate >= now && dueDate <= futureDate;
    });
  }, [settings, taskTodos]);

  useEffect(() => {
    showTodoAlert(dueToday, 'Due Today');
    showTodoAlert(dueSoon, 'Due Soon');
  }, [dueSoon, dueToday]);

  useEffect(() => {
    if (!user || todosLoading || transactionsLoading || !todos || !transactions || !userInfo || !settings) return;
    const now = new Date();
    const dueSoonDate = new Date();
    dueSoonDate.setDate(now.getDate() + settings.todo.todo_soon_determiner);

    const isChecklistComplete = (todo: ToDoItem) => Boolean(todo.checklist_items?.length) && (todo.checklist_items || []).every((item) => item.is_complete);
    const buildStats = (items: ToDoItem[]) => ({
      total: items.length,
      completed: items.filter(todo => todo.item_kind === 'checklist' ? isChecklistComplete(todo) : todo.is_complete).length,
      overdue: items.filter(todo => !(todo.item_kind === 'checklist' ? isChecklistComplete(todo) : todo.is_complete) && todo['due_date_&_time'] && new Date(todo['due_date_&_time']) < now).length,
      dueSoonDate: items.filter(todo => !(todo.item_kind === 'checklist' ? isChecklistComplete(todo) : todo.is_complete) && todo['due_date_&_time'] && new Date(todo['due_date_&_time']) >= now && new Date(todo['due_date_&_time']) <= dueSoonDate).length,
    });

    const todoStats = buildStats(taskTodos);
    const checklistStats = buildStats(checklistTodos);

    const monthlyIncome = transactions.filter(t => t.type === 'Income').reduce((sum, t) => sum + t.amount, 0);
    const monthlyExpenses = Math.abs(transactions.filter(t => t.type === 'Expense').reduce((sum, t) => sum + t.amount, 0));
    const transactionStats = { monthlyIncome, monthlyExpenses, balance: monthlyIncome - monthlyExpenses };

    setInfo({ userInfo: userInfo, todoStats, checklistStats, transactionStats });
  }, [transactions, user, userInfo, settings, currentMonth, taskTodos, checklistTodos, todos, todosLoading, transactionsLoading]);

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
      const failedTasks = results
        .map((result, index) => ({ result, label: refreshTasks[index].label }))
        .filter((entry): entry is { result: PromiseRejectedResult; label: typeof refreshTasks[number]['label'] } => entry.result.status === 'rejected')
        .map((entry) => ({
          label: entry.label,
          reason: entry.result.reason instanceof Error ? entry.result.reason.message : String(entry.result.reason),
        }));
      void failedTasks;
    } finally {
      setRefreshing(false);
    }
  }, [fetchDashboardExtras, fetchNotes, fetchTodos, fetchTransactions, fetchGrades]);

  const showTodoAlert = (items: ToDoItem[], title: string) => {
    if (items.length > 0) {
      Alert.alert(title, `You have ${items.length} task item(s) ${title.toLowerCase()}.`, [{ text: 'OK' }]);
    }
  };

  const recentNoteTitles = useMemo(() => {
    return [...notes]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 5)
      .map(note => getNoteTitle(note.content || ''));
  }, [notes]);

  const preferredCurrency = settings?.transactions.preferred_currency || DEFAULT_CURRENCY_SYMBOL;
  const formatAmount = useCallback((amount: number) => transactionService.formatCurrency(amount, preferredCurrency), [preferredCurrency]);

  const recentGrades = useMemo(() => {
    return [...grades]
      .sort((a, b) => {
        if (!a.date_achieved && !b.date_achieved) return 0;
        if (!a.date_achieved) return 1;
        if (!b.date_achieved) return -1;
        return new Date(b.date_achieved).getTime() - new Date(a.date_achieved).getTime();
      })
      .slice(0, 3);
  }, [grades]);

  const heroSurface = useHeroSurface();

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 18) return 'Afternoon';
    return 'Evening';
  }, []);

  const todayLabel = useMemo(
    () => new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
    []
  );

  /** The nearest incomplete task, so the hero always names one real next step. */
  const nextUpTodo = useMemo(() => {
    const open = taskTodos.filter((todo) => !todo.is_complete);
    if (open.length === 0) return null;
    return [...open].sort((a, b) => {
      const aDue = a['due_date_&_time'] ? new Date(a['due_date_&_time']).getTime() : Number.MAX_SAFE_INTEGER;
      const bDue = b['due_date_&_time'] ? new Date(b['due_date_&_time']).getTime() : Number.MAX_SAFE_INTEGER;
      return aDue - bDue;
    })[0];
  }, [taskTodos]);

  const nextUpDueLabel = useMemo(() => {
    if (!nextUpTodo?.['due_date_&_time']) return 'No date';
    const due = new Date(nextUpTodo['due_date_&_time']);
    const days = Math.round((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days < 0) return 'Overdue';
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days < 7) return due.toLocaleDateString('en-GB', { weekday: 'short' });
    return due.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }, [nextUpTodo]);

  const readiness = useMemo(() => {
    if (!info || info.todoStats.total === 0) return 0;
    return Math.round((info.todoStats.completed / info.todoStats.total) * 100);
  }, [info]);

  const activeLayout = editMode ? draftLayoutState : layoutState;

  const visibleOrder = activeLayout.order.filter((key) => !activeLayout.hidden.includes(key) && (key !== 'news' || isMyNewsRegionSupported));

  const toggleHide = (key: DashboardCardKey) => {
    const isHidden = draftLayoutState.hidden.includes(key);
    if (!isHidden && draftLayoutState.order.length - draftLayoutState.hidden.length <= 2) {
      return;
    }
    setDraftLayoutState((prev) => ({
      ...prev,
      hidden: isHidden ? prev.hidden.filter((item) => item !== key) : [...prev.hidden, key],
    }));
  };

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

  const handleDone = async () => {
    const changed = JSON.stringify(draftLayoutState) !== JSON.stringify(layoutState);
    if (!changed) {
      setEditMode(false);
      return;
    }
    setCustomizationSaving(true);
    let spend: Awaited<ReturnType<typeof tokenUsageService.spend>> | null = null;
    try {
      spend = await tokenUsageService.spend({ feature: 'dashboard_customization', operationId: createTokenOperationId('dashboard-customization') });
      await dashboardCustomizationService.saveLayout(draftLayoutState);
      setLayoutState(draftLayoutState);
      showTokenUsageToast(spend.tokens);
      setEditMode(false);
    } catch {
      if (spend) await tokenUsageService.refund(spend).catch(() => undefined);
      showAlert('Could not save dashboard', 'Your dashboard was not changed and your tokens were restored.');
    } finally {
      setCustomizationSaving(false);
    }
  };

  /** Status reads as a small dot in the card's kicker row rather than a slab of colour. */
  const getDashboardStatusColour = (stats: { completed: number; dueSoonDate: number; overdue: number; total: number }) => (
    stats.overdue > 0
      ? dangerColour
      : stats.dueSoonDate > 0
        ? warningColour
        : stats.total > 0 && stats.completed === stats.total
          ? successColour
          : primaryColour
  );

  const getMovingOutAccent = (stats: { completed: number; dueSoonDate: number; overdue: number; total: number }) => ({
    borderColor: getDashboardStatusColour(stats),
  });

  const getItemTextStyle = (todo: ToDoItem) => {
    const isComplete = todo.item_kind === 'checklist'
      ? Boolean(todo.checklist_items?.length) && (todo.checklist_items || []).every((item) => item.is_complete)
      : todo.is_complete;
    if (isComplete) return { color: successColour };
    if (todo['due_date_&_time'] && new Date(todo['due_date_&_time']) < new Date()) return { color: dangerColour };
    if (settings?.todo.todo_soon_determiner && todo['due_date_&_time'] && new Date(todo['due_date_&_time']) <= new Date(Date.now() + settings.todo.todo_soon_determiner * 24 * 60 * 60 * 1000)) return { color: warningColour };
    return undefined;
  };

  const renderCard = (key: DashboardCardKey) => {
    switch (key) {
      case 'tasks':
        return info ? (
          <TouchableOpacity analyticsId="dashboard_tasks_card" analyticsControlType="card" onPress={() => replaceTopLevelRoute({ pathname: '/todo', params: { type: 'tasks' } })}>
            <Card style={styles.card}><View style={styles.cardTopline}><View style={[styles.statusDot, { backgroundColor: getDashboardStatusColour(info.todoStats) }]} /><Eyebrow>Tasks</Eyebrow></View><ThemedText type="subtitle" style={styles.cardTitle}>Tasks Overview</ThemedText><ThemedView style={styles.infoContainer}><ThemedView style={styles.cardItem}><ThemedText type="defaultSemiBold" style={styles.cardNumber}>{info.todoStats.total}</ThemedText><ThemedText style={styles.cardLabel}>Total</ThemedText></ThemedView><ThemedView style={styles.cardItem}><ThemedText type="defaultSemiBold" style={[styles.cardNumber, { color: successColour }]}>{info.todoStats.completed}</ThemedText><ThemedText style={styles.cardLabel}>Completed</ThemedText></ThemedView><ThemedView style={styles.cardItem}><ThemedText type="defaultSemiBold" style={[styles.cardNumber, { color: dangerColour }]}>{info.todoStats.overdue}</ThemedText><ThemedText style={styles.cardLabel}>Overdue</ThemedText></ThemedView><ThemedView style={styles.cardItem}><ThemedText type="defaultSemiBold" style={[styles.cardNumber, { color: warningColour }]}>{info.todoStats.dueSoonDate}</ThemedText><ThemedText style={styles.cardLabel}>Due Soon</ThemedText></ThemedView></ThemedView><ThemedText style={styles.tapHint}>Tap to view all tasks {'->'}</ThemedText></Card>
          </TouchableOpacity>
        ) : null;
      case 'checklists':
        return info ? (
          <TouchableOpacity analyticsId="dashboard_checklists_card" analyticsControlType="card" onPress={() => replaceTopLevelRoute({ pathname: '/todo', params: { type: 'checklists' } })}>
            <Card style={styles.card}><View style={styles.cardTopline}><View style={[styles.statusDot, { backgroundColor: getDashboardStatusColour(info.checklistStats) }]} /><Eyebrow>Checklists</Eyebrow></View><ThemedText type="subtitle" style={styles.cardTitle}>Checklists</ThemedText><ThemedView style={styles.infoContainer}><ThemedView style={styles.cardItem}><ThemedText type="defaultSemiBold" style={styles.cardNumber}>{info.checklistStats.total}</ThemedText><ThemedText style={styles.cardLabel}>Total</ThemedText></ThemedView><ThemedView style={styles.cardItem}><ThemedText type="defaultSemiBold" style={[styles.cardNumber, { color: successColour }]}>{info.checklistStats.completed}</ThemedText><ThemedText style={styles.cardLabel}>Completed</ThemedText></ThemedView><ThemedView style={styles.cardItem}><ThemedText type="defaultSemiBold" style={[styles.cardNumber, { color: dangerColour }]}>{info.checklistStats.overdue}</ThemedText><ThemedText style={styles.cardLabel}>Overdue</ThemedText></ThemedView><ThemedView style={styles.cardItem}><ThemedText type="defaultSemiBold" style={[styles.cardNumber, { color: warningColour }]}>{info.checklistStats.dueSoonDate}</ThemedText><ThemedText style={styles.cardLabel}>Due Soon</ThemedText></ThemedView></ThemedView>{checklistTodos.length === 0 ? <ThemedText style={styles.listItemText}>No checklists yet.</ThemedText> : checklistTodos.slice(0, 3).map((todo) => (<ThemedText key={todo.id} style={[styles.listItemText, getItemTextStyle(todo)]}>{todo.title}</ThemedText>))}<ThemedText style={styles.tapHint}>Tap to view all checklists {'->'}</ThemedText></Card>
          </TouchableOpacity>
        ) : null;
      case 'finances':
        return info ? <TouchableOpacity analyticsId="dashboard_budget_card" analyticsControlType="card" onPress={() => replaceTopLevelRoute('/budget')}><Card style={styles.card}><Eyebrow style={styles.cardEyebrow}>This month</Eyebrow><ThemedText type="subtitle" style={styles.cardTitle}>Finances</ThemedText><ThemedView style={styles.financeContainer}><ThemedView style={styles.financeRow}><ThemedText style={styles.financeLabel}>Income:</ThemedText><ThemedText style={[styles.financeAmount, { color: successColour }]}>{formatAmount(info.transactionStats.monthlyIncome)}</ThemedText></ThemedView><ThemedView style={styles.financeRow}><ThemedText style={styles.financeLabel}>Expenses:</ThemedText><ThemedText style={[styles.financeAmount, { color: dangerColour }]}>{formatAmount(info.transactionStats.monthlyExpenses)}</ThemedText></ThemedView><ThemedView style={[styles.financeRow, styles.balanceRow, { borderTopColor: borderColour }]}><ThemedText type="defaultSemiBold" style={styles.financeLabel}>Balance:</ThemedText><ThemedText type="defaultSemiBold" style={[styles.financeAmount, { color: info.transactionStats.balance >= 0 ? successColour : dangerColour }]}>{formatAmount(info.transactionStats.balance)}</ThemedText></ThemedView></ThemedView></Card></TouchableOpacity> : null;
      case 'appNews':
        return <Card style={styles.card}><Eyebrow style={styles.cardEyebrow}>App News</Eyebrow><ThemedText type="subtitle" style={styles.cardTitle}>Coming Soon</ThemedText><ThemedText style={styles.listItemText}>Job Search</ThemedText><ThemedText style={styles.listItemText}>Housing Search</ThemedText></Card>;
      case 'news':
        if (!isMyNewsRegionSupported) return null;
        return <TouchableOpacity analyticsId="dashboard_news_card" analyticsControlType="card" onPress={() => replaceTopLevelRoute('/myNews')}><Card style={styles.card}><Eyebrow style={styles.cardEyebrow}>My news</Eyebrow><ThemedText type="subtitle" style={styles.cardTitle}>Top 5 headlines</ThemedText><View style={styles.newsCategoryRow}>{NEWS_CATEGORIES.map((category) => (<TouchableOpacity analyticsId="app_index_news_category_chip" analyticsControlType="filter" key={category.key} style={[styles.newsCategoryChip, { borderColor: newsCategory === category.key ? cardBackground : borderColour, backgroundColor: newsCategory === category.key ? cardBackground : 'transparent' }]} onPress={() => setNewsCategory(category.key)}><ThemedText style={styles.newsCategoryText}>{category.label}</ThemedText></TouchableOpacity>))}</View>{dashboardHeadlines.map((article, index) => (<ThemedText key={article.id} numberOfLines={1} ellipsizeMode="tail" style={styles.listItemText}>{`${index + 1}. ${article.title}`}</ThemedText>))}</Card></TouchableOpacity>;
      case 'grades':
        return <TouchableOpacity analyticsId="dashboard_grades_card" analyticsControlType="card" onPress={() => router.push('/exams')}><Card style={styles.card}><Eyebrow style={styles.cardEyebrow}>Study</Eyebrow><ThemedText type="subtitle" style={styles.cardTitle}>Latest grades</ThemedText>{recentGrades.length === 0 ? <ThemedText style={styles.listItemText}>No grades added yet.</ThemedText> : recentGrades.map((item, index) => (<ThemedText key={item.id} style={styles.listItemText}>{`${index + 1}. ${item.subject} (${item.qualification_type}): ${item.grade}`}</ThemedText>))}</Card></TouchableOpacity>;
      case 'notes':
        return <TouchableOpacity analyticsId="dashboard_notes_card" analyticsControlType="card" onPress={() => replaceTopLevelRoute('/notes')}><Card style={styles.card}><Eyebrow style={styles.cardEyebrow}>Kept for later</Eyebrow><ThemedText type="subtitle" style={styles.cardTitle}>Recent notes</ThemedText>{recentNoteTitles.length === 0 ? <ThemedText style={styles.listItemText}>No notes yet.</ThemedText> : recentNoteTitles.map((title, index) => (<ThemedText key={`${title}-${index}`} style={styles.listItemText}>{`${index + 1}. ${title}`}</ThemedText>))}</Card></TouchableOpacity>;
      case 'lifenest':
        return <Card style={styles.card}><Eyebrow style={styles.cardEyebrow}>LifeNest</Eyebrow><ThemedText type="subtitle" style={styles.cardTitle}>Recent chats</ThemedText>{recentChats.length === 0 ? <TouchableOpacity analyticsId="app_index_life_nest_line" analyticsControlType="button" onPress={() => replaceTopLevelRoute('/lifenest')}><ThemedText style={styles.lifeNestLine}>No chat history yet ...</ThemedText></TouchableOpacity> : recentChats.map((chat, index) => (<TouchableOpacity analyticsId="app_index_life_nest_row" analyticsControlType="list_item" key={chat.id} style={styles.lifeNestRow} onPress={() => replaceTopLevelRoute({ pathname: '/lifenest', params: { conversationId: chat.id } })}><ThemedText style={styles.lifeNestLine}>{`${index + 1}. ${chat.title || 'New conversation'}`}</ThemedText></TouchableOpacity>))}</Card>;
      case 'movingOut':
        return <TouchableOpacity analyticsId="dashboard_moving_out_card" analyticsControlType="card" onPress={() => replaceTopLevelRoute({ pathname: '/todo', params: { premiumCategory: 'Moving Out' } })}><Card style={[styles.card, getMovingOutAccent({ total: movingOutTodos.length, completed: movingOutTodos.filter((todo) => todo.is_complete).length, overdue: movingOutTodos.filter((todo) => !todo.is_complete && todo['due_date_&_time'] && new Date(todo['due_date_&_time']) < new Date()).length, dueSoonDate: movingOutTodos.filter((todo) => !todo.is_complete && todo['due_date_&_time'] && settings?.todo.todo_soon_determiner && new Date(todo['due_date_&_time']) >= new Date() && new Date(todo['due_date_&_time']) <= new Date(Date.now() + settings.todo.todo_soon_determiner * 24 * 60 * 60 * 1000)).length })]}><Eyebrow style={styles.cardEyebrow}>Moving out</Eyebrow><ThemedText type="subtitle" style={styles.cardTitle}>Your checklist</ThemedText><ThemedText style={styles.listItemMeta}>Completion: {movingOutCompletion}%</ThemedText>{movingOutTodos.length === 0 ? <ThemedText style={styles.listItemText}>No moving out tasks yet.</ThemedText> : movingOutTodos.map((todo) => (<TouchableOpacity analyticsId="app_index_list_item_text" analyticsControlType="list_item" key={todo.id} onPress={() => router.push(`/todo/edit/${todo.id}`)}><ThemedText style={[styles.listItemText, getItemTextStyle(todo)]}>{todo.title}</ThemedText></TouchableOpacity>))}</Card></TouchableOpacity>;
      default:
        return null;
    }
  };

  if (loading && !info) {
    return <ThemedView style={styles.loadingContainer}><LoadingSpinner /></ThemedView>;
  }

  return (
    <ScrollView style={{ backgroundColor: backgroundColour }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <ThemedView style={styles.content} darkColour={backgroundColour} lightColour={backgroundColour}>
        {!editMode && info ? (
          <HeroCard style={styles.hero}>
            <View style={styles.heroTop}>
              <Eyebrow tone="hero">{todayLabel}</Eyebrow>
              {nextUpTodo ? (
                <View style={[styles.heroChip, { backgroundColor: heroSurface.chipBackground }]}>
                  <ThemedText style={[styles.heroChipText, { color: heroSurface.text }]}>
                    {nextUpDueLabel}
                  </ThemedText>
                </View>
              ) : null}
            </View>

            <ThemedText type="displaySmall" style={[styles.heroTitle, { color: heroSurface.text }]}>
              {greeting}, {userInfo?.first_name || 'there'}.
            </ThemedText>
            <ThemedText style={[styles.heroNote, { color: heroSurface.textSecondary }]}>
              {nextUpTodo ? nextUpTodo.title : 'Nothing outstanding. Enjoy the quiet.'}
            </ThemedText>

            <View style={[styles.heroFoot, { borderTopColor: heroSurface.border }]}>
              <ReadinessRing value={readiness} />
              <View style={styles.heroFootCopy}>
                <ThemedText style={[styles.heroFootValue, { color: heroSurface.text }]}>
                  {readiness}% ready
                </ThemedText>
                <ThemedText style={[styles.heroFootMeta, { color: heroSurface.textSecondary }]}>
                  {info.todoStats.completed} of {info.todoStats.total} sorted
                </ThemedText>
              </View>
              <TouchableOpacity
                analyticsId="dashboard_hero_open_tasks"
                analyticsControlType="button"
                style={[styles.heroAction, { backgroundColor: heroSurface.actionBackground }]}
                onPress={() => nextUpTodo ? router.push(`/todo/edit/${nextUpTodo.id}`) : replaceTopLevelRoute('/todo')}
              >
                <ThemedText style={[styles.heroActionText, { color: heroSurface.actionText }]}>
                  {nextUpTodo ? 'Open it' : 'View tasks'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </HeroCard>
        ) : null}

        <View style={styles.customizeHeader}>
          <Button analyticsId="app_index_set_tooltip_visible" title={editMode ? 'Done' : 'Customise'} onPress={editMode ? handleDone : () => {
            setDraftLayoutState(layoutState);
            setEditMode(true);
          }} variant="primary" loading={customizationSaving} disabled={customizationSaving} />
          {editMode && (
            <>
              <Button analyticsId="app_index_cancel" title="Cancel" variant="secondary" onPress={() => { setDraftLayoutState(layoutState); setEditMode(false); }} />
              <Button analyticsId="app_index_reset" title="Reset" variant="warning" onPress={() => setDraftLayoutState(dashboardCustomizationService.getDefaultLayout())} />
            </>
          )}
        </View>
        {editMode && <ThemedText style={styles.premiumTooltip}>Dashboard changes use 10 tokens when saved.</ThemedText>}

        {editMode && draftLayoutState.hidden.length > 0 && (
          <View style={styles.unhideWrap}>
            <ThemedText style={styles.label}>Unhide dashboard items</ThemedText>
            <View style={styles.unhideButtonsWrap}>
              {draftLayoutState.hidden.map((key) => (
                <Button analyticsId="app_index_toggle_hide"
                  key={key}
                  title={`Unhide ${CARD_LABELS[key]}`}
                  size="small"
                  variant="secondary"
                  onPress={() => toggleHide(key)}
                />
              ))}
            </View>
          </View>
        )}

        {editMode && draftLayoutState.order.map((key, index) => (
          <Card key={key} style={styles.editCard}>
            <ThemedText>{CARD_LABELS[key]}</ThemedText>
            <View style={styles.editActions}>
              <Button analyticsId="app_index_move_card" title="â†‘" size="small" variant="secondary" onPress={() => moveCard(index, -1)} />
              <Button analyticsId="app_index_move_card_2" title="â†“" size="small" variant="secondary" onPress={() => moveCard(index, 1)} />
              <Button analyticsId="app_index_toggle_hide_2" title={draftLayoutState.hidden.includes(key) ? 'Unhide' : 'Hide'} size="small" variant="secondary" onPress={() => toggleHide(key)} disabled={!draftLayoutState.hidden.includes(key) && draftLayoutState.order.length - draftLayoutState.hidden.length <= 2} />
            </View>
          </Card>
        ))}

        {!editMode && (
          <View style={styles.dashboardGrid}>
            {visibleOrder.map((key) => (
              <View key={key} style={useWideGrid ? styles.dashboardGridItemWide : styles.dashboardGridItemCompact}>
                {renderCard(key)}
              </View>
            ))}
          </View>
        )}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  cardTopline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 8,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  cardEyebrow: {
    marginBottom: 8,
  },
  hero: {
    marginBottom: 14,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  heroChipText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  heroTitle: {
    marginTop: 16,
  },
  heroNote: {
    marginTop: 8,
    marginBottom: 18,
    fontSize: 14,
    lineHeight: 21,
  },
  heroFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 15,
    borderTopWidth: 1,
  },
  heroFootCopy: {
    flex: 1,
    gap: 2,
  },
  heroFootValue: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0,
  },
  heroFootMeta: {
    fontSize: 12,
  },
  heroAction: {
    paddingHorizontal: 17,
    paddingVertical: 11,
    borderRadius: 999,
  },
  heroActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: Platform.OS === 'web' ? '70%' : 1200,
    alignSelf: 'center',
    padding: 10,
  },
  dashboardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  dashboardGridItemWide: {
    width: '48%',
    flexGrow: 1,
  },
  dashboardGridItemCompact: {
    width: '100%',
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
    letterSpacing: 0,
    fontWeight: '500',
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
    borderRadius: 19,
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
