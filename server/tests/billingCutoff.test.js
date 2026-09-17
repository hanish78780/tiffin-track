const { calculateBill, getTodayIST } = require("../utils/billing");
const { getBill } = require("../controllers/billingController");
const Customer = require("../models/Customer");
const Subscription = require("../models/Subscription");
const PausePeriod = require("../models/PausePeriod");
const SubscriptionAssignment = require("../models/SubscriptionAssignment");

jest.mock("../models/Customer");
jest.mock("../models/Subscription");
jest.mock("../models/PausePeriod");
jest.mock("../models/SubscriptionAssignment");

describe("Issue 2: Billing Current Month Cutoff & Rules", () => {
  // -------------------------------------------------------------------
  // 1. Current month — today = middle of month
  // -------------------------------------------------------------------
  test("Current month: today = Sep 17, 2026 -> only 13 weekdays through today are billed", () => {
    // September 2026 has 22 weekdays total.
    // Sep 1 to Sep 17:
    // Week 1: Sep 1(Tue), 2(Wed), 3(Thu), 4(Fri) = 4
    // Week 2: Sep 7(Mon), 8(Tue), 9(Wed), 10(Thu), 11(Fri) = 5
    // Week 3: Sep 14(Mon), 15(Tue), 16(Wed), 17(Thu) = 4
    // Total elapsed weekdays = 13
    // Future weekdays from Sep 18-30 (9 weekdays) MUST NOT be billed.
    const result = calculateBill({
      monthlyPrice: 3000,
      year: 2026,
      month: 9,
      pausePeriods: [],
      asOfDate: "2026-09-17"
    });

    expect(result.totalWeekdays).toBe(22); // Plan baseline remains 22
    expect(result.dailyRate).toBeCloseTo(136.36, 2); // 3000 / 22
    expect(result.weekdaysElapsed).toBe(13);
    expect(result.pausedDays).toBe(0);
    expect(result.servedDays).toBe(13);
    expect(result.totalBill).toBeCloseTo(1772.73, 2); // (3000 / 22) * 13
    expect(result.isCurrentMonth).toBe(true);
    expect(result.cutoffDate).toBe("2026-09-17");
  });

  // -------------------------------------------------------------------
  // 2. Current month with pause extending beyond today
  // -------------------------------------------------------------------
  test("Current month with pause: pause extends beyond today -> only paused weekdays through today counted", () => {
    // Current date: Sep 17
    // Pause: Sep 10 to Sep 20
    // Weekdays in Sep 10-17: Sep 10(Thu), 11(Fri), 14(Mon), 15(Tue), 16(Wed), 17(Thu) = 6 paused weekdays
    // Sep 18 is in pause but BEYOND cutoff, so it is not counted in current billing.
    // Total elapsed weekdays = 13.
    // Paused weekdays = 6.
    // Served weekdays = 13 - 6 = 7.
    // Total bill = (3000 / 22) * 7 = 954.55.
    const result = calculateBill({
      monthlyPrice: 3000,
      year: 2026,
      month: 9,
      pausePeriods: [
        { startDate: "2026-09-10", endDate: "2026-09-20" }
      ],
      asOfDate: "2026-09-17"
    });

    expect(result.totalWeekdays).toBe(22);
    expect(result.pausedDays).toBe(6);
    expect(result.servedDays).toBe(7);
    expect(result.totalBill).toBeCloseTo(954.55, 2);
  });

  // -------------------------------------------------------------------
  // 3. Current month transfer (T6)
  // -------------------------------------------------------------------
  test("Current month transfer: A -> B mid-month (Sep 15), as of Sep 17 -> only dates through today are billed and split correctly", () => {
    // Sep 1-14: Customer A (10 weekdays)
    // Sep 15-17: Customer B (3 weekdays)
    // Cust A: (3000 / 22) * 10 = 1363.64
    // Cust B: (3000 / 22) * 3 = 409.09
    // Sum = 1772.73 = totalBill
    const assignments = [
      {
        customerId: "cust_A",
        customerName: "Rahul Sharma",
        startDate: new Date("2026-09-01"),
        endDate: new Date("2026-09-14")
      },
      {
        customerId: "cust_B",
        customerName: "Priya Verma",
        startDate: new Date("2026-09-15"),
        endDate: null
      }
    ];

    const result = calculateBill({
      monthlyPrice: 3000,
      year: 2026,
      month: 9,
      pausePeriods: [],
      assignments,
      asOfDate: "2026-09-17"
    });

    expect(result.servedDays).toBe(13);
    expect(result.totalBill).toBeCloseTo(1772.73, 2);
    expect(result.customerBreakdown).toHaveLength(2);

    const custA = result.customerBreakdown.find((c) => c.customerId === "cust_A");
    const custB = result.customerBreakdown.find((c) => c.customerId === "cust_B");

    expect(custA.servedDays).toBe(10);
    expect(custA.amount).toBe(1363.64);

    expect(custB.servedDays).toBe(3);
    expect(custB.amount).toBe(409.09);

    expect(custA.amount + custB.amount).toBe(result.totalBill);
  });

  // -------------------------------------------------------------------
  // 4. Past month — entire month calculated
  // -------------------------------------------------------------------
  test("Past month: August 2026 billed when asOfDate is Sep 17, 2026 -> entire month (21 weekdays) calculated", () => {
    const result = calculateBill({
      monthlyPrice: 3000,
      year: 2026,
      month: 8,
      pausePeriods: [],
      asOfDate: "2026-09-17"
    });

    expect(result.totalWeekdays).toBe(21);
    expect(result.servedDays).toBe(21);
    expect(result.totalBill).toBe(3000);
    expect(result.isCurrentMonth).toBe(false);
  });

  // -------------------------------------------------------------------
  // 5. Future month rejection
  // -------------------------------------------------------------------
  test("Future month: October 2026 billed when asOfDate is Sep 17, 2026 -> throws error", () => {
    expect(() => {
      calculateBill({
        monthlyPrice: 3000,
        year: 2026,
        month: 10,
        pausePeriods: [],
        asOfDate: "2026-09-17"
      });
    }).toThrow("Billing is not available for future months");
  });

  // -------------------------------------------------------------------
  // 6. Today is weekend
  // -------------------------------------------------------------------
  test("Today is weekend: Saturday Sep 19, 2026 -> cutoff is Sep 19, but only weekdays before/equal are counted", () => {
    // Sep 19 is Saturday.
    // Weekdays through Sep 19: Sep 1..4 (4), Sep 7..11 (5), Sep 14..18 (5) = 14 weekdays.
    // Saturday Sep 19 is not a weekday.
    const result = calculateBill({
      monthlyPrice: 3000,
      year: 2026,
      month: 9,
      pausePeriods: [],
      asOfDate: "2026-09-19"
    });

    expect(result.weekdaysElapsed).toBe(14);
    expect(result.servedDays).toBe(14);
    expect(result.totalBill).toBeCloseTo((3000 / 22) * 14, 2);
  });

  // -------------------------------------------------------------------
  // 7. Existing billing regression: Sep 2026 as completed month
  // -------------------------------------------------------------------
  test("Preserve regression: ₹3,000 September 2026 22 weekdays Sep 10-15 pause (4 paused weekdays) = 18 served, ₹2,454.55 when treated as past/completed month", () => {
    // When asOfDate is in October 2026 (September is a completed past month):
    const result = calculateBill({
      monthlyPrice: 3000,
      year: 2026,
      month: 9,
      pausePeriods: [
        { startDate: "2026-09-10", endDate: "2026-09-15" }
      ],
      asOfDate: "2026-10-15"
    });

    expect(result.totalWeekdays).toBe(22);
    expect(result.pausedDays).toBe(4);
    expect(result.servedDays).toBe(18);
    expect(result.totalBill).toBe(2454.55);
  });

  // -------------------------------------------------------------------
  // 8. Controller HTTP 400 for future month
  // -------------------------------------------------------------------
  test("Controller rejects future month request with HTTP 400", async () => {
    const req = {
      params: { customerId: "507f1f77bcf86cd799439011" },
      query: { month: "2026-10", asOfDate: "2026-09-17" },
      user: { id: "owner_123" }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    const next = jest.fn();

    await getBill(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Billing is not available for future months"
      })
    );
  });

  // -------------------------------------------------------------------
  // 9. Controller handles current month with asOfDate cutoff
  // -------------------------------------------------------------------
  test("Controller returns current month bill with cutoff date and metadata", async () => {
    const req = {
      params: { customerId: "507f1f77bcf86cd799439011" },
      query: { month: "2026-09", asOfDate: "2026-09-17" },
      user: { id: "owner_123" }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    const next = jest.fn();

    Customer.findOne.mockResolvedValue({
      _id: "507f1f77bcf86cd799439011",
      name: "Rahul Sharma",
      phone: "9876543210",
      ownerId: "owner_123"
    });

    Subscription.findOne.mockResolvedValue({
      _id: "sub_1",
      customerId: "507f1f77bcf86cd799439011",
      planName: "Monthly Lunch",
      monthlyPrice: 3000,
      status: "active"
    });

    PausePeriod.find.mockResolvedValue([]);
    SubscriptionAssignment.find.mockReturnValue({
      populate: jest.fn().mockResolvedValue([])
    });

    await getBill(req, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        billing: expect.objectContaining({
          month: "2026-09",
          totalWeekdays: 22,
          servedDays: 13,
          isCurrentMonth: true,
          cutoffDate: "2026-09-17",
          totalBill: 1772.73
        })
      })
    );
  });
});
