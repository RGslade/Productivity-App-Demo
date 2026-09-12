export const EDUCATION_TYPES = [
  'GCSE',
  'A Level',
  'AS Level',
  'T Level',
  'BTEC',
  'Apprenticeship',
  'Functional Skills',
  'Other',
] as const;

export type EducationType = typeof EDUCATION_TYPES[number];

export const EDUCATION_GRADES: Record<Exclude<EducationType, 'Other'>, string[]> = {
  GCSE: ['9', '8', '7', '6', '5', '4', '3', '2', '1', 'U'],
  'A Level': ['A*', 'A', 'B', 'C', 'D', 'E', 'U'],
  'AS Level': ['A', 'B', 'C', 'D', 'E', 'U'],
  'T Level': ['Distinction*', 'Distinction', 'Merit', 'Pass', 'Fail'],
  BTEC: ['Distinction*', 'Distinction', 'Merit', 'Pass', 'Unclassified'],
  Apprenticeship: ['Distinction', 'Merit', 'Pass'],
  'Functional Skills': ['Pass', 'Fail'],
};

export interface EducationGrade {
  id: number;
  user_id: number;
  subject: string;
  qualification_type: EducationType;
  grade: string;
  institution_name?: string | null;
  date_achieved?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface CreateEducationGradeRequest {
  subject: string;
  qualification_type: EducationType;
  grade: string;
  institution_name?: string | null;
  date_achieved?: string | null;
  notes?: string | null;
}

export interface UpdateEducationGradeRequest {
  subject?: string;
  qualification_type?: EducationType;
  grade?: string;
  institution_name?: string | null;
  date_achieved?: string | null;
  notes?: string | null;
}

/** Converts picker or text-input values to the trimmed form used by validation and persistence. */
export function normalizeEducationGradeValue(value: unknown): string {
  return value == null ? '' : String(value).trim();
}

/** Returns the user-facing validation message when a grade form is incomplete. */
export function getEducationGradeValidationError(
  subject: unknown,
  qualificationType: unknown,
  grade: unknown,
): string | null {
  if (
    !normalizeEducationGradeValue(subject) ||
    !normalizeEducationGradeValue(qualificationType) ||
    !normalizeEducationGradeValue(grade)
  ) {
    return 'Subject, qualification type and grade are required.';
  }

  return null;
}
