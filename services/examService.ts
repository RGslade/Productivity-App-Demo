import databaseService from './databaseService';
import { sendLocalNotification } from '@/hooks/NotificationHandler';
import { todoService } from './todoService';
import { CreateExamRequest, Exam, ExamReminder, UpdateExamRequest } from '@/types/exam';

const today = () => new Date().toISOString().slice(0, 10);
class ExamService {
  async getExams() {
    const { data } = await databaseService.getAll<Exam>('Exams', 'exam_date');
    return (data || []).map((exam) => ({ ...exam, study_resources: Array.isArray(exam.study_resources) ? exam.study_resources : [] }));
  }
  async getExam(id: number) {
    const { data, error } = await databaseService.getSingle<Exam>('Exams', '', 'id', id);
    return error || !data?.id ? null : data;
  }
  async createExam(request: CreateExamRequest) {
    const { data, error } = await databaseService.insertAndSelect<Exam>('Exams', {
      subject: request.subject.trim(), exam_date: request.exam_date, results_date: request.results_date || null,
      study_resources: (request.study_resources || []).map((item) => item.trim()).filter(Boolean), result_value: null, result_status: null,
    });
    if (error || !data) throw new Error(error?.message || 'Could not create exam.');
    return data;
  }
  async updateExam(id: number, updates: UpdateExamRequest) {
    const payload = { ...updates, study_resources: updates.study_resources?.map((item) => item.trim()).filter(Boolean) };
    const { data, error } = await databaseService.updateTable<Exam>('Exams', payload, undefined, 'id', id);
    if (error || !data) throw new Error(error?.message || 'Could not update exam.');
    return data;
  }
  async deleteExam(id: number) { await databaseService.deleteFromTable('Exams', 'id', id); }
  async createStudyChecklist(exam: Exam) {
    if (exam.generated_checklist_todo_id) return exam.generated_checklist_todo_id;
    const checklist = await todoService.createToDoItem({ title: `${exam.subject} study checklist`, description: '', item_kind: 'checklist', checklist_items: exam.study_resources, type: 'Checklist', remind_me: false });
    await this.updateExam(exam.id, { generated_checklist_todo_id: checklist.id });
    return checklist.id;
  }
  async getDueReminders(): Promise<ExamReminder[]> {
    const current = today();
    const exams = await this.getExams();
    return exams.flatMap((exam) => {
      const reminders: ExamReminder[] = [];
      if (exam.exam_date < current && !exam.results_date && !exam.exam_date_reminder_sent_at) reminders.push({ exam, kind: 'exam_date' });
      if (exam.results_date && exam.results_date <= current && !exam.result_value && !exam.results_date_reminder_sent_at) reminders.push({ exam, kind: 'results_date' });
      return reminders;
    });
  }
  async checkAndNotifyDueReminders() {
    const reminders = await this.getDueReminders();
    for (const reminder of reminders) {
      const resultsDue = reminder.kind === 'results_date';
      await sendLocalNotification(resultsDue ? `Enter your ${reminder.exam.subject} result` : `Add a results date for ${reminder.exam.subject}`, resultsDue ? 'Your results date has arrived. Open Exams to enter your result.' : 'This exam has passed. Add the date you expect to receive your result.', { type: 'exam', examId: String(reminder.exam.id) });
      await databaseService.updateTable('Exams', { [resultsDue ? 'results_date_reminder_sent_at' : 'exam_date_reminder_sent_at']: new Date().toISOString() }, undefined, 'id', reminder.exam.id);
    }
    return reminders;
  }
}
export const examService = new ExamService();
