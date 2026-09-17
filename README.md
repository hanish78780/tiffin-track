# TiffinTrack

A modern full-stack web application for home-style tiffin (lunch delivery) services. Owners register, add customers, manage monthly subscriptions, pause/resume weekday deliveries (for travel or festivals), and generate pro-rated monthly bills — charging customers strictly for the weekdays actually served.

---

## The Problem

A tiffin service delivers lunch every weekday (Monday through Friday). Customers subscribe to a monthly plan. When they need to pause (holidays, vacations, festivals), they shouldn't be charged for paused days. At month-end, the owner needs each customer's bill: the plan price pro-rated for the days actually delivered.

---

## Features

- **Owner Authentication** — Secure register, login, and JWT-authenticated session with multi-tenant isolation.
- **Customer Management** — Add, edit, list, and search customers by name or phone with server-side pagination and sorting.
- **Monthly Subscriptions** — Assign subscriptions with customizable plan names, prices, and start dates. Prevents duplicate active subscriptions.
- **Pause & Resume Workflow** — Modal-based pause (with start date & optional reason) and resume actions that record pause intervals.
- **Pro-Rated Billing Engine** — Calculates calendar month weekdays (Mon–Fri), deducts pause intervals, handles weekend pauses, overlapping pauses, open-ended pauses, and leap years.
- **Multi-Tenant Ownership Isolation** — Every customer, subscription, pause record, and bill is scoped to `ownerId = req.user.id`.
- **Modern Responsive SaaS UI** — Clean green/amber/charcoal design with Lucide icons, mobile navigation drawer, KPI cards, and step-by-step billing breakdown.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite, Tailwind CSS v4, React Router v7, Axios, Lucide React |
| **Backend** | Node.js, Express.js, MongoDB, Mongoose |
| **Authentication** | JSON Web Tokens (JWT), bcryptjs |
| **Testing** | Jest (65/65 unit, integration, & isolation tests passing) |

---

## Builder Challenge Twists (T1, T6, T4)

### 1. Level 1 — T1: Delivery Notifications & Outbox Pattern
- **Overview:** Automatically determines customers due for lunch delivery each morning via clock advancement.
- **Trigger:** `POST /clock` (and `POST /api/clock`) with optional date payload (`{ "date": "YYYY-MM-DD" }`).
- **Inspection:** `GET /outbox` (and `GET /api/outbox`), `DELETE /outbox` (for test reset).
- **Eligibility Rules:**
  1. Date is Monday through Friday (Saturdays and Sundays strictly excluded).
  2. Subscription is active and started on or before the target date.
  3. Subscription is not covered by any active pause period on that date.
  4. Active assignee determined dynamically (supports historical transfers).
  5. Multi-tenant isolation enforced if authenticated.
- **Idempotency:** Driven by a durable MongoDB outbox collection with unique compound constraint on `deliveryEventKey` (`${subscriptionId}_${deliveryDate}`). Repeating the clock tick for the same date will not duplicate notifications.

### 2. Level 2 — T6: Subscription Transfer & Split Billing
- **Overview:** Allows transferring an ongoing subscription to a new customer mid-cycle.
- **Endpoint:** `POST /api/subscriptions/:id/transfer` with `{ "newCustomerId": "...", "transferDate": "YYYY-MM-DD" }`.
- **Preserved Invariants:**
  - Monthly plan price and plan name remain unchanged.
  - Billing cycle and original subscription start date carry over.
  - Existing pause history remains valid.
- **Split Billing Engine:**
  - `SubscriptionAssignment` records immutable historical ownership intervals.
  - Billing walks every served weekday in the month, attributing each day to the customer holding the plan on that date.
  - Response provides detailed `customerBreakdown: [{ customerId, customerName, servedDays, amount }]`.
  - Pro-rated amounts are reconciled so `sum(amounts) === totalBill` down to the exact cent.

### 3. Level 3 — T4: Messy Customer Import
- **Overview:** Imports messy CSV customer lists into clean customers and subscriptions.
- **Endpoint:** `POST /api/customers/import` (accepts raw `text/csv` or JSON `{ "csv": "..." }`).
- **Normalization:**
  - **Phone:** Strips whitespace, dashes, parentheses, dots; handles `+91`, `91`, and leading `0` prefixes to extract standard 10-digit Indian numbers.
  - **Date:** Robust parsing for `YYYY-MM-DD`, `DD/MM/YYYY`, `D/M/YYYY`, `DD-MM-YYYY`, `D-M-YYYY`, and `MM/DD/YYYY` in UTC midnight.
