export interface Exam {
  id: number; user_id: number; subject: string; exam_date: string; results_date: string | null;
  result_value: string | null; result_status: string | null; study_resources: string[];
  exam_date_reminder_sent_at: string | null; results_date_reminder_sent_at: string | null;
  generated_checklist_todo_id: number | null; linked_grade_id: number | null; created_at: string; updated_at: string;
}
export interface CreateExamRequest { subject: string; exam_date: string; results_date?: string | null; study_resources?: string[]; }
export interface UpdateExamRequest extends Partial<CreateExamRequest> { result_value?: string | null; result_status?: string | null; linked_grade_id?: number | null; generated_checklist_todo_id?: number | null; }
export type ExamReminder = { exam: Exam; kind: 'results_date' | 'exam_date' };
