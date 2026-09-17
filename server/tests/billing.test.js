const {
  calculateBill,
  countWeekdaysInMonth,
  countPausedWeekdays
} = require("../utils/billing");

describe("Billing Engine", () => {
  // -------------------------------------------------------------------
  // countWeekdaysInMonth
  // -------------------------------------------------------------------
  describe("countWeekdaysInMonth", () => {
    test("September 2026 has 22 weekdays", () => {
      expect(countWeekdaysInMonth(2026, 9)).toBe(22);
    });

    test("February 2024 (leap year) has 21 weekdays", () => {
      // Feb 2024: 29 days, starts Thursday
      expect(countWeekdaysInMonth(2024, 2)).toBe(21);
    });

    test("February 2023 (non-leap) has 20 weekdays", () => {
      // Feb 2023: 28 days, starts Wednesday
      expect(countWeekdaysInMonth(2023, 2)).toBe(20);
    });

    test("January 2026 has 22 weekdays", () => {
      // Jan 2026: 31 days, starts Thursday
      expect(countWeekdaysInMonth(2026, 1)).toBe(22);
    });

    test("October 2026 has 22 weekdays", () => {
      expect(countWeekdaysInMonth(2026, 10)).toBe(22);
    });

    test("August 2026 has 21 weekdays", () => {
      expect(countWeekdaysInMonth(2026, 8)).toBe(21);
    });
  });

  // -------------------------------------------------------------------
  // calculateBill — full month, no pauses
  // -------------------------------------------------------------------
  describe("Full month with no pauses", () => {
    test("should charge full monthly price", () => {
      const result = calculateBill({
        monthlyPrice: 3000,
        year: 2026,
        month: 9,
        pausePeriods: []
      });

      expect(result.totalWeekdays).toBe(22);
      expect(result.pausedDays).toBe(0);
      expect(result.servedDays).toBe(22);
      expect(result.dailyRate).toBeCloseTo(136.36, 2);
      expect(result.totalBill).toBeCloseTo(3000, 2);
    });
  });

  // -------------------------------------------------------------------
  // calculateBill — single weekday pause
  // -------------------------------------------------------------------
  describe("Single weekday pause", () => {
    test("pause on one weekday should subtract one day", () => {
      // Sep 10, 2026 is a Thursday (weekday)
      const result = calculateBill({
        monthlyPrice: 3000,
        year: 2026,
        month: 9,
        pausePeriods: [
          { startDate: "2026-09-10", endDate: "2026-09-10" }
        ]
      });

      expect(result.totalWeekdays).toBe(22);
      expect(result.pausedDays).toBe(1);
      expect(result.servedDays).toBe(21);
      expect(result.dailyRate).toBeCloseTo(136.36, 2);
      expect(result.totalBill).toBeCloseTo(2863.64, 2);
    });
  });

  // -------------------------------------------------------------------
  // calculateBill — pause including a weekend
  // -------------------------------------------------------------------
  describe("Pause including a weekend", () => {
    test("weekend days within pause should not count as paused delivery days", () => {
      // Sep 10 (Thu) to Sep 15 (Tue) = 6 calendar days
      // Weekdays paused: Thu 10, Fri 11, Mon 14, Tue 15 = 4 weekdays
      // Sat 12, Sun 13 are weekend — not delivery days
      const result = calculateBill({
        monthlyPrice: 3000,
        year: 2026,
        month: 9,
        pausePeriods: [
          { startDate: "2026-09-10", endDate: "2026-09-15" }
        ]
      });

      expect(result.totalWeekdays).toBe(22);
      expect(result.pausedDays).toBe(4);
      expect(result.servedDays).toBe(18);
    });
  });

  // -------------------------------------------------------------------
  // calculateBill — multiple pause periods
  // -------------------------------------------------------------------
  describe("Multiple pause periods", () => {
    test("should count weekdays across multiple non-overlapping pauses", () => {
      // Pause 1: Sep 3 (Thu) to Sep 4 (Fri) = 2 weekdays
      // Pause 2: Sep 21 (Mon) to Sep 22 (Tue) = 2 weekdays
      // Total paused = 4
      const result = calculateBill({
        monthlyPrice: 3000,
        year: 2026,
        month: 9,
        pausePeriods: [
          { startDate: "2026-09-03", endDate: "2026-09-04" },
          { startDate: "2026-09-21", endDate: "2026-09-22" }
        ]
      });

      expect(result.totalWeekdays).toBe(22);
      expect(result.pausedDays).toBe(4);
      expect(result.servedDays).toBe(18);
    });
  });

  // -------------------------------------------------------------------
  // calculateBill — overlapping pause periods
  // -------------------------------------------------------------------
  describe("Overlapping pause periods", () => {
    test("should not double-count overlapping paused weekdays", () => {
      // Pause 1: Sep 10 (Thu) to Sep 14 (Mon) = Thu, Fri, Mon = 3 weekdays
      // Pause 2: Sep 11 (Fri) to Sep 15 (Tue) = Fri, Mon, Tue = 3 weekdays
      // Overlap: Fri 11, Mon 14 are in both pauses
      // Unique paused weekdays: Thu 10, Fri 11, Mon 14, Tue 15 = 4
      const result = calculateBill({
        monthlyPrice: 3000,
        year: 2026,
        month: 9,
        pausePeriods: [
          { startDate: "2026-09-10", endDate: "2026-09-14" },
          { startDate: "2026-09-11", endDate: "2026-09-15" }
        ]
      });

      expect(result.totalWeekdays).toBe(22);
      expect(result.pausedDays).toBe(4);
      expect(result.servedDays).toBe(18);
    });
  });

  // -------------------------------------------------------------------
  // calculateBill — pause extending outside the month
  // -------------------------------------------------------------------
  describe("Pause extending outside the month", () => {
    test("should only count paused weekdays within the requested month", () => {
      // Pause starts Aug 25 (Tue), ends Sep 3 (Thu)
      // Only Sep 1 (Tue), Sep 2 (Wed), Sep 3 (Thu) are in September
      // All three are weekdays = 3 paused
      const result = calculateBill({
        monthlyPrice: 3000,
        year: 2026,
        month: 9,
        pausePeriods: [
          { startDate: "2026-08-25", endDate: "2026-09-03" }
        ]
      });

      expect(result.totalWeekdays).toBe(22);
      expect(result.pausedDays).toBe(3);
      expect(result.servedDays).toBe(19);
      expect(result.totalBill).toBeCloseTo(2590.91, 2);
    });

    test("pause extending past end of month should be clamped", () => {
      // Pause from Sep 28 (Mon) to Oct 5 (Mon)
      // Sep weekdays: Mon 28, Tue 29, Wed 30 = 3 paused
      const result = calculateBill({
        monthlyPrice: 3000,
        year: 2026,
        month: 9,
        pausePeriods: [
          { startDate: "2026-09-28", endDate: "2026-10-05" }
        ]
      });

      expect(result.totalWeekdays).toBe(22);
      expect(result.pausedDays).toBe(3);
      expect(result.servedDays).toBe(19);
    });
  });

  // -------------------------------------------------------------------
  // calculateBill — February / leap year
  // -------------------------------------------------------------------
  describe("February and leap year", () => {
    test("February 2024 (leap year, 29 days) — full month", () => {
      const result = calculateBill({
        monthlyPrice: 3000,
        year: 2024,
        month: 2,
        pausePeriods: []
      });

      expect(result.totalWeekdays).toBe(21);
      expect(result.servedDays).toBe(21);
      expect(result.totalBill).toBeCloseTo(3000, 2);
    });

    test("February 2023 (non-leap, 28 days) — full month", () => {
      const result = calculateBill({
        monthlyPrice: 3000,
        year: 2023,
        month: 2,
        pausePeriods: []
      });

      expect(result.totalWeekdays).toBe(20);
      expect(result.servedDays).toBe(20);
      expect(result.totalBill).toBeCloseTo(3000, 2);
    });

    test("February 2024 with pause on leap day (Feb 29, Thursday)", () => {
      const result = calculateBill({
        monthlyPrice: 3000,
        year: 2024,
        month: 2,
        pausePeriods: [
          { startDate: "2024-02-29", endDate: "2024-02-29" }
        ]
      });

      expect(result.totalWeekdays).toBe(21);
      expect(result.pausedDays).toBe(1);
      expect(result.servedDays).toBe(20);
    });
  });

  // -------------------------------------------------------------------
  // calculateBill — months with different weekday counts
  // -------------------------------------------------------------------
  describe("Months with different weekday counts", () => {
    test("dailyRate should differ for months with different weekday counts", () => {
      const sep2026 = calculateBill({
        monthlyPrice: 3000,
        year: 2026,
        month: 9,
        pausePeriods: []
      });

      const aug2026 = calculateBill({
        monthlyPrice: 3000,
        year: 2026,
        month: 8,
        pausePeriods: []
      });

      // Sep 2026 = 22 weekdays, Aug 2026 = 21 weekdays
      expect(sep2026.totalWeekdays).not.toBe(aug2026.totalWeekdays);
      expect(sep2026.dailyRate).not.toBe(aug2026.dailyRate);

      // But both full months should bill full price
      expect(sep2026.totalBill).toBeCloseTo(3000, 2);
      expect(aug2026.totalBill).toBeCloseTo(3000, 2);
    });
  });

  // -------------------------------------------------------------------
  // calculateBill — open-ended pause (endDate = null)
  // -------------------------------------------------------------------
  describe("Open-ended pause (endDate = null)", () => {
    test("should treat null endDate as extending to end of month", () => {
      // Pause from Sep 22 (Tue) with no end date
      // Sep 22-30: Tue 22, Wed 23, Thu 24, Fri 25, Mon 28, Tue 29, Wed 30 = 7 weekdays
      const result = calculateBill({
        monthlyPrice: 3000,
        year: 2026,
        month: 9,
        pausePeriods: [
          { startDate: "2026-09-22", endDate: null }
        ]
      });

      expect(result.totalWeekdays).toBe(22);
      expect(result.pausedDays).toBe(7);
      expect(result.servedDays).toBe(15);
    });
  });

  // -------------------------------------------------------------------
  // calculateBill — weekend-only pause should not affect billing
  // -------------------------------------------------------------------
  describe("Weekend-only pause", () => {
    test("pause covering only Saturday and Sunday should result in 0 paused days", () => {
      // Sep 12 (Sat) to Sep 13 (Sun) — both weekend
      const result = calculateBill({
        monthlyPrice: 3000,
        year: 2026,
        month: 9,
        pausePeriods: [
          { startDate: "2026-09-12", endDate: "2026-09-13" }
        ]
      });

      expect(result.pausedDays).toBe(0);
      expect(result.servedDays).toBe(22);
      expect(result.totalBill).toBeCloseTo(3000, 2);
    });
  });

  // -------------------------------------------------------------------
  // calculateBill — currency rounding
  // -------------------------------------------------------------------
  describe("Currency rounding", () => {
    test("should round totalBill and dailyRate to 2 decimal places", () => {
      const result = calculateBill({
        monthlyPrice: 3000,
        year: 2026,
        month: 9,
        pausePeriods: [
          { startDate: "2026-09-10", endDate: "2026-09-15" }
        ]
      });

      // Verify rounded to 2 decimals
      const dailyRateDecimals = result.dailyRate.toString().split(".")[1];
      const totalBillDecimals = result.totalBill.toString().split(".")[1];
      expect(dailyRateDecimals ? dailyRateDecimals.length : 0).toBeLessThanOrEqual(2);
      expect(totalBillDecimals ? totalBillDecimals.length : 0).toBeLessThanOrEqual(2);
    });
  });
});
