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
 * Get current date in India Standard Time (Asia/Kolkata) as YYYY-MM-DD.
 * Safe from UTC midnight boundary shifts.
 */
const getTodayIST = () => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(new Date());
};

/**
 * Calculate the pro-rated bill for a subscription in a given month.
 * Supports:
 * - Current month cutoff: only weekdays through asOfDate/today are billable (never future days).
 * - Completed month: full month calculated.
 * - Future month: rejected.
 * - Split billing across transferred customers (T6).
 *
 * Formula:
 *   totalWeekdays  = weekdays in the calendar month (basis for plan daily rate)
 *   dailyRate      = monthlyPrice / totalWeekdays
 *   servedDays     = billable weekdays served through cutoff date
 *   totalBill      = dailyRate * servedDays
 *
 * All currency values are rounded to 2 decimal places.
 *
 * @param {Object} params
 * @param {number} params.monthlyPrice - Monthly subscription price
 * @param {number} params.year         - Full year
 * @param {number} params.month        - 1-indexed month
 * @param {Array}  params.pausePeriods - Array of pause period objects
 * @param {Array}  params.assignments  - Array of assignment objects (T6)
 * @param {Object} params.defaultCustomer - Optional default customer object
 * @param {string} [params.asOfDate]   - Cutoff date (YYYY-MM-DD), defaults to null (full month)
 * @returns {Object} Billing breakdown including customerBreakdown, cutoffDate, isCurrentMonth
 */
