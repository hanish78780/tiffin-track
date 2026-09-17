const mongoose = require("mongoose");
const Customer = require("../models/Customer");
const Subscription = require("../models/Subscription");
const SubscriptionAssignment = require("../models/SubscriptionAssignment");
const { deleteCustomer } = require("../controllers/customerController");

jest.mock("../models/Customer");
jest.mock("../models/Subscription");
jest.mock("../models/SubscriptionAssignment");

describe("Issue 1: Customer Safe Deletion", () => {
  const OWNER_A = "507f1f77bcf86cd799439001";
  const OWNER_B = "507f1f77bcf86cd799439002";
  const VALID_CUST_ID = "507f1f77bcf86cd799439011";

  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
  });

  test("Rejects invalid ObjectId format with 400", async () => {
    req = {
      params: { id: "invalid-id" },
      user: { id: OWNER_A }
    };

    await deleteCustomer(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Invalid ID format"
      })
    );
  });

  test("Returns 404 when customer does not exist for this owner", async () => {
    req = {
      params: { id: VALID_CUST_ID },
      user: { id: OWNER_A }
    };

    Customer.findOne.mockResolvedValue(null);

    await deleteCustomer(req, res, next);

    expect(Customer.findOne).toHaveBeenCalledWith({
      _id: VALID_CUST_ID,
      ownerId: OWNER_A
    });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Customer not found"
      })
    );
  });

  test("Cross-owner protection: Owner B cannot delete Owner A's customer (returns 404)", async () => {
    req = {
      params: { id: VALID_CUST_ID },
      user: { id: OWNER_B }
    };

    Customer.findOne.mockResolvedValue(null);

    await deleteCustomer(req, res, next);

    expect(Customer.findOne).toHaveBeenCalledWith({
      _id: VALID_CUST_ID,
      ownerId: OWNER_B
    });
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test("Rejects delete with 409 if customer has an active subscription", async () => {
    req = {
      params: { id: VALID_CUST_ID },
      user: { id: OWNER_A }
    };

    Customer.findOne.mockResolvedValue({
      _id: VALID_CUST_ID,
      name: "Rahul Sharma",
      ownerId: OWNER_A
    });

    Subscription.findOne.mockResolvedValue({
      _id: "sub_active_1",
      customerId: VALID_CUST_ID,
      ownerId: OWNER_A,
      status: "active"
    });

    SubscriptionAssignment.findOne.mockResolvedValue(null);

    await deleteCustomer(req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Cannot delete customer with an active subscription. Please end or cancel the subscription first."
      })
    );
    expect(Customer.deleteOne).not.toHaveBeenCalled();
  });

  test("Rejects delete with 409 if customer is current assignee of an active transferred subscription", async () => {
    req = {
      params: { id: VALID_CUST_ID },
      user: { id: OWNER_A }
    };

    Customer.findOne.mockResolvedValue({
      _id: VALID_CUST_ID,
      name: "Transferred Customer",
      ownerId: OWNER_A
    });

    // Direct subscription query returns null
    Subscription.findOne.mockImplementation(({ _id, customerId, status }) => {
      if (customerId === VALID_CUST_ID && status === "active") return Promise.resolve(null);
      if (_id === "sub_transferred_1" && status === "active") {
        return Promise.resolve({
          _id: "sub_transferred_1",
          status: "active",
          ownerId: OWNER_A
        });
      }
      return Promise.resolve(null);
    });

    // Active assignment exists
    SubscriptionAssignment.findOne.mockResolvedValue({
      subscriptionId: "sub_transferred_1",
      customerId: VALID_CUST_ID,
      endDate: null
    });

    await deleteCustomer(req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Cannot delete customer with an active subscription. Please end or cancel the subscription first."
      })
    );
    expect(Customer.deleteOne).not.toHaveBeenCalled();
  });

  test("Allows safe deletion of customer with no active subscription", async () => {
    req = {
      params: { id: VALID_CUST_ID },
      user: { id: OWNER_A }
    };

    Customer.findOne.mockResolvedValue({
      _id: VALID_CUST_ID,
      name: "Inactive Customer",
      ownerId: OWNER_A
    });

    Subscription.findOne.mockResolvedValue(null);
    SubscriptionAssignment.findOne.mockResolvedValue(null);
    Customer.deleteOne.mockResolvedValue({ deletedCount: 1 });

    await deleteCustomer(req, res, next);

    expect(Customer.deleteOne).toHaveBeenCalledWith({
      _id: VALID_CUST_ID,
      ownerId: OWNER_A
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Customer deleted successfully"
      })
    );
  });
});
