/**
 * Included LifeNest tokens granted to premium users each month.
 */
export const LIFENEST_MONTHLY_TOKEN_ALLOWANCE = 500;

/**
 * Number of message characters covered by a single LifeNest token.
 */
export const LIFENEST_CHARACTERS_PER_TOKEN = 100;

/**
 * Maximum number of characters accepted for one LifeNest prompt.
 */
export const LIFENEST_MAX_INPUT_CHARACTERS = 500;

/**
 * Ratio of the available monthly token pool that triggers the warning alert.
 */
export const LIFENEST_USAGE_WARNING_RATIO = 0.85;

/**
 * Calculates how many LifeNest tokens a prompt consumes from its character length.
 */
export function calculateLifeNestTokensForMessage(message: string) {
  //
  const trimmed = message.trim();
  //
  if (!trimmed) return 0;
  return Math.max(1, Math.ceil(trimmed.length / LIFENEST_CHARACTERS_PER_TOKEN));
}

/**
 * Adds calendar months while clamping to the last valid day of the target month.
 */
function addUtcMonthsClamped(date: Date, monthsToAdd: number) {
  //
  const targetYear = date.getUTCFullYear();
  //
  const targetMonth = date.getUTCMonth() + monthsToAdd;
  //
  const targetDay = date.getUTCDate();
  //
  const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(
    targetYear,
    targetMonth,
    Math.min(targetDay, lastDayOfTargetMonth),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds()
  ));
}

/**
 * Returns the current monthly LifeNest usage window anchored to the subscription start.
 */
export function getLifeNestUsageWindow(subscriptionStart: Date, now: Date = new Date()) {
  //
  let start = new Date(subscriptionStart);
  //
  if (Number.isNaN(start.getTime())) {
    start = new Date(now);
  }

  while (addUtcMonthsClamped(start, 1).getTime() <= now.getTime()) {
    start = addUtcMonthsClamped(start, 1);
  }

  while (start.getTime() > now.getTime()) {
    start = addUtcMonthsClamped(start, -1);
  }

  //
  const end = addUtcMonthsClamped(start, 1);
  //
  const periodKey = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}-${String(start.getUTCDate()).padStart(2, '0')}`;

  return { periodKey, start, end };
}