const calculateBill = ({
  monthlyPrice,
  year,
  month,
  pausePeriods = [],
  assignments = [],
  defaultCustomer = null,
  asOfDate = null
}) => {
  const requestedMonthStr = `${year}-${String(month).padStart(2, "0")}`;

  // Month boundaries as UTC timestamps
  const monthStartMs = Date.UTC(year, month - 1, 1);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthEndMs = Date.UTC(year, month - 1, daysInMonth);

  let cutoffUtcMs = monthEndMs;
  let isCurrentMonth = false;
  let cutoffDateStr = null;

  if (asOfDate) {
    const asOfMonthStr = String(asOfDate).slice(0, 7);
    if (requestedMonthStr > asOfMonthStr) {
      throw new Error("Billing is not available for future months");
    }
    if (requestedMonthStr === asOfMonthStr) {
      isCurrentMonth = true;
      cutoffDateStr = asOfDate;
      const [ay, am, ad] = asOfDate.split("-").map(Number);
      cutoffUtcMs = Math.min(Date.UTC(ay, am - 1, ad), monthEndMs);
    }
  }

  // Count weekdays in the FULL calendar month (agreed daily rate baseline)
  const totalWeekdays = countWeekdaysInMonth(year, month);

  // Avoid division by zero
  const dailyRate = totalWeekdays > 0
    ? parseFloat((monthlyPrice / totalWeekdays).toFixed(2))
    : 0;
  const unroundedDailyRate = totalWeekdays > 0 ? monthlyPrice / totalWeekdays : 0;

  // Collect paused days as Set of YYYY-MM-DD
  const pausedDaysSet = new Set();
  for (const pause of pausePeriods) {
    const pauseStartMs = toUTCMidnight(pause.startDate);
    const pauseEndMs = pause.endDate ? toUTCMidnight(pause.endDate) : monthEndMs;

    const effectiveStartMs = Math.max(pauseStartMs, monthStartMs);
    const effectiveEndMs = Math.min(pauseEndMs, monthEndMs);

    if (effectiveStartMs <= monthEndMs && effectiveEndMs >= monthStartMs) {
      let currentMs = effectiveStartMs;
      while (currentMs <= effectiveEndMs) {
        const d = new Date(currentMs);
        if (d.getUTCDay() >= 1 && d.getUTCDay() <= 5) {
          pausedDaysSet.add(d.toISOString().slice(0, 10));
        }
        currentMs += ONE_DAY_MS;
      }
    }
  }

  let weekdaysElapsed = 0;
  let pausedDays = 0;
  let servedDays = 0;
  const customerDayCount = new Map();

  for (let day = 1; day <= daysInMonth; day++) {
    const dayUtcMs = Date.UTC(year, month - 1, day);
    // Never include days beyond cutoff date
    if (dayUtcMs > cutoffUtcMs) {
      continue;
    }

    const d = new Date(dayUtcMs);
    const dow = d.getUTCDay();
    if (dow < 1 || dow > 5) continue; // skip weekend

    weekdaysElapsed++;
    const dateStr = d.toISOString().slice(0, 10);

    if (pausedDaysSet.has(dateStr)) {
      pausedDays++;
      continue;
    }

    servedDays++;

    // If assignments are provided, assign served days to respective customers
    if (assignments && assignments.length > 0) {
      const matchingAssignment = assignments.find((a) => {
        const aStart = toUTCMidnight(a.startDate);
        const aEnd = a.endDate ? toUTCMidnight(a.endDate) : Infinity;
        return dayUtcMs >= aStart && dayUtcMs <= aEnd;
      });

      if (matchingAssignment) {
        const custId = String(matchingAssignment.customerId?._id || matchingAssignment.customerId);
        const custName =
          matchingAssignment.customerName ||
          matchingAssignment.customerId?.name ||
          "Customer";
        if (!customerDayCount.has(custId)) {
          customerDayCount.set(custId, {
            customerId: custId,
            customerName: custName,
            servedDays: 0
          });
        }
        customerDayCount.get(custId).servedDays++;
      } else if (defaultCustomer) {
        const custId = String(defaultCustomer.id || defaultCustomer._id);
        const custName = defaultCustomer.name || "Customer";
        if (!customerDayCount.has(custId)) {
          customerDayCount.set(custId, {
            customerId: custId,
            customerName: custName,
            servedDays: 0
          });
        }
        customerDayCount.get(custId).servedDays++;
      }
    }
  }

  // Use unrounded daily rate for the bill total, then round once
  const totalBill = totalWeekdays > 0
    ? parseFloat((unroundedDailyRate * servedDays).toFixed(2))
    : 0;

  const customerBreakdown = [];

  if (assignments && assignments.length > 0) {
    let sumLineAmounts = 0;

    for (const item of customerDayCount.values()) {
      const amount = parseFloat((unroundedDailyRate * item.servedDays).toFixed(2));
      customerBreakdown.push({
        customerId: item.customerId,
        customerName: item.customerName,
        servedDays: item.servedDays,
        amount
      });
      sumLineAmounts += amount;
    }

    // Reconcile any 1-cent rounding difference so sum(amounts) === totalBill
    if (customerBreakdown.length > 0) {
      const roundedSum = parseFloat(sumLineAmounts.toFixed(2));
      const delta = parseFloat((totalBill - roundedSum).toFixed(2));
      if (Math.abs(delta) > 0) {
        let maxIndex = 0;
        for (let i = 1; i < customerBreakdown.length; i++) {
          if (customerBreakdown[i].servedDays > customerBreakdown[maxIndex].servedDays) {
            maxIndex = i;
          }
        }
        customerBreakdown[maxIndex].amount = parseFloat(
          (customerBreakdown[maxIndex].amount + delta).toFixed(2)
        );
      }
    }
  } else if (defaultCustomer) {
    customerBreakdown.push({
      customerId: String(defaultCustomer.id || defaultCustomer._id),
      customerName: defaultCustomer.name || "Customer",
      servedDays,
      amount: totalBill
    });
  }

  return {
    monthlyPrice,
    totalWeekdays,
    weekdaysElapsed,
    pausedDays,
    servedDays,
    dailyRate,
    totalBill,
    customerBreakdown,
    cutoffDate: cutoffDateStr,
    isCurrentMonth
  };
};

module.exports = {
  calculateBill,
  countWeekdaysInMonth,
  countPausedWeekdays,
  getTodayIST
};

