export interface FeedbackForm {
  subject: string;
  feedback_text: string;
  category: string;
  updated_at: string;
  created_at: string;
}

export const FEEDBACK_CATEGORIES = [
  'Bug Report',
  'Feature Request',
  'General Feedback',
  'User Experience',
  'Technical Issue',
  'Content Suggestion',
  'Other'
];
