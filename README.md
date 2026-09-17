# TiffinTrack

A full-stack management system for home-style tiffin (weekday lunch delivery) services.

TiffinTrack helps a tiffin owner manage customers, monthly subscriptions, pauses/resumes, transfers, delivery notifications, messy CSV imports, and accurate pro-rated billing. The core billing rule is simple: **a customer is charged only for weekdays on which the subscription was actually served**.

---

## Problem

A home-style tiffin service normally delivers lunch Monday through Friday. Customers subscribe to a monthly plan, but real life creates interruptions: travel, festivals, holidays, or other temporary pauses.

The owner needs a system that can:

- subscribe customers to monthly plans;
- pause and resume service without charging paused weekdays;
- transfer a subscription to another customer without losing history;
- calculate bills using the actual weekday service days;
- notify customers due for delivery each morning;
- look up customers by phone; and
- import messy customer data without creating duplicate or partial records.

---

## Core Features

### Customer Management

- Owner registration and JWT authentication
- Customer create, edit, view, and delete workflow
- Owner-scoped phone uniqueness
- Search by name or phone
- Phone lookup endpoint and dedicated UI
- Server-side pagination and sorting
- Protection against deleting a customer with an active subscription

### Monthly Subscriptions

- Custom plan name and monthly price
- Subscription start date
- One active subscription per customer
- Active/paused status
- Pause with reason and date
- Resume with date
- Pause history

### Pro-Rated Billing

Billing is calculated server-side from calendar weekdays rather than a hard-coded 22-day assumption.

For a completed month:

```text
totalWeekdays = Monday-Friday days in the month
pausedDays    = unique weekdays covered by pauses
servedDays    = totalWeekdays - pausedDays
dailyRate     = monthlyPrice / totalWeekdays
totalBill     = round(dailyRate * servedDays, 2)
```

For the **current month**, future dates are not billed. The calculation is capped at the current calendar date while retaining the month's normal daily rate (`monthlyPrice / totalWeekdays`).

The billing engine handles:

- weekends;
- overlapping pauses without double-counting;
- pauses spanning weekends;
- pauses partially outside the selected month;
- open-ended pauses;
- cross-month pauses/resumes;
- leap years; and
- subscription transfers with historical customer ownership.

### T1 — Delivery Notifications & Outbox

Each morning, the clock integration identifies customers due for delivery.

A delivery is eligible only when:

1. the target date is Monday-Friday;
2. the subscription has started by that date;
3. the subscription is active for that date;
4. the date is not covered by a pause;
5. the subscription has a valid customer assignment for that date; and
6. owner isolation is respected.

Notification events are persisted in a durable MongoDB outbox using a unique delivery event key:

```text
subscriptionId + deliveryDate
```

This makes repeated clock ticks for the same business date idempotent.

### T6 — Subscription Transfer & Split Billing

A subscription can be transferred mid-cycle without creating a second monthly plan.

The plan name, monthly price, and original cycle remain unchanged. Historical ownership is stored using `SubscriptionAssignment` intervals so billing can answer which customer was served on each date.

Example:

```text
Customer A: Sep 1 → Sep 14
Customer B: Sep 15 → Sep 30
Plan:       ₹3,000 for the same September cycle
```

The billing engine attributes each served weekday to the customer who held the assignment on that date and reconciles line-item rounding to the final bill.

The transfer flow supports:

- transfer to an existing customer; and
- creating a new customer directly during the transfer workflow.

The new customer is created transactionally with the transfer so a failed transfer does not leave an orphan customer.

### T4 — Messy Customer Import

The application accepts a messy customer CSV and produces a structured report:

```json
{
  "imported": 5,
  "deduped": 2,
  "rejected": 3
}
```

The importer:

- parses quoted CSV fields;
- ignores blank rows;
- normalizes Indian phone-number formatting;
- parses supported date formats into UTC-safe dates;
- deduplicates within the import batch;
- deduplicates against the authenticated owner's existing customers;
- rejects invalid rows independently; and
- creates customer + subscription + initial assignment atomically for valid rows.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React 19, Vite 8, Tailwind CSS 4, React Router 7, Axios, Lucide React |
| Backend | Node.js, Express 4, MongoDB, Mongoose 8 |
| Authentication | JWT, bcryptjs |
| Testing | Jest |

