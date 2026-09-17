const Subscription = require("../models/Subscription");
const Customer = require("../models/Customer");
const PausePeriod = require("../models/PausePeriod");
const NotificationOutbox = require("../models/NotificationOutbox");
const SubscriptionAssignment = require("../models/SubscriptionAssignment");
const { advanceClock } = require("../controllers/clockController");
const { getOutbox, clearOutbox } = require("../controllers/outboxController");

// Mock the models
jest.mock("../models/Subscription");
jest.mock("../models/Customer");
jest.mock("../models/PausePeriod");
jest.mock("../models/NotificationOutbox");
jest.mock("../models/SubscriptionAssignment");

describe("T1: Delivery Notifications & Clock Trigger", () => {
  let req, res, next;
  const OWNER_A = "owner_a_123";
  const OWNER_B = "owner_b_456";

  beforeEach(() => {
    jest.clearAllMocks();
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    SubscriptionAssignment.findOne.mockReturnValue({
      sort: jest.fn().mockResolvedValue(null)
    });
  });

  test("Active weekday -> notification generated", async () => {
    // 2026-09-14 is a Monday
    req = {
      body: { date: "2026-09-14" },
      user: { id: OWNER_A }
    };

    const mockSub = {
      _id: "sub_1",
      ownerId: OWNER_A,
      customerId: "cust_1",
      planName: "Monthly Lunch",
      startDate: new Date("2026-09-01"),
      status: "active"
    };

    const mockCust = {
      _id: "cust_1",
      name: "Rahul Sharma",
      phone: "9876543210"
    };

    Subscription.find.mockResolvedValue([mockSub]);
    PausePeriod.find.mockResolvedValue([]);
    Customer.findById.mockResolvedValue(mockCust);

    NotificationOutbox.create.mockResolvedValue({
      _id: "outbox_1",
      type: "tiffin_delivery",
      customerId: "cust_1",
      customerName: "Rahul Sharma",
      phone: "9876543210",
      deliveryDate: "2026-09-14",
      subscriptionId: "sub_1"
    });

    await advanceClock(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        date: "2026-09-14",
        isWeekday: true,
        eligible: 1,
        notified: 1
      })
    );
    expect(NotificationOutbox.create).toHaveBeenCalledWith(
      expect.objectContaining({
        deliveryEventKey: "sub_1_2026-09-14",
        phone: "9876543210",
        type: "tiffin_delivery"
      })
    );
  });

  test("Active weekend -> no notification (Saturday/Sunday)", async () => {
    // 2026-09-12 is a Saturday
    req = {
      body: { date: "2026-09-12" },
      user: { id: OWNER_A }
    };

    await advanceClock(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        date: "2026-09-12",
        isWeekday: false,
        eligible: 0,
        notified: 0
      })
    );
    expect(Subscription.find).not.toHaveBeenCalled();
    expect(NotificationOutbox.create).not.toHaveBeenCalled();
  });

  test("Paused weekday -> no notification", async () => {
    // 2026-09-15 is a Tuesday
    req = {
      body: { date: "2026-09-15" },
      user: { id: OWNER_A }
    };

    const mockSub = {
      _id: "sub_1",
      ownerId: OWNER_A,
      customerId: "cust_1",
      startDate: new Date("2026-09-01"),
      status: "active"
    };

    Subscription.find.mockResolvedValue([mockSub]);
    // Paused from Sep 10 to Sep 16
    PausePeriod.find.mockResolvedValue([
      {
        subscriptionId: "sub_1",
        startDate: new Date("2026-09-10"),
        endDate: new Date("2026-09-16")
      }
    ]);

    await advanceClock(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        eligible: 0,
        notified: 0
      })
    );
    expect(NotificationOutbox.create).not.toHaveBeenCalled();
  });

  test("Multiple mixed customers -> only eligible customer notified", async () => {
    // 2026-09-15 (Tuesday)
    req = {
      body: { date: "2026-09-15" },
      user: { id: OWNER_A }
    };

    const sub1 = {
      _id: "sub_1",
      ownerId: OWNER_A,
      customerId: "cust_1",
      startDate: new Date("2026-09-01"),
      status: "active"
    };

    const sub2 = {
      _id: "sub_2",
      ownerId: OWNER_A,
      customerId: "cust_2",
      startDate: new Date("2026-09-01"),
      status: "active"
    };

    Subscription.find.mockResolvedValue([sub1, sub2]);

    // Sub 1 is paused on Sep 15
    PausePeriod.find.mockImplementation(({ subscriptionId }) => {
      if (subscriptionId === "sub_1") {
        return Promise.resolve([
          { startDate: new Date("2026-09-14"), endDate: new Date("2026-09-18") }
        ]);
      }
      return Promise.resolve([]);
    });

    Customer.findById.mockResolvedValue({
      _id: "cust_2",
      name: "Priya Verma",
      phone: "9876543211"
    });

    NotificationOutbox.create.mockResolvedValue({
      _id: "outbox_2",
      type: "tiffin_delivery",
      customerId: "cust_2",
      phone: "9876543211",
      deliveryDate: "2026-09-15"
    });

    await advanceClock(req, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        eligible: 1,
        notified: 1
      })
    );
    expect(NotificationOutbox.create).toHaveBeenCalledTimes(1);
    expect(NotificationOutbox.create).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionId: "sub_2",
        phone: "9876543211"
      })
    );
  });

  test("Duplicate clock advance -> idempotent, no duplicate events", async () => {
    // 2026-09-14
    req = {
      body: { date: "2026-09-14" },
      user: { id: OWNER_A }
    };

    const mockSub = {
      _id: "sub_1",
      ownerId: OWNER_A,
      customerId: "cust_1",
      startDate: new Date("2026-09-01"),
      status: "active"
    };

    Subscription.find.mockResolvedValue([mockSub]);
    PausePeriod.find.mockResolvedValue([]);
    Customer.findById.mockResolvedValue({
      _id: "cust_1",
      name: "Rahul",
      phone: "9876543210"
    });

    // Simulate MongoDB unique constraint duplicate error (code 11000)
    const duplicateErr = new Error("E11000 duplicate key error collection");
    duplicateErr.code = 11000;
    NotificationOutbox.create.mockRejectedValue(duplicateErr);

    await advanceClock(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        eligible: 1,
        notified: 0 // 0 newly notified because already present
      })
    );
  });

  test("Future subscription -> not notified if startDate > deliveryDate", async () => {
    // 2026-09-01 (Tuesday)
    req = {
      body: { date: "2026-09-01" },
      user: { id: OWNER_A }
    };

    // Subscription only starts on Sep 15
    const futureSub = {
      _id: "sub_future",
      ownerId: OWNER_A,
      customerId: "cust_1",
      startDate: new Date("2026-09-15"),
      status: "active"
    };

    Subscription.find.mockResolvedValue([futureSub]);

    await advanceClock(req, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        eligible: 0,
        notified: 0
      })
    );
    expect(NotificationOutbox.create).not.toHaveBeenCalled();
  });

  test("Cross-owner isolation: Owner A never notifies Owner B's customers", async () => {
    // Request by Owner A
    req = {
      body: { date: "2026-09-14" },
      user: { id: OWNER_A }
    };

    Subscription.find.mockImplementation((filter) => {
      // Must enforce ownerId filter
      expect(filter.ownerId).toBe(OWNER_A);
      return Promise.resolve([]);
    });

    await advanceClock(req, res, next);

    expect(Subscription.find).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId: OWNER_A
      })
    );
  });

  test("Outbox queries: GET /outbox returns recorded notifications", async () => {
    const mockEvents = [
      {
        _id: "out_1",
        type: "tiffin_delivery",
        customerId: "cust_1",
        customerName: "Rahul Sharma",
        phone: "9876543210",
        deliveryDate: "2026-09-14",
        subscriptionId: "sub_1",
        planName: "Monthly Lunch",
        status: "delivered",
        createdAt: new Date()
      }
    ];

    NotificationOutbox.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue(mockEvents)
    });

    req = {
      query: { date: "2026-09-14" },
      baseUrl: "/outbox"
    };

    await getOutbox(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          type: "tiffin_delivery",
          phone: "9876543210"
        })
      ])
    );
  });
});
