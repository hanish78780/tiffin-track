const mongoose = require("mongoose");
const Subscription = require("../models/Subscription");
const Customer = require("../models/Customer");
const SubscriptionAssignment = require("../models/SubscriptionAssignment");
const { transferSubscription } = require("../controllers/subscriptionController");
const { calculateBill } = require("../utils/billing");

jest.mock("../models/Subscription");
jest.mock("../models/Customer");
jest.mock("../models/SubscriptionAssignment");

describe("Issue 3: Transfer Subscription with New Customer Creation", () => {
  const OWNER_A = "507f1f77bcf86cd799439001";
  const OWNER_B = "507f1f77bcf86cd799439002";
  const SUB_ID = "507f1f77bcf86cd799439011";
  const EXISTING_CUST_A = "507f1f77bcf86cd799439033";
  const NEW_CUST_ID = "507f1f77bcf86cd799439099";

  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
  });

  test("New customer transfer: creates Customer, creates Assignment, and transfers Subscription", async () => {
    req = {
      params: { id: SUB_ID },
      body: {
        newCustomer: {
          name: "Test Transfer Customer",
          phone: "9876543222",
          address: "Jaipur"
        },
        transferDate: "2026-09-15"
      },
      user: { id: OWNER_A }
    };

    const mockSub = {
      _id: SUB_ID,
      ownerId: OWNER_A,
      customerId: EXISTING_CUST_A,
      startDate: new Date("2026-09-01"),
      status: "active",
      save: jest.fn().mockResolvedValue(true)
    };

    const mockCurrentAssignment = {
      _id: "assign_old",
      subscriptionId: SUB_ID,
      customerId: EXISTING_CUST_A,
      startDate: new Date("2026-09-01"),
      endDate: null,
      save: jest.fn().mockResolvedValue(true)
    };

    const mockCreatedCustomer = {
      _id: NEW_CUST_ID,
      name: "Test Transfer Customer",
      phone: "9876543222",
      address: "Jaipur",
      ownerId: OWNER_A
    };

    const mockNewAssignment = {
      _id: "assign_new",
      subscriptionId: SUB_ID,
      customerId: NEW_CUST_ID,
      startDate: new Date("2026-09-15"),
      endDate: null
    };

    Subscription.findOne.mockResolvedValue(mockSub);
    Customer.findOne.mockResolvedValue(null); // No duplicate phone
    Customer.create.mockResolvedValue(mockCreatedCustomer);
    SubscriptionAssignment.findOne.mockResolvedValue(mockCurrentAssignment);
    SubscriptionAssignment.create.mockResolvedValue(mockNewAssignment);

    await transferSubscription(req, res, next);

    expect(Customer.findOne).toHaveBeenCalledWith({
      ownerId: OWNER_A,
      phone: "9876543222"
    });
    expect(Customer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Test Transfer Customer",
        phone: "9876543222",
        address: "Jaipur",
        ownerId: OWNER_A
      })
    );
    expect(mockCurrentAssignment.save).toHaveBeenCalled();
    expect(SubscriptionAssignment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId: OWNER_A,
        subscriptionId: SUB_ID,
        customerId: NEW_CUST_ID
      })
    );
    expect(mockSub.customerId).toBe(NEW_CUST_ID);
    expect(mockSub.save).toHaveBeenCalled();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Subscription transferred successfully",
        newCustomer: mockCreatedCustomer,
        transfer: expect.objectContaining({
          previousCustomerId: EXISTING_CUST_A,
          newCustomerId: NEW_CUST_ID,
          transferDate: "2026-09-15"
        })
      })
    );
  });

  test("Duplicate phone for same owner returns HTTP 409 and does not create customer", async () => {
    req = {
      params: { id: SUB_ID },
      body: {
        newCustomer: {
          name: "Duplicate User",
          phone: "9876543210",
          address: "Delhi"
        },
        transferDate: "2026-09-15"
      },
      user: { id: OWNER_A }
    };

    Subscription.findOne.mockResolvedValue({
      _id: SUB_ID,
      ownerId: OWNER_A,
      customerId: EXISTING_CUST_A,
      startDate: new Date("2026-09-01"),
      status: "active"
    });

    // Phone already exists for OWNER_A
    Customer.findOne.mockResolvedValue({
      _id: "cust_existing",
      phone: "9876543210",
      ownerId: OWNER_A
    });

    await transferSubscription(req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Customer with this phone number already exists"
      })
    );
    expect(Customer.create).not.toHaveBeenCalled();
  });

  test("Invalid new customer data (missing name/phone/address) returns 400 and creates no customer", async () => {
    req = {
      params: { id: SUB_ID },
      body: {
        newCustomer: {
          name: "",
          phone: "9876543210",
          address: "Delhi"
        },
        transferDate: "2026-09-15"
      },
      user: { id: OWNER_A }
    };

    Subscription.findOne.mockResolvedValue({
      _id: SUB_ID,
      ownerId: OWNER_A,
      customerId: EXISTING_CUST_A,
      startDate: new Date("2026-09-01"),
      status: "active"
    });

    await transferSubscription(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(Customer.create).not.toHaveBeenCalled();
  });

  test("Rollback on transfer failure: cleans up newly created customer if assignment fails", async () => {
    req = {
      params: { id: SUB_ID },
      body: {
        newCustomer: {
          name: "Rollback User",
          phone: "9876543999",
          address: "Mumbai"
        },
        transferDate: "2026-09-15"
      },
      user: { id: OWNER_A }
    };

    const mockCreatedCustomer = {
      _id: "cust_to_rollback",
      name: "Rollback User",
      ownerId: OWNER_A
    };

    Subscription.findOne.mockResolvedValue({
      _id: SUB_ID,
      ownerId: OWNER_A,
      customerId: EXISTING_CUST_A,
      startDate: new Date("2026-09-01"),
      status: "active",
      save: jest.fn()
    });

    Customer.findOne.mockResolvedValue(null);
    Customer.create.mockResolvedValue(mockCreatedCustomer);
    Customer.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });

    // Simulate downstream error when saving assignment
    SubscriptionAssignment.findOne.mockRejectedValue(new Error("Database connection lost during transfer"));

    await transferSubscription(req, res, next);

    // Verify error was forwarded to error handler
    expect(next).toHaveBeenCalledWith(expect.any(Error));

    // Verify newly created customer was rolled back / deleted so no orphan remains
    expect(Customer.deleteOne).toHaveBeenCalledWith({
      _id: "cust_to_rollback",
      ownerId: OWNER_A
    });
  });

  test("Cross-owner phone isolation: Owner A's phone does not block Owner B from transferring to new customer with same phone", async () => {
    req = {
      params: { id: SUB_ID },
      body: {
        newCustomer: {
          name: "Owner B Customer",
          phone: "9876543210", // exists for Owner A, but not Owner B
          address: "Goa"
        },
        transferDate: "2026-09-15"
      },
      user: { id: OWNER_B }
    };

    Subscription.findOne.mockResolvedValue({
      _id: SUB_ID,
      ownerId: OWNER_B,
      customerId: "cust_b_old",
      startDate: new Date("2026-09-01"),
      status: "active",
      save: jest.fn().mockResolvedValue(true)
    });

    // Check query only searches for OWNER_B
    Customer.findOne.mockImplementation(({ ownerId, phone }) => {
      if (ownerId === OWNER_B && phone === "9876543210") return Promise.resolve(null);
      return Promise.resolve(null);
    });

    Customer.create.mockResolvedValue({
      _id: "cust_b_new",
      ownerId: OWNER_B,
      name: "Owner B Customer"
    });

    SubscriptionAssignment.findOne.mockResolvedValue({
      subscriptionId: SUB_ID,
      ownerId: OWNER_B,
      customerId: "cust_b_old",
      startDate: new Date("2026-09-01"),
      save: jest.fn().mockResolvedValue(true)
    });

    SubscriptionAssignment.create.mockResolvedValue({
      _id: "assign_b_new",
      customerId: "cust_b_new"
    });

    await transferSubscription(req, res, next);

    expect(Customer.findOne).toHaveBeenCalledWith({
      ownerId: OWNER_B,
      phone: "9876543210"
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("Billing after new customer transfer: splits correctly between original and newly created customer", () => {
    // Sep 1-14: Customer A (10 weekdays)
    // Sep 15-30: New Customer B (12 weekdays)
    // Month = Sep 2026 (22 weekdays total)
    // ₹3,000 monthly plan
    const assignments = [
      {
        customerId: "cust_A",
        customerName: "Customer A",
        startDate: new Date("2026-09-01"),
        endDate: new Date("2026-09-14")
      },
      {
        customerId: "new_cust_B",
        customerName: "New Customer B",
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

    const custA = result.customerBreakdown.find((c) => c.customerId === "cust_A");
    const custB = result.customerBreakdown.find((c) => c.customerId === "new_cust_B");

    expect(custA.servedDays).toBe(10);
    expect(custA.amount).toBe(1363.64);

    expect(custB.servedDays).toBe(12);
    expect(custB.amount).toBe(1636.36);

    expect(custA.amount + custB.amount).toBe(3000);
  });
});
