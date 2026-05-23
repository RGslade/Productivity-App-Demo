import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Switch } from '@/components/ui/Switch';
import { useTodos } from '@/hooks/useTodos';
import { ToDoItem } from '@/types/todo';
import { todoService } from '@/services/todoService';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useThemeColour } from '@/hooks/useThemeColour';
import {settingsService} from '@/services/settingsService';
import { formatDate, showAlert } from '@/hooks/dataHandler';

//
export default function TodoListScreen() {
  //
  const [refreshing, setRefreshing] = useState(false);
  //
  const { premiumCategory, type } = useLocalSearchParams<{ premiumCategory?: string; type?: string }>();
  //
  const [itemFilter, setItemFilter] = useState<'all' | 'tasks' | 'checklists'>(type === 'checklists' ? 'checklists' : type === 'tasks' ? 'tasks' : 'all');
  //
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  //
  const [sortBy, setSortBy] = useState<'dueDate' | 'title' | 'category'>('dueDate');
  //
  const { todos, categories, premiumCategories, loading, fetchTodos, updateTodo, deleteToDo, } = useTodos();
  //
  const backgroundColor = useThemeColour({}, 'background');
  //
  const [soonDays, setSoonDays] = useState<number | null>(null);
  //
  useEffect(() => { fetchTodos(); }, [fetchTodos]);
  //
  useEffect(() => { settingsService.getToDoSoonDays?.().then(setSoonDays); }, []);

  //
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    //
    try {
      await fetchTodos();
    } finally {
      setRefreshing(false);
    }
  }, [fetchTodos]);

  //
  const handleToggleComplete = async (todoId: number) => {
    //
    try {
      //
      const toDoItem = await todoService.getToDoItem(todoId)
      toDoItem.is_complete = !toDoItem?.is_complete
      await updateTodo({ id: todoId, data: toDoItem });
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  //
  const handleDelete = (todoId: number, title: string) => {
    showAlert('Delete Task', `Are you sure you want to delete "${title}"?`, [{ text: 'Cancel', onPress: undefined, style: 'cancel' }, {
      text: 'Delete', style: 'destructive', onPress: async () => {
        //
        try {
          await deleteToDo(todoId);
        } catch (error) {
          console.error('Failed to delete task:', error);
        }
      }
    }]);
  };

  //
  const getCategoryName = useCallback((categoryId?: number | null) => {
    //
    if (!categoryId) return 'Checklist';
    return categories?.find(c => c.id === categoryId)?.name || 'Unknown';
  }, [categories]);

  //
  const isItemComplete = useCallback((todo: ToDoItem) => {
    //
    if (todo.item_kind !== 'checklist') return todo.is_complete;
    return Boolean(todo.checklist_items?.length) && (todo.checklist_items || []).every((item) => item.is_complete);
  }, []);

  //
  const filteredAndSortedTodos = useMemo(() => {
    //
    if (!todos) return [];

    //
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
    //
    if (premiumCategory) {
      //
      const categoryMatch = premiumCategories.find((item) => item.name === premiumCategory);
      //
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
          //
          if (!a['due_date_&_time'] && !b['due_date_&_time']) return 0;
          //
          if (!a['due_date_&_time']) return 1;
          //
          if (!b['due_date_&_time']) return -1;
          return new Date(a['due_date_&_time']).getTime() - new Date(b['due_date_&_time']).getTime();
      }
    });
  }, [todos, itemFilter, filter, sortBy, getCategoryName, premiumCategory, premiumCategories, isItemComplete]);

  //
  const getTodoStatus = useCallback((todo: ToDoItem): 'completed' | 'overdue' | 'due-soon' | 'normal' => {
    //
    if (isItemComplete(todo)) return 'completed';
    //
    if (todo['due_date_&_time'] && new Date(todo['due_date_&_time']) < new Date()) return 'overdue';
    //
    if (soonDays !== null && todo['due_date_&_time'] && new Date(todo['due_date_&_time']) <= new Date(Date.now() + soonDays * 24 * 60 * 60 * 1000)) return 'due-soon';
    return 'normal';
  }, [isItemComplete, soonDays]);

  //
  const getStatusColour = useCallback((status: string) => {
    switch (status) {
      case 'completed': return '#22C55E';
      case 'overdue': return '#EF4444';
      case 'due-soon': return '#F59E0B';
      case 'normal': return '#3B82F6';
      default: return '#3B82F6';
    }
  }, []);

  //
  const setCardBorderColour = useCallback(
    (statusColour: string) => ({
      borderWidth: 0,
      borderLeftWidth: 4,
      borderColor: statusColour,
    }),
    []
  );

  //
  if (loading && !todos) {
    //
    return (
      <ThemedView style={styles.loadingContainer}>
        <LoadingSpinner />
      </ThemedView>
    );
  }

  //
  if (soonDays === null) {
    return <ThemedView style={styles.loadingContainer}><LoadingSpinner /></ThemedView>;
  }
  //
  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <View style={styles.header}>
        <View>
          <ThemedText type="title" style={styles.title}>
            Tasks & Checklists
          </ThemedText>
          {premiumCategory ? (
            <ThemedText style={styles.filterTag}>Filtered: {premiumCategory}</ThemedText>
          ) : null}
        </View>
        <Button title="Add" onPress={() => router.push('/todo/add')} size="small" />
      </View>

      <ScrollView style={styles.todoList} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Card style={styles.filtersCard}>
          <ThemedText type="subtitle" style={styles.filtersTitle}>
            Filter & Sort
          </ThemedText>

          <View style={styles.filterRow}>
            <ThemedText style={styles.filterLabel}>Type:</ThemedText>
            <View style={styles.filterButtons}>
              <Button title="All" variant={itemFilter === 'all' ? 'primary' : 'secondary'} size="small" onPress={() => setItemFilter('all')} style={styles.filterButton} />
              <Button title="Tasks" variant={itemFilter === 'tasks' ? 'primary' : 'secondary'} size="small" onPress={() => setItemFilter('tasks')} style={styles.filterButton} />
              <Button title="Checklists" variant={itemFilter === 'checklists' ? 'primary' : 'secondary'} size="small" onPress={() => setItemFilter('checklists')} style={styles.filterButton} />
            </View>
          </View>

          <View style={styles.filterRow}>
            <ThemedText style={styles.filterLabel}>Show:</ThemedText>
            <View style={styles.filterButtons}>
              <Button title="All" variant={filter === 'all' ? 'primary' : 'secondary'} size="small"
                onPress={() => setFilter('all')} style={styles.filterButton}
              />
              <Button title="Pending" variant={filter === 'pending' ? 'primary' : 'secondary'} size="small" onPress={() => setFilter('pending')}
                style={styles.filterButton}
              />
              <Button title="Completed" variant={filter === 'completed' ? 'primary' : 'secondary'}
                size="small" onPress={() => setFilter('completed')} style={styles.filterButton}
              />
            </View>
          </View>

          <View style={styles.filterRow}>
            <ThemedText style={styles.filterLabel}>Sort by:</ThemedText>
            <View style={styles.filterButtons}>
              <Button title="Due Date" variant={sortBy === 'dueDate' ? 'primary' : 'secondary'}
                size="small" onPress={() => setSortBy('dueDate')} style={styles.filterButton}
              />
              <Button title="Title" variant={sortBy === 'title' ? 'primary' : 'secondary'}
                size="small" onPress={() => setSortBy('title')} style={styles.filterButton}
              />
              <Button title="Category" variant={sortBy === 'category' ? 'primary' : 'secondary'}
                size="small" onPress={() => setSortBy('category')} style={styles.filterButton}
              />
            </View>
          </View>
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
            //
            const status = getTodoStatus(todo);
            //
            const statusColour = getStatusColour(status);
            //
            const Cardborder = setCardBorderColour(statusColour);
            //
            return (
              <TouchableOpacity key={todo.id} onPress={() => router.push(`/todo/edit/${todo.id}`)} >
                <Card style={[styles.todoCard, Cardborder && { borderWidth: Cardborder.borderWidth, borderColor: Cardborder.borderColor, borderLeftWidth: Cardborder.borderLeftWidth }]}>
                  <View style={styles.todoHeader}>
                    <View style={styles.todoInfo}>
                      <ThemedText style={styles.todoCategory} type={'default'}>
                        {getCategoryName(todo.category_id)}
                      </ThemedText>
                      {todo.item_kind === 'checklist' ? (
                        <>
                          <ThemedText style={[styles.todoTitle, status === 'completed' && styles.completedTitle]}>{todo.title}</ThemedText>
                          <ThemedText style={[styles.todoDescription, status === 'completed' && styles.completedText]}>
                            {(todo.checklist_items || []).filter((item) => item.is_complete).length} of {(todo.checklist_items || []).length} items complete
                          </ThemedText>
                        </>
                      ) : (
                        <>
                          <Switch value={todo.is_complete} label={todo.title} labelStyle={[styles.todoTitle, todo.is_complete && styles.completedTitle]} description={'Target: ' + todo.description + ' ' + todo.unit}
                            descriptionStyle={[styles.todoDescription, todo.is_complete && styles.completedText]} onValueChange={() => handleToggleComplete(todo.id)} />
                          <ProgressBar percentage={Number(todo.progress) / Number(todo.description) * 100} />
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
                    <TouchableOpacity onPress={() => handleDelete(todo.id, todo.title)} style={styles.deleteButton}>
                      <ThemedText style={styles.deleteText}>Delete</ThemedText>
                    </TouchableOpacity>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </ThemedView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
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
    color: '#EF4444',
    fontWeight: '500',
  },
});