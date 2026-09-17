# TiffinTrack

A home-style tiffin (lunch delivery) subscription management backend. Owners register, add customers, manage monthly subscriptions, pause/resume deliveries, and generate pro-rated bills — charging only for weekdays actually served.

## Problem Statement

A tiffin service delivers lunch every weekday. Customers subscribe to a monthly plan. When they need to pause (travel, festivals, etc.), they shouldn't be charged for paused days. At month-end, the owner needs each customer's bill: the plan price pro-rated for the days actually delivered.

## Features

- **Owner authentication** — register, login, JWT-protected routes
- **Customer management** — CRUD with phone lookup
- **Search, pagination & sorting** — find customers by name or phone
- **Monthly subscriptions** — one active subscription per customer
- **Pause / resume** — pause delivery with a reason, resume later
- **Pro-rated billing** — weekday-only calculation, handles multiple & overlapping pauses
- **Multi-tenant isolation** — each owner sees only their own data
- **Input validation & error handling** — centralized, consistent JSON errors

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcryptjs |
| Config | dotenv |
| Testing | Jest |

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [MongoDB](https://www.mongodb.com/) (local or Atlas)
- npm

## Installation

```bash
# Clone the repository
git clone https://github.com/hanish78780/tiffin-track.git
cd tiffin-track/server

# Install dependencies
npm install
```

## Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/tiffintrack` |
| `JWT_SECRET` | Secret key for JWT signing | `your_secure_random_string` |

> **Never commit your `.env` file.** It is listed in `.gitignore`.

## Running the Backend

```bash
# Production
cd server
npm start

# Development (auto-restart on file changes)
cd server
npm run dev
```

The server starts at `http://localhost:5000`.

Verify with:
```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "success": true,
  "message": "TiffinTrack API is running"
}
```

## Running Tests

```bash
cd server
npm test
```

Tests cover:
- Billing engine (24 test cases covering weekday counts, multiple/overlapping pauses, cross-month open pauses, leap years, rounding)
- Authorization / ownership isolation (13 test cases)
- Total: 37 tests passing

## API Endpoints

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Register a new owner | No |
| POST | `/api/auth/login` | Login and get JWT | No |
| GET | `/api/auth/me` | Get current user | Yes |

### Customers

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/customers` | Create a customer | Yes |
| GET | `/api/customers` | List/search customers | Yes |
| GET | `/api/customers/:id` | Get customer by ID | Yes |
| PUT | `/api/customers/:id` | Update customer | Yes |
| GET | `/api/customers/phone/:phone` | Lookup by phone | Yes |

### Subscriptions

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/subscriptions` | Create subscription | Yes |
| GET | `/api/subscriptions` | List subscriptions | Yes |
| GET | `/api/subscriptions/:id` | Get subscription | Yes |
| POST | `/api/subscriptions/:id/pause` | Pause subscription | Yes |
| POST | `/api/subscriptions/:id/resume` | Resume subscription | Yes |

### Billing

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/billing/:customerId?month=YYYY-MM` | Calculate monthly bill | Yes |

### Health

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/health` | Health check | No |

## Authentication

All protected endpoints require a JWT token in the `Authorization` header:

```
Authorization: Bearer <token>
```

### Register

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rajesh Kumar",
    "email": "rajesh@example.com",
    "password": "securepass123"
  }'
```

Response:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "...",
    "name": "Rajesh Kumar",
    "email": "rajesh@example.com"
  }
}
```

### Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "rajesh@example.com",
    "password": "securepass123"
  }'
```

## Search, Pagination & Sorting

```bash
# Search by name or phone (case-insensitive partial match)
GET /api/customers?search=9876

# Pagination
GET /api/customers?page=1&limit=10

# Sorting
GET /api/customers?sort=name&order=asc

# Combined
GET /api/customers?search=sharma&page=1&limit=10&sort=name&order=asc
```

Response:
```json
{
  "success": true,
  "customers": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "totalPages": 5
  }
}
```

### Subscription Filtering

```bash
# Active subscriptions
GET /api/subscriptions?status=active

# Paused subscriptions
GET /api/subscriptions?status=paused

# With pagination
GET /api/subscriptions?status=active&page=1&limit=10
```

## Pause / Resume Workflow

### 1. Pause a Subscription

```bash
curl -X POST http://localhost:5000/api/subscriptions/:id/pause \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2026-09-10",
    "reason": "Travel"
  }'
