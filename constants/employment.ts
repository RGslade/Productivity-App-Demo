export const EMPLOYMENT_STATUSES = [
  'Unemployed',
  'Full Time',
  'Part Time',
  'Self Employed',
  'Contract',
  'Apprenticeship',
  'Internship',
  'Student',
  'Retired',
] as const;

export type EmploymentStatus = typeof EMPLOYMENT_STATUSES[number];
