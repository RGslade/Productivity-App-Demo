import { formatProgressPercentage } from '../ProgressBar';

describe('formatProgressPercentage', () => {
  it('uses fraction labels for one-third and two-thirds', () => {
    expect(formatProgressPercentage(33.333333)).toBe('â…“');
    expect(formatProgressPercentage(66.66666)).toBe('â…”');
  });

  it('keeps calculated progress to two decimal places', () => {
    expect(formatProgressPercentage(12.345)).toBe('12.35%');
    expect(formatProgressPercentage(99.99999)).toBe('99%');
  });
});


