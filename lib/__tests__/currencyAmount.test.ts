import { isCurrencyAmountInput, isValidCurrencyAmount } from '../currencyAmount';

describe('currency amount limits', () => {
  it('allows up to nine significant digits with two decimal places', () => {
    expect(isCurrencyAmountInput('1234567.89')).toBe(true);
    expect(isValidCurrencyAmount('1234567.89')).toBe(true);
    expect(isCurrencyAmountInput('12345678.90')).toBe(false);
  });

  it('rejects values that would display as zero or use more than two decimals', () => {
    expect(isValidCurrencyAmount('0.00000001')).toBe(false);
    expect(isValidCurrencyAmount('12.345')).toBe(false);
    expect(isValidCurrencyAmount('0.00')).toBe(false);
  });
});