---

## Project Structure

```text
tiffin-track/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/          # Reusable UI primitives
│   │   │   ├── layout/          # App shell, sidebar, header
│   │   │   ├── subscriptions/   # Pause, resume, transfer UI
│   │   │   ├── customers/       # CSV import UI
│   │   │   └── billing/         # Billing cards and breakdown
│   │   ├── pages/               # Application pages
│   │   ├── context/             # Auth and toast state
│   │   ├── services/            # Axios instance and API services
│   │   ├── routes/              # Protected route handling
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── .env.example
│   ├── package.json
│   └── vite.config.js
│
├── server/
│   ├── config/                  # MongoDB connection
│   ├── controllers/             # API/business logic
│   ├── middleware/              # Authentication and errors
│   ├── models/                  # Mongoose schemas
│   ├── routes/                  # REST endpoints
│   ├── tests/                   # Jest tests
│   ├── utils/                   # Billing/import utilities
│   ├── .env.example
│   ├── package.json
│   └── server.js
│
├── README.md
├── REASONING.md
├── AI_LOGS.md
└── .gitignore
```

---

## Getting Started

### Prerequisites

- Node.js 18+ recommended
- npm
- MongoDB database (local MongoDB or MongoDB Atlas)

### 1. Clone

```bash
git clone https://github.com/hanish78780/tiffin-track.git
cd tiffin-track
```

### 2. Backend

```bash
cd server
npm install
```

Create `server/.env` from `server/.env.example`:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

Start the backend:

```bash
npm start
```

Development mode:

```bash
npm run dev
```

Backend default URL:

```text
http://localhost:5000
```

### 3. Frontend

Open a second terminal:

```bash
cd client
npm install
```

Create `client/.env` from `client/.env.example`:

```env
VITE_API_URL=http://localhost:5000/api
```

Start the frontend:

```bash
npm run dev
```

Vite will print the local development URL in the terminal.

---

## Authentication & Multi-Tenant Security

Every registered account represents an independent tiffin-service owner.

Protected business requests use:

```http
Authorization: Bearer <JWT>
```

The server derives the owner from the verified JWT:

```text
JWT → req.user.id → ownerId
```

`ownerId` is never accepted from the client as a trusted value.

All customer, subscription, pause, assignment, billing, import, and notification queries are owner-scoped. Cross-owner resource access uses the application's generic not-found behavior rather than exposing another owner's data.

Passwords are hashed with bcryptjs and are never returned by API responses.

---

## API Reference

All endpoints under `/api` are relative to:

```text
http://localhost:5000
```

### Authentication

| Method | Endpoint | Auth | Purpose |
|---|---|:---:|---|
| POST | `/api/auth/register` | No | Register owner |
| POST | `/api/auth/login` | No | Login and receive JWT |
| GET | `/api/auth/me` | Yes | Current authenticated owner |

### Customers

| Method | Endpoint | Auth | Purpose |
|---|---|:---:|---|
| POST | `/api/customers` | Yes | Create customer |
| GET | `/api/customers` | Yes | List/search/paginate/sort customers |
| GET | `/api/customers/:id` | Yes | Get customer |
| PUT | `/api/customers/:id` | Yes | Update customer |
| DELETE | `/api/customers/:id` | Yes | Delete eligible customer |
| GET | `/api/customers/phone/:phone` | Yes | Phone lookup |
| POST | `/api/customers/import` | Yes | Messy CSV import (T4) |

### Subscriptions

| Method | Endpoint | Auth | Purpose |
|---|---|:---:|---|
| POST | `/api/subscriptions` | Yes | Create subscription |
| GET | `/api/subscriptions` | Yes | List/filter/paginate subscriptions |
| GET | `/api/subscriptions/:id` | Yes | Subscription details and history |
| POST | `/api/subscriptions/:id/pause` | Yes | Pause subscription |
| POST | `/api/subscriptions/:id/resume` | Yes | Resume subscription |
| POST | `/api/subscriptions/:id/transfer` | Yes | Transfer subscription (T6) |

### Billing

