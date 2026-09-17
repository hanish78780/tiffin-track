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
| **Testing** | Jest (37/37 unit & isolation tests passing) |

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18+ (tested on v22)
- [MongoDB](https://www.mongodb.com/) (local instance or MongoDB Atlas URI)
- npm

---

## Getting Started

### 1. Clone Repository

```bash
git clone https://github.com/hanish78780/tiffin-track.git
cd tiffin-track
```

### 2. Backend Setup

```bash
cd server
npm install
cp .env.example .env
```

Configure `server/.env`:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/tiffintrack
JWT_SECRET=your_jwt_secret_key_here
```

Start backend:
```bash
# Development mode (auto-reload)
npm run dev

# Production mode
npm start
```
The backend starts at `http://localhost:5000`. Verify health with `curl http://localhost:5000/api/health`.

### 3. Frontend Setup

In a new terminal:
```bash
cd client
npm install
cp .env.example .env
```

Configure `client/.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

Start frontend:
```bash
npm run dev
```
The frontend starts at `http://localhost:5173`.

---

## Running Backend Tests

```bash
cd server
npm test
```

**Test Suite Coverage (37 Tests Total):**
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

---

## Frontend Application Routes

| Route | Page | Description | Auth Required |
|---|---|---|:---:|
| `/` | Landing Page | Product overview, value proposition, and CTA | No |
| `/login` | Login | Owner authentication with JWT retrieval | No |
| `/register` | Register | New owner account creation with auto-login | No |
| `/dashboard` | Dashboard | KPI cards (customers, active/paused subs, volume), quick actions, recent customers | Yes |
| `/customers` | Customers | Full customer table with search, sorting, and pagination | Yes |
| `/customers/new` | New Customer | Create customer form with prompt to create subscription | Yes |
| `/customers/:id` | Customer Details | Contact info, linked subscription status, actions | Yes |
| `/customers/:id/edit` | Edit Customer | Update customer contact & delivery address | Yes |
| `/subscriptions` | Subscriptions | Table with Active/Paused filter tabs and pause/resume buttons | Yes |
| `/subscriptions/new` | New Subscription | Assign customer to lunch plan with price & start date | Yes |
| `/subscriptions/:id` | Subscription Details | Plan status, pause history log, pause/resume modals | Yes |
| `/billing` | Monthly Billing | Customer & month selector, pro-rated bill card, calculation breakdown | Yes |

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

### Subscriptions (Owner-Scoped)
- `POST /api/subscriptions` — Create subscription (`customerId`, `planName`, `monthlyPrice`, `startDate`)
- `GET /api/subscriptions` — List subscriptions (`status`, `page`, `limit`, `sort`, `order`)
- `GET /api/subscriptions/:id` — Get subscription details
- `POST /api/subscriptions/:id/pause` — Pause subscription (`startDate`, `reason`)
- `POST /api/subscriptions/:id/resume` — Resume subscription (`resumeDate`)

### Billing (Owner-Scoped)
- `GET /api/billing/:customerId?month=YYYY-MM` — Pro-rated bill calculation

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
│   │   │   ├── subscriptions/  # PauseModal, ResumeModal
│   │   │   └── billing/        # BillingCard, BillingBreakdown
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
│   ├── controllers/            # auth, customer, subscription, billing controllers
│   ├── middleware/             # authMiddleware (JWT protect), errorHandler
│   ├── models/                 # User, Customer, Subscription, PausePeriod
│   ├── routes/                 # authRoutes, customerRoutes, subscriptionRoutes, billingRoutes
│   ├── tests/                  # billing.test.js (24 tests), authorization.test.js (13 tests)
│   ├── utils/                  # billing.js (UTC-safe pro-rated billing engine)
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
