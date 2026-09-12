import { __recurrence } from '../recurringTransactionService';

describe('recurring transaction date math', () => {
  it('advances weekly occurrences by seven days', () => {
    expect(__recurrence.addFrequency('2026-08-03', 'weekly')).toBe('2026-08-10');
  });

  it('clamps monthly occurrences to the last day of shorter months', () => {
    expect(__recurrence.addFrequency('2026-01-31', 'monthly')).toBe('2026-02-28');
  });
});