| Method | Endpoint | Auth | Purpose |
|---|---|:---:|---|
| GET | `/api/billing/:customerId?month=YYYY-MM` | Yes | Customer bill for selected month |

### Clock & Outbox — T1

| Method | Endpoint | Auth | Purpose |
|---|---|:---:|---|
| POST | `/clock` | Challenge contract | Advance clock and generate delivery events |
| POST | `/api/clock` | Challenge contract | API alias for clock |
| GET | `/outbox` | Challenge contract | Inspect notification outbox |
| GET | `/api/outbox` | Challenge contract | API alias for outbox |
| DELETE | `/outbox` | Challenge contract | Clear outbox for test isolation |
| DELETE | `/api/outbox` | Challenge contract | API alias for reset |

### Health

```http
GET /api/health
```

---

## Important Billing Rules

### Completed/Past Month

For a completed month, all weekdays in that calendar month are considered before pauses and service eligibility are applied.

### Current Month

For the current calendar month, the billing cutoff is today. Future weekdays are never billed.

The daily rate still uses the complete month's weekday count:

```text
dailyRate = monthlyPrice / totalWeekdaysInMonth
```

This prevents the monthly plan price from changing merely because the month is still in progress.

### Future Month

A future month does not contain served delivery days yet and is not treated as a normal completed-month bill.

### Transfer Billing

A transferred subscription retains one monthly plan and one daily rate. Served weekdays are attributed to the customer assignment active on each date.

---

## Billing Example

For a completed September 2026 cycle:

```text
Monthly price = ₹3,000
Total weekdays = 22
Pause = Sep 10 through Sep 15 inclusive
Paused weekdays = 4
Served weekdays = 18
```

The exact daily rate is:

```text
₹3,000 / 22 = ₹136.363636...
```

The server uses the unrounded rate internally and rounds the final bill to two decimal places:

```text
18 × (₹3,000 / 22) = ₹2,454.55
```

---

## Frontend Routes

| Route | Purpose |
|---|---|
| `/` | Landing page |
| `/login` | Owner login |
| `/register` | Owner registration |
| `/dashboard` | KPIs, quick actions, delivery overview |
| `/customers` | Customer management, phone lookup, CSV import |
| `/customers/new` | Create customer |
| `/customers/:id` | Customer details and subscription actions |
| `/customers/:id/edit` | Edit customer |
| `/subscriptions` | Subscription list and status filters |
| `/subscriptions/new` | Create subscription |
| `/subscriptions/:id` | Subscription details, pause/resume/transfer |
| `/billing` | Monthly billing and service breakdown |

---

## Testing

### Backend

```bash
cd server
npm test
```

The latest completed twist suite contains **65 tests**:

- 24 billing tests
- 13 authorization/ownership tests
- 8 T1 clock/outbox tests
- 12 T6 transfer/split-billing tests
- 8 T4 import tests

Coverage includes date boundaries, pauses, overlapping pauses, leap years, current/past billing behavior, transfer history, owner isolation, notification idempotency, messy CSV parsing, normalization, deduplication, and rejection handling.

### Frontend Build

```bash
cd client
npm run build
```

### Optional Lint

```bash
cd client
npm run lint
```

---

## Design Priorities

The implementation prioritizes:

1. **Correct billing** — served weekdays, not fixed-day assumptions.
2. **Data integrity** — historical transfer assignments and transactional imports.
3. **Authorization** — every business record is owner-scoped.
4. **Idempotent operations** — delivery notification events cannot be duplicated for the same subscription/date.
5. **Usable workflow** — the owner can complete common operations without leaving the main workflow.

---

## Builder Challenge Twists

| Level | Twist | Implementation |
|---|---|---|
| Level 1 | T1 Delivery Notifications | `/clock` → eligibility engine → durable `/outbox` events |
| Level 2 | T6 Subscription Transfer | Historical assignments + split billing + transfer workflow |
| Level 3 | T4 Messy Import | CSV parsing + normalization + dedupe + row-level report |

---

## Supporting Documents

- `REASONING.md` — engineering decisions, data model, business rules, trade-offs, and testing rationale.
- `AI_LOGS.md` — AI conversation log required by the Builder challenge. It should contain the complete required conversation history exactly as required by the challenge instructions.

---

## License

ISC