- **Deduplication:**
  - In-batch deduplication: First valid occurrence is canonical; subsequent duplicate phones within the file are marked `deduped`.
  - Database deduplication: Compares against existing customers under the authenticated owner (`(ownerId, phone)`).
- **Validation & Rejection:** Missing required name, phone, planName, non-positive price, or unparseable dates are safely rejected without failing valid rows.
- **Report Structure:** Returns clear `{ imported, deduped, rejected }` counts and detailed row-level reports.

---

## Running Backend Tests

```bash
cd server
npm test
```

**Test Suite Coverage (65 Tests Total):**
- **Billing Engine (24 tests):**
  - Weekday counts across standard months, leap years (Feb 2024), and non-leap years (Feb 2023)
  - Full month served (no pauses)
  - Single weekday pause
  - Pauses spanning weekends (weekends excluded from pause counts)
  - Multiple non-overlapping pause intervals
  - Overlapping pause intervals (deduplicated via UTC Set)
  - Partial month pauses clamped to month boundaries
  - Open-ended pauses (`endDate: null`) extending to end-of-month
  - Cross-month open pauses: subsequent month billed at ₹0.00
  - Cross-month resume mid-month: partial month charge
  - Currency rounding: single-step rounding to 2 decimal places
  - Entire month paused: ₹0.00 bill
- **Authorization & Ownership (13 tests):**
  - Owner A access vs Owner B denial for customers, subscriptions, pauses, and billing
  - Phone search scoped strictly to authenticated owner
  - Cross-owner query isolation
- **T1 Delivery Notifications & Clock (8 tests):**
  - Active weekday notification generation
  - Weekend skip (Saturday/Sunday no notifications)
  - Paused weekday skip
  - Mixed customer eligibility filter
  - Clock tick idempotency (no duplicate events on duplicate run)
  - Future subscription skip (before start date)
  - Cross-owner notification isolation
  - Outbox inspection
- **T6 Subscription Transfer & Split Billing (12 tests):**
  - Mid-cycle transfer with accurate weekday-split billing
  - Transfer with active pause period reconciliation
  - Transfer on first day and last day of month
  - Cross-month history preservation
  - Controller validations: 404 missing target, 400 same customer, 409 target has active plan, 400 transfer date before start date, 404 cross-owner transfer
- **T4 Messy Customer Import (8 tests):**
  - Phone normalization across formats and prefixes
  - Mixed date format parsing
  - Quoted CSV parsing
  - Clean CSV import
  - In-batch duplicate phone deduplication
  - Database duplicate phone deduplication
  - Row rejection on missing required fields
  - Full mixed messy dataset processing
  - Multi-owner isolation during import

---

## Frontend Application Routes

