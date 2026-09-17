const { calculateBill } = require("../utils/billing");
const Subscription = require("../models/Subscription");
const Customer = require("../models/Customer");
const SubscriptionAssignment = require("../models/SubscriptionAssignment");
const { transferSubscription } = require("../controllers/subscriptionController");

jest.mock("../models/Subscription");
jest.mock("../models/Customer");
jest.mock("../models/SubscriptionAssignment");

describe("T6: Subscription Transfer & Split Billing", () => {
  const OWNER_A = "owner_a_123";
  const OWNER_B = "owner_b_456";

  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
  });

  describe("Billing Engine Split Calculations", () => {
    test("Transfer mid-month: ₹3,000 plan, Sep 2026 (22 weekdays), transfer on Sep 15", () => {
      // September 2026 has 22 weekdays.
      // Customer A served Sep 1 to Sep 14:
      // Weekdays in Sep 1-14: Sep 1(Tue), 2(Wed), 3(Thu), 4(Fri), 7(Mon), 8(Tue), 9(Wed), 10(Thu), 11(Fri), 14(Mon) = 10 weekdays.
      // Customer B served Sep 15 to Sep 30:
      // Weekdays in Sep 15-30: 22 - 10 = 12 weekdays.
      // Monthly price = 3000. Daily rate = 3000 / 22 = 136.3636...
      // Customer A amount: (3000 / 22) * 10 = 1363.64
      // Customer B amount: (3000 / 22) * 12 = 1636.36
      // Sum = 1363.64 + 1636.36 = 3000.00 = totalBill.
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
        assignments
      });

      expect(result.totalWeekdays).toBe(22);
      expect(result.servedDays).toBe(22);
      expect(result.totalBill).toBe(3000);
      expect(result.customerBreakdown).toHaveLength(2);

      const custA = result.customerBreakdown.find((c) => c.customerId === "cust_A");
      const custB = result.customerBreakdown.find((c) => c.customerId === "cust_B");

      expect(custA.servedDays).toBe(10);
      expect(custA.amount).toBe(1363.64);

      expect(custB.servedDays).toBe(12);
      expect(custB.amount).toBe(1636.36);

      // Reconciled sum equals totalBill exactly
      expect(custA.amount + custB.amount).toBe(result.totalBill);
    });

    test("Transfer with pause: pause on Sep 10-15 (4 weekdays paused), transfer on Sep 15", () => {
      // Sep 10-15 paused weekdays: Sep 10(Thu), 11(Fri), 14(Mon), 15(Tue) = 4 paused days.
      // Total weekdays = 22. Paused weekdays = 4. Served = 18 weekdays.
      // Unrounded daily rate = 3000 / 22 = 136.3636...
      // Total bill = (3000 / 22) * 18 = 2454.55.
      // Customer A (Sep 1-14): 10 weekdays total - 3 paused (Sep 10, 11, 14) = 7 served days.
      // Customer B (Sep 15-30): 12 weekdays total - 1 paused (Sep 15) = 11 served days.
      // Cust A amount: (3000 / 22) * 7 = 954.55
      // Cust B amount: (3000 / 22) * 11 = 1500.00
      // Sum = 954.55 + 1500.00 = 2454.55 = totalBill.
      const assignments = [
        {
          customerId: "cust_A",
          customerName: "Rahul",
          startDate: new Date("2026-09-01"),
          endDate: new Date("2026-09-14")
        },
        {
          customerId: "cust_B",
          customerName: "Priya",
          startDate: new Date("2026-09-15"),
          endDate: null
        }
      ];

      const pausePeriods = [
        {
          startDate: "2026-09-10",
          endDate: "2026-09-15"
        }
      ];

      const result = calculateBill({
        monthlyPrice: 3000,
        year: 2026,
        month: 9,
        pausePeriods,
        assignments
      });

      expect(result.totalWeekdays).toBe(22);
      expect(result.pausedDays).toBe(4);
      expect(result.servedDays).toBe(18);
      expect(result.totalBill).toBe(2454.55);

      const custA = result.customerBreakdown.find((c) => c.customerId === "cust_A");
      const custB = result.customerBreakdown.find((c) => c.customerId === "cust_B");

      expect(custA.servedDays).toBe(7);
      expect(custB.servedDays).toBe(11);
      expect(custA.amount + custB.amount).toBe(2454.55);
    });

    test("Transfer on first day of month: new customer served all days", () => {
      const assignments = [
        {
          customerId: "cust_B",
          customerName: "Priya",
          startDate: new Date("2026-09-01"),
          endDate: null
        }
      ];

      const result = calculateBill({
        monthlyPrice: 3000,
        year: 2026,
        month: 9,
        pausePeriods: [],
        assignments
      });

      expect(result.servedDays).toBe(22);
      expect(result.customerBreakdown).toHaveLength(1);
      expect(result.customerBreakdown[0].customerId).toBe("cust_B");
      expect(result.customerBreakdown[0].servedDays).toBe(22);
      expect(result.customerBreakdown[0].amount).toBe(3000);
    });

    test("Transfer on last weekday of month (Sep 30): Cust A gets 21 days, Cust B gets 1 day", () => {
      // Sep 30 is a Wednesday (1 weekday)
      const assignments = [
        {
          customerId: "cust_A",
          customerName: "Rahul",
          startDate: new Date("2026-09-01"),
          endDate: new Date("2026-09-29")
        },
        {
          customerId: "cust_B",
          customerName: "Priya",
          startDate: new Date("2026-09-30"),
          endDate: null
        }
      ];

      const result = calculateBill({
        monthlyPrice: 3000,
        year: 2026,
        month: 9,
        pausePeriods: [],
        assignments
      });

      const custA = result.customerBreakdown.find((c) => c.customerId === "cust_A");
      const custB = result.customerBreakdown.find((c) => c.customerId === "cust_B");

      expect(custA.servedDays).toBe(21);
      expect(custB.servedDays).toBe(1);
      expect(custA.amount + custB.amount).toBe(3000);
    });

    test("Cross-month history: Transfer in September does not corrupt August or October", () => {
      const assignments = [
        {
          customerId: "cust_A",
          customerName: "Rahul",
          startDate: new Date("2026-08-01"),
          endDate: new Date("2026-09-14")
        },
        {
          customerId: "cust_B",
          customerName: "Priya",
          startDate: new Date("2026-09-15"),
          endDate: null
        }
      ];

      // In August: Cust A gets all 21 weekdays
      const augResult = calculateBill({
        monthlyPrice: 3000,
        year: 2026,
        month: 8,
        pausePeriods: [],
        assignments
      });
      expect(augResult.customerBreakdown).toHaveLength(1);
      expect(augResult.customerBreakdown[0].customerId).toBe("cust_A");
      expect(augResult.customerBreakdown[0].servedDays).toBe(21);

      // In October: Cust B gets all 22 weekdays
      const octResult = calculateBill({
        monthlyPrice: 3000,
        year: 2026,
        month: 10,
        pausePeriods: [],
        assignments
      });
      expect(octResult.customerBreakdown).toHaveLength(1);
      expect(octResult.customerBreakdown[0].customerId).toBe("cust_B");
      expect(octResult.customerBreakdown[0].servedDays).toBe(22);
    });
  });

  describe("transferSubscription Controller Endpoint", () => {
    test("Transfer successfully updates assignments and subscription", async () => {
      req = {
        params: { id: "507f1f77bcf86cd799439011" },
        body: {
          newCustomerId: "507f1f77bcf86cd799439022",
          transferDate: "2026-09-15"
        },
        user: { id: OWNER_A }
      };

      const mockSub = {
        _id: "507f1f77bcf86cd799439011",
        ownerId: OWNER_A,
        customerId: "507f1f77bcf86cd799439033", // original customer
        startDate: new Date("2026-09-01"),
        status: "active",
        save: jest.fn().mockResolvedValue(true)
      };

      const mockNewCustomer = {
        _id: "507f1f77bcf86cd799439022",
        ownerId: OWNER_A,
        name: "Priya Verma"
      };

      const mockCurrentAssignment = {
        _id: "assign_1",
        subscriptionId: "507f1f77bcf86cd799439011",
        customerId: "507f1f77bcf86cd799439033",
        startDate: new Date("2026-09-01"),
        endDate: null,
        save: jest.fn().mockResolvedValue(true)
      };

      Subscription.findOne.mockImplementation(({ _id, customerId }) => {
        if (_id === "507f1f77bcf86cd799439011") return Promise.resolve(mockSub);
        if (customerId === "507f1f77bcf86cd799439022") return Promise.resolve(null); // no conflict
        return Promise.resolve(null);
      });

      Customer.findOne.mockResolvedValue(mockNewCustomer);
      SubscriptionAssignment.findOne.mockResolvedValue(mockCurrentAssignment);
      SubscriptionAssignment.create.mockResolvedValue({
        _id: "assign_2",
        customerId: "507f1f77bcf86cd799439022",
        startDate: new Date("2026-09-15")
      });

      await transferSubscription(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Subscription transferred successfully"
        })
      );
      expect(mockSub.customerId).toBe("507f1f77bcf86cd799439022");
      expect(mockSub.save).toHaveBeenCalled();
      expect(mockCurrentAssignment.save).toHaveBeenCalled();
    });

    test("Rejects transfer if new customer does not exist (404)", async () => {
      req = {
        params: { id: "507f1f77bcf86cd799439011" },
        body: {
          newCustomerId: "507f1f77bcf86cd799439099",
          transferDate: "2026-09-15"
        },
        user: { id: OWNER_A }
      };

      Subscription.findOne.mockResolvedValue({
        _id: "507f1f77bcf86cd799439011",
        ownerId: OWNER_A,
        customerId: "507f1f77bcf86cd799439033",
        status: "active"
      });

      Customer.findOne.mockResolvedValue(null); // not found

      await transferSubscription(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Target customer not found"
        })
      );
    });

    test("Rejects transfer to same customer (400)", async () => {
      req = {
        params: { id: "507f1f77bcf86cd799439011" },
        body: {
          newCustomerId: "507f1f77bcf86cd799439033",
          transferDate: "2026-09-15"
        },
        user: { id: OWNER_A }
      };

      Subscription.findOne.mockResolvedValue({
        _id: "507f1f77bcf86cd799439011",
        ownerId: OWNER_A,
        customerId: "507f1f77bcf86cd799439033",
        status: "active"
      });

      Customer.findOne.mockResolvedValue({
        _id: "507f1f77bcf86cd799439033",
        ownerId: OWNER_A
      });

      await transferSubscription(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Cannot transfer subscription to the same customer"
        })
      );
    });

    test("Rejects transfer if target customer already has an active subscription (409)", async () => {
      req = {
        params: { id: "507f1f77bcf86cd799439011" },
        body: {
          newCustomerId: "507f1f77bcf86cd799439022",
          transferDate: "2026-09-15"
        },
        user: { id: OWNER_A }
      };

      Subscription.findOne.mockImplementation(({ _id, customerId }) => {
        if (_id === "507f1f77bcf86cd799439011") {
          return Promise.resolve({
            _id: "507f1f77bcf86cd799439011",
            customerId: "507f1f77bcf86cd799439033",
            status: "active"
          });
        }
        if (customerId === "507f1f77bcf86cd799439022") {
          return Promise.resolve({
            _id: "sub_other_active",
            customerId: "507f1f77bcf86cd799439022",
            status: "active"
          });
        }
        return Promise.resolve(null);
      });

      Customer.findOne.mockResolvedValue({
        _id: "507f1f77bcf86cd799439022",
        ownerId: OWNER_A
      });

      await transferSubscription(req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Target customer already has an active subscription"
        })
      );
    });

    test("Rejects transfer date before subscription start date (400)", async () => {
      req = {
        params: { id: "507f1f77bcf86cd799439011" },
        body: {
          newCustomerId: "507f1f77bcf86cd799439022",
          transferDate: "2026-08-25" // before Sep 1
        },
        user: { id: OWNER_A }
      };

      Subscription.findOne.mockImplementation(({ _id, customerId }) => {
        if (_id === "507f1f77bcf86cd799439011") {
          return Promise.resolve({
            _id: "507f1f77bcf86cd799439011",
            ownerId: OWNER_A,
            customerId: "507f1f77bcf86cd799439033",
            startDate: new Date("2026-09-01"),
            status: "active"
          });
        }
        return Promise.resolve(null);
      });

      Customer.findOne.mockResolvedValue({
        _id: "507f1f77bcf86cd799439022",
        ownerId: OWNER_A
      });

      await transferSubscription(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Transfer date cannot be before subscription start date"
        })
      );
    });

    test("Cross-owner isolation: Owner B cannot transfer Owner A's subscription (404)", async () => {
      req = {
        params: { id: "507f1f77bcf86cd799439011" },
        body: {
          newCustomerId: "507f1f77bcf86cd799439022",
          transferDate: "2026-09-15"
        },
        user: { id: OWNER_B } // Different owner
      };

      Subscription.findOne.mockImplementation(({ ownerId }) => {
        if (ownerId === OWNER_B) return Promise.resolve(null);
        return Promise.resolve(null);
      });

      await transferSubscription(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Subscription not found"
        })
      );
    });
  });
});
