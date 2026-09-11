import { TrackedTouchableOpacity as TouchableOpacity } from '@/components/ui/TrackedTouchableOpacity';
import React, { useState, useCallback, useMemo } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Card } from '@/components/ui/Card';
import { Chip, Eyebrow } from '@/components/ui/Surfaces';
import { ReadinessRing } from '@/components/ui/ReadinessRing';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Switch } from '@/components/ui/Switch';
import { useTodos } from '@/hooks/useTodos';
import { ToDoItem } from '@/types/todo';
import { todoService } from '@/services/todoService';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useThemeColour } from '@/hooks/useThemeColour';
import { useToDoSettings } from '@/hooks/useSettings';
import { formatDate, showAlert } from '@/hooks/dataHandler';

export default function TodoListScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const { premiumCategory, type } = useLocalSearchParams<{ premiumCategory?: string; type?: string }>();
  const [itemFilter, setItemFilter] = useState<'all' | 'tasks' | 'checklists'>(type === 'checklists' ? 'checklists' : type === 'tasks' ? 'tasks' : 'all');
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [sortBy, setSortBy] = useState<'dueDate' | 'title' | 'category'>('dueDate');
  const { todos, categories, premiumCategories, loading, fetchTodos, updateTodo, deleteToDo, } = useTodos();
  const backgroundColor = useThemeColour({}, 'background');
  const successColour = useThemeColour({}, 'success');
  const dangerColour = useThemeColour({}, 'danger');
  const warningColour = useThemeColour({}, 'warning');
  const primaryColour = useThemeColour({}, 'primary');
  const { data: todoSettings } = useToDoSettings();
  const soonDays = todoSettings?.todo_soon_determiner ?? 7;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchTodos();
    } finally {
      setRefreshing(false);
    }
  }, [fetchTodos]);

  const handleToggleComplete = async (todoId: number) => {
    try {
      const toDoItem = await todoService.getToDoItem(todoId)
      toDoItem.is_complete = !toDoItem?.is_complete
      await updateTodo({ id: todoId, data: toDoItem });
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleDelete = (todoId: number, title: string) => {
    showAlert('Delete Task', `Are you sure you want to delete "${title}"?`, [{ text: 'Cancel', onPress: undefined, style: 'cancel' }, {
      text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteToDo(todoId);
        } catch (error) {
          console.error('Failed to delete task:', error);
        }
      }
    }]);
  };

  const getCategoryName = useCallback((categoryId?: number | null) => {
    if (!categoryId) return 'Checklist';
    return categories?.find(c => c.id === categoryId)?.name || 'Unknown';
  }, [categories]);

  const isItemComplete = useCallback((todo: ToDoItem) => {
    if (todo.item_kind !== 'checklist') return todo.is_complete;
    return Boolean(todo.checklist_items?.length) && (todo.checklist_items || []).every((item) => item.is_complete);
  }, []);

  const filteredAndSortedTodos = useMemo(() => {
    if (!todos) return [];

    let filtered = todos;

    switch (itemFilter) {
      case 'tasks':
        filtered = filtered.filter((todo) => todo.item_kind !== 'checklist');
        break;
      case 'checklists':
        filtered = filtered.filter((todo) => todo.item_kind === 'checklist');
        break;
      default:
        break;
    }

    // Apply completion filter after the type filter so checklist item state is respected.
    switch (filter) {
      case 'pending':
        filtered = filtered.filter(todo => !isItemComplete(todo));
        break;
      case 'completed':
        filtered = filtered.filter(todo => isItemComplete(todo));
        break;
      default:
        break;
    }
    if (premiumCategory) {
      const categoryMatch = premiumCategories.find((item) => item.name === premiumCategory);
      if (categoryMatch) {
        filtered = filtered.filter((todo) => todo.premium_category_id === categoryMatch.id);
      }
    }

    // Apply sort
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'category':
          return getCategoryName(a.category_id).localeCompare(getCategoryName(b.category_id));
        case 'dueDate':
        default:
          if (!a['due_date_&_time'] && !b['due_date_&_time']) return 0;
          if (!a['due_date_&_time']) return 1;
          if (!b['due_date_&_time']) return -1;
          return new Date(a['due_date_&_time']).getTime() - new Date(b['due_date_&_time']).getTime();
      }
    });
  }, [todos, itemFilter, filter, sortBy, getCategoryName, premiumCategory, premiumCategories, isItemComplete]);

  const getTodoStatus = useCallback((todo: ToDoItem): 'completed' | 'overdue' | 'due-soon' | 'normal' => {
    if (isItemComplete(todo)) return 'completed';
    if (todo['due_date_&_time'] && new Date(todo['due_date_&_time']) < new Date()) return 'overdue';
    if (soonDays !== null && todo['due_date_&_time'] && new Date(todo['due_date_&_time']) <= new Date(Date.now() + soonDays * 24 * 60 * 60 * 1000)) return 'due-soon';
    return 'normal';
  }, [isItemComplete, soonDays]);

  const getStatusColour = useCallback((status: string) => {
    switch (status) {
      case 'completed': return successColour;
      case 'overdue': return dangerColour;
      case 'due-soon': return warningColour;
      case 'normal': return primaryColour;
      default: return primaryColour;
    }
  }, [successColour, dangerColour, warningColour, primaryColour]);

  if (loading && !todos) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <LoadingSpinner />
      </ThemedView>
    );
  }

  const doneCount = filteredAndSortedTodos.filter((todo) => getTodoStatus(todo) === 'completed').length;
  const openCount = filteredAndSortedTodos.length - doneCount;
  const completionPercent = filteredAndSortedTodos.length === 0
    ? 0 : Math.round((doneCount / filteredAndSortedTodos.length) * 100);

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <ThemedView style={[styles.content, { backgroundColor }]} >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Eyebrow>Your nest</Eyebrow>
          {premiumCategory ? (
            <ThemedText style={styles.filterTag}>Filtered: {premiumCategory}</ThemedText>
          ) : null}
        </View>
        <Button analyticsId="app_todo_index_add" title="Add" onPress={() => router.push('/todo/add')} size="small" />
      </View>

      <ScrollView style={styles.todoList} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <ThemedView style={styles.chipRail} lightColour="transparent" darkColour="transparent">
          {([
            ['all', 'All'], ['tasks', 'Tasks'], ['checklists', 'Checklists'],
          ] as const).map(([value, label]) => (
            <TouchableOpacity key={value} analyticsId="app_todo_index_item_filter" analyticsControlType="filter" onPress={() => setItemFilter(value)}>
              <Chip label={label} active={itemFilter === value} />
            </TouchableOpacity>
          ))}
        </ThemedView>

        <ThemedView style={styles.chipRail} lightColour="transparent" darkColour="transparent">
          {([
            ['all', 'Everything'],
            ['pending', 'Still to do'],
            ['completed', 'Sorted'],
          ] as const).map(([value, label]) => (
            <TouchableOpacity
              key={value}
              analyticsId="app_todo_index_status_filter"
              analyticsControlType="filter"
              onPress={() => setFilter(value)}
            >
              <Chip label={label} active={filter === value} />
            </TouchableOpacity>
          ))}
        </ThemedView>

        <ThemedView style={styles.chipRail} lightColour="transparent" darkColour="transparent">
          {([
            ['dueDate', 'By due date'],
            ['title', 'By title'],
            ['category', 'By category'],
          ] as const).map(([value, label]) => (
            <TouchableOpacity
              key={value}
              analyticsId="app_todo_index_sort"
              analyticsControlType="filter"
              onPress={() => setSortBy(value)}
            >
              <Chip label={label} active={sortBy === value} />
            </TouchableOpacity>
          ))}
        </ThemedView>

        <Card style={styles.progressCard}>
          <ThemedView style={styles.progressStats} lightColour="transparent" darkColour="transparent">
            <ThemedView style={styles.progressStat} lightColour="transparent" darkColour="transparent">
              <Eyebrow>Still to do</Eyebrow>
              <ThemedText type="metric" style={styles.progressValue}>{openCount}</ThemedText>
            </ThemedView>
            <ThemedView style={styles.progressStat} lightColour="transparent" darkColour="transparent">
              <Eyebrow>Sorted</Eyebrow>
              <ThemedText type="metric" style={styles.progressValue}>{doneCount}</ThemedText>
            </ThemedView>
            <ReadinessRing
              value={completionPercent}
              fraction={{ numerator: doneCount, denominator: filteredAndSortedTodos.length }}
              tone="page"
            />
          </ThemedView>
        </Card>

        {/* Todo List */}
        {filteredAndSortedTodos.length === 0 ? (
          <Card style={styles.emptyCard}>
            <ThemedText style={styles.emptyText}>
              {itemFilter === 'tasks' ? 'No tasks match these filters.' : itemFilter === 'checklists' ? 'No checklists match these filters.' : filter === 'all' ? 'No tasks or checklists yet. Add your first one!' : filter === 'pending' ? 'No pending items!' : 'No completed items yet.'}
            </ThemedText>
          </Card>
        ) : (
          filteredAndSortedTodos.map((todo) => {
            const status = getTodoStatus(todo);
            const statusColour = getStatusColour(status);
            return (
              <TouchableOpacity analyticsId="todo_open_item" analyticsControlType="list_item" key={todo.id} onPress={() => router.push(`/todo/edit/${todo.id}`)} >
                <Card style={styles.todoCard}>
                  <View style={styles.todoHeader}>
                    <View style={styles.todoInfo}>
                      <View style={styles.todoTopline}>
                        <View style={[styles.statusDot, statusColour ? { backgroundColor: statusColour } : null]} />
                        <Eyebrow>{getCategoryName(todo.category_id)}</Eyebrow>
                      </View>
                      {todo.item_kind === 'checklist' ? (
                        <>
                          <ThemedText style={[styles.todoTitle, status === 'completed' && styles.completedTitle]}>{todo.title}</ThemedText>
                          <ThemedText style={[styles.todoDescription, status === 'completed' && styles.completedText]}>
                            {(todo.checklist_items || []).filter((item) => item.is_complete).length} of {(todo.checklist_items || []).length} items complete
                          </ThemedText>
                        </>
                      ) : (
                        <>
                          <ThemedText style={[styles.todoTitle, todo.is_complete && styles.completedTitle]}>{todo.title}</ThemedText>
                          <Switch value={todo.is_complete} label="Complete" labelStyle={styles.completeLabel} description={['Target:', todo.description, todo.unit].filter(Boolean).join(' ').trim()}
                            descriptionStyle={[styles.todoDescription, todo.is_complete && styles.completedText]} onValueChange={() => handleToggleComplete(todo.id)} />
                          <ProgressBar percentage={toProgressPercent(todo.progress, todo.description)} />
                        </>
                      )}
                    </View>
                  </View>
                  <View style={styles.todoFooter}>
                    {todo['due_date_&_time'] && (
                      <ThemedText style={[styles.dueDate, statusColour && { color: statusColour }]}>
                        Due: {formatDate(todo['due_date_&_time'])}
                      </ThemedText>
                    )}
                    <TouchableOpacity analyticsId="todo_delete_item" analyticsControlType="icon" onPress={() => handleDelete(todo.id, todo.title)} style={styles.deleteButton}>
                      <ThemedText style={[styles.deleteText, { color: dangerColour }]}>Delete</ThemedText>
                    </TouchableOpacity>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
      </ThemedView>
    </ThemedView>
  );
}

/** Progress is a fraction of the target when the target is numeric, else the raw value. */
function toProgressPercent(progress: unknown, target: unknown): number {
  const current = Number(progress);
  const goal = Number(target);
  if (!Number.isFinite(current)) return 0;
  if (!Number.isFinite(goal) || goal <= 0) return Math.max(0, Math.min(100, current));
  return Math.max(0, Math.min(100, (current / goal) * 100));
}

const styles = StyleSheet.create({
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  chipRail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 16,
  },
  progressCard: {
    marginTop: 6,
    marginBottom: 18,
  },
  progressStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  progressStat: {
    gap: 3,
  },
  progressValue: {
    fontSize: 26,
    lineHeight: 30,
  },
  headerEyebrow: {
    marginBottom: 6,
  },
  cardEyebrow: {
    marginBottom: 6,
  },
  container: {
    width:"100%",
    flex: 1,
  },
    content: {
    width: Platform.OS === 'web' ? '70%' : '100%',
        alignSelf: 'center',
        flex:1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    letterSpacing: 0,
    fontWeight: '500',
  },
  filterTag: {
    fontSize: 12,
    opacity: 0.7,
  },
  filtersCard: {
    marginTop: 8,
    padding: 4,
  },
  filtersTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    width: 55,
  },
  filterButtons: {
    flexDirection: 'row',
    flex: 1,
    gap: 5,
  },
  filterButton: {
    flex: 1,
  },
  todoList: {

    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.6,
  },
  todoTopline: {
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
  todoCard: {
    padding: 8,
    marginBottom: 12,
  },
  todoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  todoInfo: {
    flex: 1,
  },
  todoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  completeLabel: {
    fontSize: 14,
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  todoCategory: {
    fontSize: 20,
    opacity: 0.8,
    textTransform: 'uppercase',
    fontWeight: '500',
    textDecorationLine: 'underline'
  },
  todoDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  completedText: {
    opacity: 0.6,
  },
  todoFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dueDate: {
    fontSize: 12,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 8,
  },
  deleteText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
