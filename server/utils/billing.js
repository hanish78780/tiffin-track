/**
 * TiffinTrack Billing Engine
 *
 * Calculates pro-rated monthly bills based on weekday-only delivery.
 * Customers are charged only for weekdays (Mon-Fri) they were actually served.
 * Paused days are subtracted, and overlapping pauses are not double-counted.
 *
 * Boundary convention: pause startDate and endDate are both INCLUSIVE
 * (service is paused on both boundary dates).
 */

/**
 * Normalize any date input (string, Date, timestamp) to UTC midnight.
 * This ensures consistent comparison regardless of local timezone.
 * @param {Date|string|number} d
 * @returns {number} UTC timestamp at midnight
 */
const toUTCMidnight = (d) => {
  const date = new Date(d);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

/**
 * Count weekdays (Monday-Friday) in a given calendar month.
 * Uses UTC dates exclusively to avoid timezone issues.
 * @param {number} year  - Full year (e.g. 2026)
 * @param {number} month - 1-indexed month (1 = January, 12 = December)
 * @returns {number} Total weekdays in the month
 */
const countWeekdaysInMonth = (year, month) => {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  let weekdays = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      weekdays++;
    }
  }

  return weekdays;
};

const ONE_DAY_MS = 86400000;

/**
 * Collect all weekdays that fall within any pause period for a given month.
 * Uses a Set of date strings to prevent double-counting overlapping pauses.
 * All date arithmetic is done in UTC to avoid timezone/DST bugs.
 *
 * @param {number} year
 * @param {number} month - 1-indexed
 * @param {Array<{startDate: Date|string, endDate: Date|string|null}>} pausePeriods
 * @returns {number} Number of unique weekdays paused
 */
const countPausedWeekdays = (year, month, pausePeriods) => {
  if (!pausePeriods || pausePeriods.length === 0) {
    return 0;
  }

  // Month boundaries as UTC timestamps (inclusive)
  const monthStartMs = Date.UTC(year, month - 1, 1);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthEndMs = Date.UTC(year, month - 1, daysInMonth);

  // Collect paused weekdays in a Set to avoid double-counting overlaps
  const pausedDaySet = new Set();

  for (const pause of pausePeriods) {
    const pauseStartMs = toUTCMidnight(pause.startDate);

    // If endDate is null, the pause is still active — treat as extending to end of month
    const pauseEndMs = pause.endDate ? toUTCMidnight(pause.endDate) : monthEndMs;

    // Clamp pause boundaries to the requested month
    const effectiveStartMs = Math.max(pauseStartMs, monthStartMs);
    const effectiveEndMs = Math.min(pauseEndMs, monthEndMs);

    // Skip if pause doesn't overlap with this month
    if (effectiveStartMs > monthEndMs || effectiveEndMs < monthStartMs) {
      continue;
    }

    // Walk each day in the clamped range (incrementing by exactly one day in ms)
    let currentMs = effectiveStartMs;
    while (currentMs <= effectiveEndMs) {
      const date = new Date(currentMs);
      const dayOfWeek = date.getUTCDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        // Use YYYY-MM-DD string as key for Set deduplication
        const key = date.toISOString().slice(0, 10);
        pausedDaySet.add(key);
      }
      currentMs += ONE_DAY_MS;
    }
  }

  return pausedDaySet.size;
};

/**
 * Calculate the pro-rated bill for a subscription in a given month.
 *
 * Formula:
 *   totalWeekdays  = weekdays in the calendar month
 *   pausedDays     = unique weekdays covered by pause periods
 *   servedDays     = totalWeekdays - pausedDays
 *   dailyRate      = monthlyPrice / totalWeekdays
 *   totalBill      = dailyRate * servedDays
 *
 * All currency values are rounded to 2 decimal places.
 *
 * @param {Object} params
 * @param {number} params.monthlyPrice - Monthly subscription price
 * @param {number} params.year         - Full year
 * @param {number} params.month        - 1-indexed month
 * @param {Array}  params.pausePeriods - Array of pause period objects
 * @returns {Object} Billing breakdown
 */
const calculateBill = ({ monthlyPrice, year, month, pausePeriods = [] }) => {
  const totalWeekdays = countWeekdaysInMonth(year, month);
  const pausedDays = countPausedWeekdays(year, month, pausePeriods);
  const servedDays = totalWeekdays - pausedDays;

  // Avoid division by zero (e.g. a month with 0 weekdays — shouldn't happen
  // in practice, but defensive coding)
  const dailyRate = totalWeekdays > 0
    ? parseFloat((monthlyPrice / totalWeekdays).toFixed(2))
    : 0;

  // Use the unrounded daily rate for the bill total, then round once
  const totalBill = totalWeekdays > 0
    ? parseFloat(((monthlyPrice / totalWeekdays) * servedDays).toFixed(2))
    : 0;

  return {
    monthlyPrice,
    totalWeekdays,
    pausedDays,
    servedDays,
    dailyRate,
    totalBill
  };
};

module.exports = {
  calculateBill,
  countWeekdaysInMonth,
  countPausedWeekdays
};
