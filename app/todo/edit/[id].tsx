import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import DateTimePicker from "@/components/ui/AppDatePicker";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useTodos } from "@/hooks/useTodos";
import { goBackOrReplace } from "@/services/navigationService";
import {
  ChecklistItem,
  normalizeToDoMeasurementType,
  ToDoItemKind,
  ToDoTypes,
  ToDoMeasurementType,
  UpdateToDoRequest,
} from "@/types/todo";
import { TriOptionsButton } from "@/components/ui/TriOptionsButton";
import { Switch } from "@/components/ui";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatDate, showAlert } from "@/hooks/dataHandler";
import {
  createTokenOperationId,
  tokenUsageService,
} from "@/services/tokenUsageService";
import { showTokenUsageToast } from "@/services/tokenToastService";

type EditableChecklistItem = Omit<ChecklistItem, "id"> & { id?: number };

export default function EditTodoScreen() {
  const { id } = useLocalSearchParams();
  const todoId = parseInt(id as string);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [premiumCategoryId, setPremiumCategoryId] = useState<number | null>(
    null,
  );
  const [originalPremiumCategoryId, setOriginalPremiumCategoryId] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const {
    categories,
    premiumCategories,
    categoriesLoading,
    categoriesError,
    updateTodo,
    fetchCategories,
    fetchTodos,
  } = useTodos();
  const [unit, setUnit] = useState("");
  const [remindMe, setRemindMe] = useState(false);
  const [selected, setSelected] = useState<ToDoMeasurementType>(ToDoTypes[0]);
  const [progress, setProgress] = useState("0");
  const [itemKind, setItemKind] = useState<ToDoItemKind>("task");
  const [checklistItems, setChecklistItems] = useState<EditableChecklistItem[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState("");

  const loadData = useCallback(async () => {
    try {
      await fetchCategories();
      const todosResult = await fetchTodos();

      // Find the todo to edit
      const todo = todosResult.data?.find((t) => t.id === todoId);
      if (todo) {
        setTitle(todo.title);
        setDescription(todo.description);
        setCategoryId(todo.category_id);
        setPremiumCategoryId(todo.premium_category_id ?? null);
        setOriginalPremiumCategoryId(todo.premium_category_id ?? null);
        setDueDate(
          todo["due_date_&_time"] ? new Date(todo["due_date_&_time"]) : null,
        );
        setIsComplete(todo.is_complete);
        setUnit(todo.unit || "");
        setRemindMe(todo.remind_me);
        setProgress(todo.progress.toString());
        setSelected(normalizeToDoMeasurementType(todo.type));
        setItemKind(todo.item_kind === "checklist" ? "checklist" : "task");
        setChecklistItems(todo.checklist_items || []);
      } else {
        showAlert("Error", "Task not found", [
          { text: "OK", onPress: () => goBackOrReplace('/todo') },
        ]);
      }
    } catch (error) {
      console.error("Failed to load task data:", error);
      showAlert("Error", "Could not load this task. Please try again.");
    } finally {
      setInitialLoading(false);
    }
  }, [fetchCategories, fetchTodos, todoId]);

  useEffect(() => {
    if (initialLoading) void loadData();
  }, [initialLoading, loadData]);

  const handleSave = async () => {
    if (!title.trim()) {
      showAlert("Error", "Please enter a title for the task");
      return;
    }

    if (itemKind === "task") {
      if (!unit && selected !== "Â£$â‚¬") {
        showAlert("Error", "Please select a unit");
        return;
      }

      if (
        (selected === "123" || selected === "Â£$â‚¬") &&
        !/^\d+(\.\d+)?$/.test(description.trim())
      ) {
        showAlert(
          "Error",
          selected === "Â£$â‚¬"
            ? "Please enter a valid currency amount"
            : "Please enter a valid numerical milestone",
        );
        return;
      }

      if (
        selected === "%" &&
        (!/^\d+(\.\d+)?$/.test(description.trim()) ||
          Number(description) < 0 ||
          Number(description) > 100)
      ) {
        showAlert("Error", "Please enter a percentage between 0 and 100");
        return;
      }

      if (!/^\d+(\.\d+)?$/.test(progress.trim())) {
        showAlert("Error", "Please enter a valid number");
        return;
      }

      if (!description.trim()) {
        showAlert("Error", "Please enter a description for the task");
        return;
      }

      if (!categoryId) {
        showAlert("Error", "Please select a category");
        return;
      }
    }

    setLoading(true);
    const premiumCategoryChanged =
      itemKind === "task" &&
      premiumCategoryId !== originalPremiumCategoryId;
    let premiumSpend: Awaited<
      ReturnType<typeof tokenUsageService.spend>
    > | null = null;
    try {
      if (premiumCategoryChanged && premiumCategoryId !== null) {
        premiumSpend = await tokenUsageService.spend({
          feature: "premium_todo_category",
          operationId: createTokenOperationId(`todo-category-${todoId}`),
        });
      }
      const todoData: UpdateToDoRequest =
        itemKind === "checklist"
          ? {
              title: title.trim(),
              description: "",
              is_complete:
                checklistItems.length > 0 &&
                checklistItems.every((item) => item.is_complete),
              due_date_time: dueDate?.toISOString(),
              checklist_items: checklistItems.map((item, index) => ({
                ...(item.id !== undefined ? { id: item.id } : {}),
                text: item.text,
                is_complete: item.is_complete,
                position: index,
              })),
            }
          : {
              title: title.trim(),
              description: description.trim(),
              category_id: categoryId,
              due_date_time: dueDate?.toISOString(),
              is_complete: isComplete,
              unit: unit?.trim() || undefined,
              remind_me: remindMe,
              progress: Number.parseFloat(progress),
              premium_category_id: premiumCategoryId,
            };

      await updateTodo({ id: todoId, data: todoData });
      if (premiumSpend) showTokenUsageToast(premiumSpend.tokens);
      showAlert("Success", "Task updated successfully!", [
        {
          text: "OK",
          onPress: () => goBackOrReplace('/todo'),
        },
      ]);
    } catch (error) {
      if (premiumSpend)
        await tokenUsageService.refund(premiumSpend).catch(() => undefined);
      console.error("Failed to update task:", error);
      showAlert("Error", "Could not update this task. Please try again.");
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

  const clearDate = () => {
    setDueDate(null);
  };

  /** Adds a new checklist item to the edit draft. */
  const handleAddChecklistItem = () => {
    const text = newChecklistItem.trim();
    if (!text) return;
    setChecklistItems((current) => [...current, {
      todo_id: todoId,
      user_id: 0,
      text,
      is_complete: false,
      position: current.length,
      created_at: new Date().toISOString(),
    }]);
    setNewChecklistItem("");
  };

  /** Updates a checklist item's text in the edit draft. */
  const updateChecklistItem = (index: number, value: string) => {
    setChecklistItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, text: value } : item));
  };

  /** Removes a checklist item from the edit draft. */
  const removeChecklistItem = (index: number) => {
    setChecklistItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  if (initialLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <LoadingSpinner />
      </ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      enabled={Platform.OS === "ios"}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView style={styles.scrollView}>
        <ThemedView style={styles.content}>
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              {itemKind === "checklist" ? "Edit Checklist" : "Edit Task"}
            </ThemedText>
          </View>
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Input
                placeholder={itemKind === "checklist" ? "Enter checklist title" : "Enter task title"}
                label="Title"
                required={true}
                labelStyle={styles.label}
                value={title}
                onChangeText={setTitle}
                keyboardType="default"
                autoCapitalize="none"
                autoCorrect={true}
                style={styles.input}
              />
            </View>
            {itemKind === "checklist" ? (
              <>
                <View style={styles.inputGroup}>
                  <ThemedText style={styles.label}>Due By</ThemedText>
                  <View style={styles.dateContainer}>
                    <Button
                      analyticsId="app_todo_edit_item_set_show_date_picker"
                      title={
                        dueDate
                          ? formatDate(dueDate.toString())
                          : "Select Due By"
                      }
                      variant="secondary"
                      onPress={() => setShowDatePicker(true)}
                      style={styles.dateButton}
                    />
                    {dueDate && (
                      <Button
                        analyticsId="app_todo_edit_item_clear_2"
                        title="Clear"
                        variant="danger"
                        size="small"
                        onPress={clearDate}
                        style={styles.clearButton}
                      />
                    )}
                  </View>
                  {showDatePicker && (
                    <DateTimePicker
                      value={dueDate || new Date()}
                      mode="date"
                      display="default"
                      onValueChange={handleDateChange}
                      minimumDate={new Date()}
                    />
                  )}
                </View>
                <View style={styles.inputGroup}>
                  <ThemedText style={styles.label}>Checklist Items</ThemedText>
                  <Input label="Checklist item" labelStyle={styles.label} placeholder="Enter an item" value={newChecklistItem} onChangeText={setNewChecklistItem} style={styles.input} onSubmitEditing={handleAddChecklistItem} />
                  <Button analyticsId="app_todo_edit_add_item" title="Add Item" variant="secondary" onPress={handleAddChecklistItem} disabled={!newChecklistItem.trim()} />
                  {checklistItems.map((item, index) => (
                    <View key={item.id !== undefined ? `checklist-item-${item.id}` : `new-checklist-item-${index}`} style={styles.checklistRow}>
                      <Input label={`Item ${index + 1}`} labelStyle={styles.label} placeholder="Checklist item" value={item.text} onChangeText={(value) => updateChecklistItem(index, value)} style={styles.input} />
                      <View style={styles.checklistActions}>
                        <Switch
                          label="Complete"
                          labelStyle={styles.checklistLabel}
                          value={item.is_complete}
                          onValueChange={(value) => setChecklistItems((current) => current.map((currentItem, currentIndex) => currentIndex === index ? { ...currentItem, is_complete: value } : currentItem))}
                        />
                        <Button analyticsId="app_todo_edit_remove_item" title="Remove" variant="danger" size="small" onPress={() => removeChecklistItem(index)} />
                      </View>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <>
                <ThemedText style={styles.label}>Measurement type</ThemedText>
                <TriOptionsButton
                  analyticsId="todo_edit_task_type"
                  options={[...ToDoTypes]}
                  containerStyle={styles.inputGroup}
                  onSelect={(value) =>
                    setSelected(value as ToDoMeasurementType)
                  }
                  selectedOption={selected}
                  enabled={false}
                />
                {selected === "123" ? (
                  <>
                    <View style={styles.inputGroup}>
                      <Input
                        label="Milestone"
                        required={true}
                        labelStyle={styles.label}
                        placeholder="Task milestone e.g. miles ran/jobs applied for"
                        keyboardType={"decimal-pad"}
                        value={description}
                        onChangeText={(value) =>
                          /^\d*(\.\d*)?$/.test(value) && setDescription(value)
                        }
                        style={[styles.input]}
                      />
                    </View>
                    <View style={styles.inputGroup}>
                      <Input
                        label="Unit"
                        required={true}
                        labelStyle={styles.label}
                        placeholder="Enter milestone unit"
                        value={unit}
                        onChangeText={setUnit}
                        style={styles.input}
                      />
                    </View>
                    <View style={styles.inputGroup}>
                      <Input
                        label="Progress"
                        labelStyle={styles.label}
                        placeholder="Enter the progress made so far"
                        keyboardType={"number-pad"}
                        style={styles.input}
                        value={progress}
                        onChangeText={setProgress}
                      />
                      <ThemedText style={{ fontSize: 12, color: "#6b7280" }}>
                        Enter the progress made so far
                      </ThemedText>
                    </View>
                  </>
                ) : selected === "%" ? (
                  <>
                    <View style={styles.inputGroup}>
                      <Input label="Percentage" required={true} labelStyle={styles.label} placeholder="Enter task percentage"
                        value={description} onChangeText={(value) => /^\d*(\.\d*)?$/.test(value) && setDescription(value)}
                        keyboardType={"decimal-pad"} style={styles.input}/>
                    </View>
                    <View style={styles.inputGroup}>
                      <Input label="Unit" required={true} labelStyle={styles.label} placeholder="Enter percentage unit"
                        value={unit} onChangeText={setUnit} style={styles.input}/>
                    </View>
                    <View style={styles.inputGroup}>
                      <Input label="Progress" labelStyle={styles.label} placeholder="Enter the progress made so far"
                        keyboardType={"number-pad"} style={styles.input} value={progress} onChangeText={setProgress}/>
                    </View>
                  </>
                ) : selected === "Â£$â‚¬" ? (
                  <>
                    <View style={styles.inputGroup}>
                      <Input label="Milestone" required={true} labelStyle={styles.label} placeholder="Task milestone e.g. Amount saved"
                        value={description} onChangeText={(value) => /^\d*(\.\d*)?$/.test(value) && setDescription(value)}
                        keyboardType="decimal-pad" style={styles.input}/>
                    </View>
                    <View style={styles.inputGroup}>
                      <Input label="Amount" required={true} labelStyle={styles.label} placeholder="Enter currency amount"
                        value={description} onChangeText={(value) => /^\d*(\.\d*)?$/.test(value) && setDescription(value)}
                        keyboardType={"decimal-pad"} style={styles.input} />
                    </View>
                  </>
                ) : selected === "âœ“ / âœ•" || selected === "Abc" ? (
                  <View style={styles.inputGroup}>
                    <Input label="Description" required={true} labelStyle={styles.label} placeholder="Enter task description"
                      value={description} onChangeText={setDescription} multiline numberOfLines={3} style={[styles.input, styles.textArea]} />
                  </View>
                ) : (
                  <View style={styles.inputGroup}>
                    <Input label="Description" required={true} labelStyle={styles.label} placeholder="Enter task description" value={description} onChangeText={setDescription} style={styles.input} />
                  </View>
                )}
                <View style={styles.inputGroup}>
                  <ThemedText style={styles.label}>Category *</ThemedText>
                  {categoriesError ? <ThemedText style={styles.errorText}>Categories could not be loaded. Please try again.</ThemedText> : null}
                  {categoriesLoading ? <ThemedText style={styles.helperText}>Loading categories...</ThemedText> : null}
                  <View style={styles.categoryButtons}>
                    {categories?.map((category) => (
                      <Button
                        analyticsId="app_todo_edit_item_set_category_id"
                        key={category.id}
                        title={category.name}
                        variant={categoryId === category.id ? "primary" : "secondary"}
                        size="small"
                        onPress={() => setCategoryId(category.id)}
                        style={styles.categoryButton}
                      />
                    ))}
                  </View>
                </View>
                <View style={styles.inputGroup}>
                  <ThemedText style={styles.label}>
                    Premium Categories/Types
                  </ThemedText>
                  <View style={styles.categoryButtons}>
                    {premiumCategories?.map((category) => (
                      <Button
                        analyticsId="app_todo_edit_item_set_premium_category_id"
                        key={category.id}
                        title={category.name}
                        variant={premiumCategoryId === category.id ? "primary" : "secondary"}
                        size="small"
                        onPress={() =>
                          setPremiumCategoryId((prev) =>
                            prev === category.id ? null : category.id,
                          )
                        }
                        style={styles.categoryButton}
                      />
                    ))}
                  </View>
                </View>
                <View style={styles.inputGroup}>
                  <ThemedText style={styles.label}>Due Date</ThemedText>
                  <View style={styles.dateContainer}>
                    <Button analyticsId="app_todo_edit_item_set_show_date_picker_2" title={dueDate ? formatDate(dueDate.toString()) : "Select Due Date" }
                      variant="secondary"
                      onPress={() => setShowDatePicker(true)}
                      style={styles.dateButton}
                    />
                    {dueDate && (
                      <Button
                        analyticsId="app_todo_edit_item_clear_2"
                        title="Clear"
                        variant="danger"
                        size="small"
                        onPress={clearDate}
                        style={styles.clearButton}
                      />
                    )}
                  </View>
                  {showDatePicker && (
                    <DateTimePicker
                      value={dueDate || new Date()}
                      mode="date"
                      display="default"
                      onValueChange={handleDateChange}
                      minimumDate={new Date()}
                    />
                  )}
                </View>
                <View style={styles.inputGroup}>
                  <Switch
                    label="Reminder"
                    description="Enable reminders for this task"
                    value={remindMe}
                    onValueChange={setRemindMe}
                  />
                </View>
                {selected !== "âœ“ / âœ•" && selected !== "Abc" && (
                  <ProgressBar
                    percentage={(Number(progress) / Number(description)) * 100}
                  />
                )}
                <View style={styles.inputGroup}>
                  <View style={styles.statusRow}>
                    <ThemedText style={styles.label}>Task Status</ThemedText>
                    <Button
                      analyticsId="app_todo_edit_item_set_is_complete"
                      title={isComplete ? "Completed" : "Pending"}
                      variant={isComplete ? "success" : "warning"}
                      size="small"
                      onPress={() => setIsComplete(!isComplete)}
                      style={styles.statusButton}
                    />
                  </View>
                </View>
              </>
            )}
            <View style={styles.actions}>
              <Button
                analyticsId="app_todo_edit_item_cancel" title="Cancel" variant="secondary" onPress={() => goBackOrReplace('/todo')} style={styles.cancelButton} />
              <Button
                analyticsId="app_todo_edit_item_handle_save"
                title={loading ? "Updating..." : itemKind === "checklist" ? "Update Checklist" : "Update Task"
                }
                onPress={handleSave}
                loading={loading}
                disabled={loading || !title.trim() || (itemKind === "task" && !categoryId)
                }
                style={styles.saveButton}
              />
            </View>
          </View>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    width: "100%",
    maxWidth: 1200,
    alignSelf: "center",
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
    width: Platform.OS === "web" ? "70%" : undefined,
    alignSelf: "center",
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
  },
  card: {
    padding: 20,
    marginBottom: 24,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
  },
  helperText: {
    fontSize: 13,
    opacity: 0.72,
  },
  errorText: {
    fontSize: 13,
    color: "#B4472F",
  },
  input: {
    minHeight: 44,
  },
  checklistLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  checklistRow: {
    gap: 8,
  },
  checklistActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  categoryButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryButton: {
    minWidth: 100,
  },
  dateContainer: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  dateButton: {
    flex: 1,
  },
  clearButton: {
    minWidth: 80,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusButton: {
    minWidth: 120,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 2,
  },
});
