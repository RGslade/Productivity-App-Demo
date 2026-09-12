const CURRENCY_INPUT_PATTERN = /^\d*(\.\d{0,2})?$/;
const CURRENCY_VALUE_PATTERN = /^\d+(\.\d{1,2})?$/;
const MAX_SIGNIFICANT_DIGITS = 9;

/** Counts significant digits while ignoring leading zeroes and the decimal point. */
const countSignificantDigits = (value: string): number => {
  const [wholePart = '', fractionalPart = ''] = value.split('.');
  return `${wholePart.replace(/^0+/, '')}${fractionalPart}`.length;
};

/** Returns whether a partially entered currency value remains within input limits. */
export const isCurrencyAmountInput = (value: string): boolean => (
  CURRENCY_INPUT_PATTERN.test(value) && countSignificantDigits(value) <= MAX_SIGNIFICANT_DIGITS
);

/** Returns whether a saved currency value is positive and within currency precision limits. */
export const isValidCurrencyAmount = (value: string): boolean => {
  const trimmed = value.trim();
  const numericValue = Number(trimmed);

  return CURRENCY_VALUE_PATTERN.test(trimmed)
    && Number.isFinite(numericValue)
    && numericValue > 0
    && countSignificantDigits(trimmed) <= MAX_SIGNIFICANT_DIGITS;
};