```

### 2. Resume a Subscription

```bash
curl -X POST http://localhost:5000/api/subscriptions/:id/resume \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "resumeDate": "2026-09-15"
  }'
```

**Boundary convention:** A pause from 2026-09-10 through 2026-09-15 means service is paused on both boundary dates (inclusive).

## Billing Formula

```
totalWeekdays  = weekdays (Mon-Fri) in the calendar month
pausedDays     = unique weekdays covered by pause periods
servedDays     = totalWeekdays - pausedDays
dailyRate      = monthlyPrice / totalWeekdays
totalBill      = dailyRate × servedDays
```

All currency values rounded to 2 decimal places.

### Example

Monthly price = ₹3000, September 2026 (22 weekdays), paused Sep 10-15 (4 weekday pauses):

```
dailyRate = 3000 / 22 = 136.36
servedDays = 22 - 4 = 18
totalBill = 136.36 × 18 = 2454.55
```

### Billing Request

```bash
curl http://localhost:5000/api/billing/:customerId?month=2026-09 \
  -H "Authorization: Bearer <token>"
```

Response:
```json
{
  "success": true,
  "customer": {
    "id": "...",
    "name": "Rahul Sharma",
    "phone": "9876543210"
  },
  "subscription": {
    "planName": "Monthly Lunch",
    "monthlyPrice": 3000,
    "status": "active"
  },
  "billing": {
    "month": "2026-09",
    "monthlyPrice": 3000,
    "totalWeekdays": 22,
    "pausedDays": 3,
    "servedDays": 19,
    "dailyRate": 136.36,
    "totalBill": 2590.91
  },
  "pausePeriods": [
    {
      "startDate": "2026-09-10T00:00:00.000Z",
      "endDate": "2026-09-15T00:00:00.000Z",
      "reason": "Travel"
    }
  ]
}
```

## Ownership & Multi-Tenant Isolation

Every business resource (customer, subscription, pause period) has an `ownerId` field derived from the authenticated user's JWT. All database queries filter by `ownerId`. One owner can never see, modify, or bill another owner's data. Resources belonging to another owner return a generic `404` — no information leakage.

Phone numbers are unique **per owner** (compound index `ownerId + phone`), so different owners can independently manage customers who share a phone number.

## Error Handling

All errors return consistent JSON:

```json
{
  "success": false,
  "message": "Descriptive error message"
}
```

| Status | Meaning |
|--------|---------|
| 400 | Validation / bad request |
| 401 | Unauthenticated |
| 404 | Not found |
| 409 | Conflict (duplicate, invalid state) |
| 500 | Internal server error |

## Debugging / Common Issues

| Issue | Solution |
|-------|----------|
| `MongoDB connection error` | Check `MONGO_URI` in `.env` and ensure MongoDB is running |
| `Authentication required` | Include `Authorization: Bearer <token>` header |
| `Invalid or expired token` | Login again to get a fresh token |
| `Duplicate value for field: phone` | This phone already exists for your account |
| `Customer already has an active subscription` | Pause or complete the existing subscription first |
| `Invalid ID format` | Ensure you're using a valid MongoDB ObjectId |

## Project Structure

```
server/
├── config/
│   └── db.js                  # MongoDB connection
├── controllers/
│   ├── authController.js      # Register, login, getMe
│   ├── customerController.js  # CRUD + phone lookup
│   ├── subscriptionController.js  # Subscribe, pause, resume
│   └── billingController.js   # Pro-rated billing
├── middleware/
│   ├── authMiddleware.js      # JWT verification
│   └── errorHandler.js        # Centralized error handling
├── models/
│   ├── User.js               # Owner account
│   ├── Customer.js           # Customer (per-owner)
│   ├── Subscription.js       # Monthly plan
│   └── PausePeriod.js        # Pause records
├── routes/
│   ├── authRoutes.js
│   ├── customerRoutes.js
│   ├── subscriptionRoutes.js
│   └── billingRoutes.js
├── tests/
│   ├── billing.test.js       # Billing engine tests
│   └── authorization.test.js # Ownership isolation tests
├── utils/
│   └── billing.js            # Core billing engine
├── .env.example
├── .gitignore
├── package.json
└── server.js                 # Entry point
```

## Future Improvements

- Delivery-boy assignment and tracking
- Payment integration (Razorpay/Stripe)
- WhatsApp/SMS notifications
- Bulk pause for festivals/holidays
- Dashboard analytics and reports
- Frontend client (React/Next.js)
