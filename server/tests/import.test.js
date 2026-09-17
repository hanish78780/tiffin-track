const Customer = require("../models/Customer");
const Subscription = require("../models/Subscription");
const SubscriptionAssignment = require("../models/SubscriptionAssignment");
const { importCustomers } = require("../controllers/customerImportController");
const {
  normalizePhone,
  normalizeDate,
  parseCSV
} = require("../utils/importUtils");

jest.mock("../models/Customer");
jest.mock("../models/Subscription");
jest.mock("../models/SubscriptionAssignment");

describe("T4: Messy Customer Import", () => {
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

  describe("Normalization & Parser Unit Tests", () => {
    test("Phone normalization: handles spaces, dashes, dots, +91, 91, 0 prefix", () => {
      expect(normalizePhone("9876543210")).toBe("9876543210");
      expect(normalizePhone("98765 43210")).toBe("9876543210");
      expect(normalizePhone("98765-43210")).toBe("9876543210");
      expect(normalizePhone("+91 9876543210")).toBe("9876543210");
      expect(normalizePhone("+91-98765-43210")).toBe("9876543210");
      expect(normalizePhone("919876543210")).toBe("9876543210");
      expect(normalizePhone("09876543210")).toBe("9876543210");
      expect(normalizePhone("12345")).toBeNull(); // invalid length
      expect(normalizePhone("")).toBeNull();
      expect(normalizePhone(null)).toBeNull();
    });

    test("Date normalization: handles YYYY-MM-DD, DD/MM/YYYY, D/M/YYYY, DD-MM-YYYY", () => {
      // 2026-09-01
      const d1 = normalizeDate("2026-09-01");
      expect(d1.getUTCFullYear()).toBe(2026);
      expect(d1.getUTCMonth()).toBe(8); // September (0-indexed)
      expect(d1.getUTCDate()).toBe(1);

      // 01/09/2026 (DD/MM/YYYY)
      const d2 = normalizeDate("01/09/2026");
      expect(d2.getUTCFullYear()).toBe(2026);
      expect(d2.getUTCMonth()).toBe(8);
      expect(d2.getUTCDate()).toBe(1);

      // 15-09-2026 (DD-MM-YYYY)
      const d3 = normalizeDate("15-09-2026");
      expect(d3.getUTCFullYear()).toBe(2026);
      expect(d3.getUTCMonth()).toBe(8);
      expect(d3.getUTCDate()).toBe(15);

      // 9-1-2026
      const d4 = normalizeDate("9-1-2026");
      expect(d4).not.toBeNull();

      // Invalid date
      expect(normalizeDate("invalid-date")).toBeNull();
      expect(normalizeDate("2026-02-31")).toBeNull(); // Feb 31 does not exist
    });

    test("parseCSV handles quotes, commas in values, and trims headers", () => {
      const csv = `name,phone,address,planName,monthlyPrice,startDate\n"Sharma, Rahul",9876543210,"Jaipur, Rajasthan",Monthly Lunch,3000,2026-09-01`;
      const rows = parseCSV(csv);
      expect(rows).toHaveLength(1);
      expect(rows[0].data.name).toBe("Sharma, Rahul");
      expect(rows[0].data.address).toBe("Jaipur, Rajasthan");
      expect(rows[0].data.phone).toBe("9876543210");
    });
  });

  describe("importCustomers Controller Endpoint", () => {
    test("Imports clean CSV data successfully", async () => {
      const csv = [
        "name,phone,address,planName,monthlyPrice,startDate",
        "Rahul Sharma,9876543210,Jaipur,Monthly Lunch,3000,2026-09-01",
        "Priya Verma,9876543211,Jaipur,Monthly Lunch,3000,2026-09-01"
      ].join("\n");

      req = {
        body: { csv },
        user: { id: OWNER_A }
      };

      Customer.findOne.mockResolvedValue(null); // No existing customers
      Customer.create.mockImplementation((data) => Promise.resolve({ _id: `cust_${data.phone}`, ...data }));
      Subscription.create.mockImplementation((data) => Promise.resolve({ _id: `sub_${data.customerId}`, ...data }));
      SubscriptionAssignment.create.mockResolvedValue({});

      await importCustomers(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          imported: 2,
          deduped: 0,
          rejected: 0
        })
      );
    });

    test("Deduplicates duplicate phone within import file", async () => {
      const csv = [
        "name,phone,address,planName,monthlyPrice,startDate",
        "Rahul Sharma,98765 43210,Jaipur,Monthly Lunch,3000,2026-09-01",
        "Rahul Sharma Duplicate,98765-43210,Jaipur,Monthly Lunch,3000,2026-09-01"
      ].join("\n");

      req = {
        body: { csv },
        user: { id: OWNER_A }
      };

      Customer.findOne.mockResolvedValue(null);
      Customer.create.mockResolvedValue({ _id: "cust_1", name: "Rahul Sharma" });
      Subscription.create.mockResolvedValue({ _id: "sub_1" });
      SubscriptionAssignment.create.mockResolvedValue({});

      await importCustomers(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          imported: 1,
          deduped: 1,
          rejected: 0
        })
      );
    });

    test("Deduplicates phone that already exists in database for this owner", async () => {
      const csv = [
        "name,phone,address,planName,monthlyPrice,startDate",
        "Rahul Sharma,9876543210,Jaipur,Monthly Lunch,3000,2026-09-01"
      ].join("\n");

      req = {
        body: { csv },
        user: { id: OWNER_A }
      };

      // Customer already in DB for Owner A
      Customer.findOne.mockResolvedValue({
        _id: "existing_cust_id",
        name: "Rahul Sharma",
        phone: "9876543210"
      });

      await importCustomers(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          imported: 0,
          deduped: 1,
          rejected: 0
        })
      );
      expect(Customer.create).not.toHaveBeenCalled();
    });

    test("Rejects rows with missing name, missing phone, invalid date, non-positive price", async () => {
      const csv = [
        "name,phone,address,planName,monthlyPrice,startDate",
        ",9876543210,Jaipur,Monthly Lunch,3000,2026-09-01", // missing name
        "Amit Sharma,,Jaipur,Monthly Lunch,3000,2026-09-01", // missing phone
        "Sneha Rao,9876543212,Jaipur,Monthly Lunch,-500,2026-09-01", // negative price
        "Vikram Singh,9876543213,Jaipur,Monthly Lunch,3000,invalid-date" // invalid date
      ].join("\n");

      req = {
        body: { csv },
        user: { id: OWNER_A }
      };

      await importCustomers(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          imported: 0,
          deduped: 0,
          rejected: 4
        })
      );
    });

    test("Full messy dataset: mixed valid, duplicate, and invalid rows", async () => {
      // The classic Builder Challenge messy dataset
      const csv = [
        "name,phone,address,planName,monthlyPrice,startDate",
        "Rahul Sharma,9876543210,Jaipur,Monthly Lunch,3000,01/09/2026", // valid 1
        "Rahul Sharma,9876543210,Jaipur,Monthly Lunch,3000,2026-09-01", // duplicate phone (deduped)
        "Priya Verma,9876543211,Jaipur,Monthly Lunch,3000,9-1-2026", // valid 2
        ",9876543212,Jaipur,Monthly Lunch,3000,2026-09-01", // missing name (rejected)
        "Amit, ,Jaipur,Monthly Lunch,3000,2026-09-01" // missing phone (rejected)
      ].join("\n");

      req = {
        body: { csv },
        user: { id: OWNER_A }
      };

      Customer.findOne.mockResolvedValue(null);
      Customer.create.mockImplementation((d) => Promise.resolve({ _id: `c_${d.phone}`, ...d }));
      Subscription.create.mockImplementation((d) => Promise.resolve({ _id: `s_${d.customerId}`, ...d }));
      SubscriptionAssignment.create.mockResolvedValue({});

      await importCustomers(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          imported: 2,
          deduped: 1,
          rejected: 2,
          summary: {
            imported: 2,
            deduped: 1,
            rejected: 2
          }
        })
      );
    });

    test("Multi-owner isolation: Owner A's existing customer does not block Owner B from importing same phone", async () => {
      const csv = [
        "name,phone,address,planName,monthlyPrice,startDate",
        "Priya Patel,9876543210,Mumbai,Monthly Lunch,3000,2026-09-01"
      ].join("\n");

      req = {
        body: { csv },
        user: { id: OWNER_B } // Owner B importing
      };

      // Owner A has this phone, but Owner B does not!
      Customer.findOne.mockImplementation(({ ownerId, phone }) => {
        if (ownerId === OWNER_A && phone === "9876543210") {
          return Promise.resolve({ _id: "cust_owner_a" });
        }
        return Promise.resolve(null); // Owner B does not have it
      });

      Customer.create.mockResolvedValue({ _id: "cust_owner_b", ownerId: OWNER_B });
      Subscription.create.mockResolvedValue({ _id: "sub_owner_b" });
      SubscriptionAssignment.create.mockResolvedValue({});

      await importCustomers(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          imported: 1,
          deduped: 0,
          rejected: 0
        })
      );
      expect(Customer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerId: OWNER_B,
          phone: "9876543210"
        })
      );
    });
  });
});