| Route | Page | Description | Auth Required |
|---|---|---|:---:|
| `/` | Landing Page | Product overview, value proposition, and CTA | No |
| `/login` | Login | Owner authentication with JWT retrieval | No |
| `/register` | Register | New owner account creation with auto-login | No |
| `/dashboard` | Dashboard | KPI cards (customers, active/paused subs, volume, today's deliveries), quick actions | Yes |
| `/customers` | Customers | Full customer table with search, sorting, pagination, Phone Lookup, and CSV Import modal (T4) | Yes |
| `/customers/new` | New Customer | Create customer form with prompt to create subscription | Yes |
| `/customers/:id` | Customer Details | Contact info, linked subscription status, actions | Yes |
| `/customers/:id/edit` | Edit Customer | Update customer contact & delivery address | Yes |
| `/subscriptions` | Subscriptions | Table with Active/Paused filter tabs and pause/resume buttons | Yes |
| `/subscriptions/new` | New Subscription | Assign customer to lunch plan with price & start date | Yes |
| `/subscriptions/:id` | Subscription Details | Plan status, pause history, ownership transfer history (T6), pause/resume/transfer modals | Yes |
| `/billing` | Monthly Billing | Customer & month selector, pro-rated bill card, calculation breakdown, customer split breakdown (T6) | Yes |

---

## Backend API Endpoints

### Authentication
- `POST /api/auth/register` — Register a new owner (`name`, `email`, `password`)
- `POST /api/auth/login` — Sign in and receive JWT (`email`, `password`)
- `GET /api/auth/me` — Get authenticated user details (Bearer token required)

### Customers (Owner-Scoped)
- `POST /api/customers` — Create customer (`name`, `phone`, `address`)
- `GET /api/customers` — List/search customers (`search`, `page`, `limit`, `sort`, `order`)
- `GET /api/customers/:id` — Get customer by ID
- `PUT /api/customers/:id` — Update customer by ID
- `GET /api/customers/phone/:phone` — Lookup customer by phone
- `POST /api/customers/import` — Import messy CSV customer list with { imported, deduped, rejected } report (T4)

### Subscriptions (Owner-Scoped)
- `POST /api/subscriptions` — Create subscription (`customerId`, `planName`, `monthlyPrice`, `startDate`)
- `GET /api/subscriptions` — List subscriptions (`status`, `page`, `limit`, `sort`, `order`)
- `GET /api/subscriptions/:id` — Get subscription details with pause and assignment history
- `POST /api/subscriptions/:id/pause` — Pause subscription (`startDate`, `reason`)
- `POST /api/subscriptions/:id/resume` — Resume subscription (`resumeDate`)
- `POST /api/subscriptions/:id/transfer` — Transfer subscription to new customer mid-cycle (T6)

### Billing (Owner-Scoped)
- `GET /api/billing/:customerId?month=YYYY-MM` — Pro-rated bill calculation (supports split breakdown for transferred plans)

### Clock & Outbox (T1 Grader Integration)
- `POST /clock` (and `POST /api/clock`) — Advance clock and trigger morning delivery notifications
- `GET /outbox` (and `GET /api/outbox`) — Inspect notification events in the durable outbox
- `DELETE /outbox` (and `DELETE /api/outbox`) — Clear outbox events (test isolation)

---

## Pro-Rated Billing Formula

```text
totalWeekdays  = weekdays (Monday–Friday) in calendar month
pausedDays     = unique weekdays falling within any recorded pause period
servedDays     = totalWeekdays - pausedDays
dailyRate      = monthlyPrice / totalWeekdays
totalBill      = round(dailyRate * servedDays, 2)
```

### Calculation Example
- Monthly Price: ₹3,000
- Month: September 2026 (22 weekdays)
- Pause Period: Sep 10 to Sep 15 (inclusive: Thu 10, Fri 11, Mon 14, Tue 15 = 4 weekdays)
- Daily Rate = 3,000 ÷ 22 = ₹136.36 / day
- Served Days = 22 - 4 = 18 weekdays
- Final Bill = ₹136.36 × 18 = **₹2,454.55**

---

## Project Structure

```text
tiffin-track/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/         # Button, Input, Select, Modal, Card, KpiCard, StatusBadge, Pagination, Skeletons
│   │   │   ├── layout/         # Sidebar, Header, AppLayout
│   │   │   ├── subscriptions/  # PauseModal, ResumeModal, TransferModal (T6)
│   │   │   ├── customers/      # CustomerImportModal (T4)
│   │   │   └── billing/        # BillingCard (with T6 split breakdown), BillingBreakdown
│   │   ├── pages/              # Landing, Login, Register, Dashboard, Customers, Subscriptions, Billing
│   │   ├── context/            # AuthContext, ToastContext
│   │   ├── services/           # Axios API instance & domain services
│   │   ├── routes/             # ProtectedRoute guard
│   │   ├── App.jsx             # React Router structure
│   │   ├── main.jsx
│   │   └── index.css           # Tailwind CSS directives
│   ├── .env.example
│   ├── package.json
│   └── vite.config.js
│
├── server/
│   ├── config/                 # MongoDB database connector
│   ├── controllers/            # auth, customer, customerImport, subscription, billing, clock, outbox
│   ├── middleware/             # authMiddleware (JWT protect & optionalProtect), errorHandler
│   ├── models/                 # User, Customer, Subscription, PausePeriod, SubscriptionAssignment, NotificationOutbox
│   ├── routes/                 # authRoutes, customerRoutes, subscriptionRoutes, billingRoutes, clockRoutes, outboxRoutes
│   ├── tests/                  # billing.test.js, authorization.test.js, clock.test.js, transfer.test.js, import.test.js
│   ├── utils/                  # billing.js (pro-rated billing engine), importUtils.js (CSV, phone, date parser)
│   ├── .env.example
│   ├── package.json
│   └── server.js
│
├── README.md
├── REASONING.md
└── AI_LOGS.md
```

---

## License

ISC
