import {
  getEducationGradeValidationError,
  normalizeEducationGradeValue,
} from '@/types/educationGrade';

describe('education grade form values', () => {
  it('normalizes picker and text values before validation', () => {
    expect(normalizeEducationGradeValue('  Mathematics  ')).toBe('Mathematics');
    expect(normalizeEducationGradeValue(undefined)).toBe('');
    expect(getEducationGradeValidationError(' Mathematics ', ' GCSE ', ' 9 ')).toBeNull();
  });

  it('rejects an empty required value', () => {
    expect(getEducationGradeValidationError('Mathematics', 'GCSE', '')).toBe(
      'Subject, qualification type and grade are required.',
    );
  });
});


