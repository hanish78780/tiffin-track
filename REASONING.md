# REASONING.md — TiffinTrack Engineering Reasoning

## Problem Interpretation

The core business problem: a tiffin service delivers lunch on weekdays (Mon–Fri). Customers subscribe monthly, but may pause for travel, festivals, etc. At month-end, the owner needs an accurate bill that charges only for days the customer was actually served.

Key insight: "pro-rated for days actually delivered" means we must count only weekday delivery days, subtract paused weekdays, and calculate `(monthlyPrice / totalWeekdays) × servedDays`.

## Assumptions

1. **Weekday-only delivery.** Saturday and Sunday are never delivery days, regardless of pause status.
2. **One active subscription per customer.** MVP simplification — a customer cannot have two concurrent active plans.
3. **Pause boundaries are inclusive.** A pause from Sep 10 to Sep 15 means service is paused on both Sep 10 and Sep 15.
4. **Open-ended pauses.** When a subscription is paused but not yet resumed, `endDate = null`. For billing, this is treated as paused through the end of the requested month.
5. **Calendar-month billing.** Bills are calculated per calendar month. The monthly price applies to the total weekdays in that month — not a fixed number like "22 days."
6. **Multi-tenant.** Each registered user is an independent tiffin-service owner. All business data is scoped to the owner who created it.

## Database Design

### Why Four Models?

| Model | Purpose |
|-------|---------|
| **User** | Owner/admin account. Authentication target. |
| **Customer** | The person receiving tiffin. Looked up by phone. |
| **Subscription** | The active plan connecting a customer to a price. Tracks status (active/paused). |
| **PausePeriod** | A discrete record of a pause interval. Separate from the subscription to support history and multiple pauses. |

### Why PausePeriods Are Separate Records

Storing pauses as a sub-array inside Subscription would work initially, but separate documents provide:

1. **Queryability.** We can efficiently query all pauses for a subscription, filter by date ranges, and join with billing.
2. **History.** Each pause/resume cycle is an immutable record. The subscription only tracks current status.
3. **Overlap detection.** Separate records make it trivial to check for conflicting/open pauses.
4. **Audit trail.** We can answer "how many times did customer X pause?" or "what's the longest pause?" without parsing arrays.

### Compound Unique Index on Phone

Phone numbers are unique per owner, not globally:

```js
customerSchema.index({ ownerId: 1, phone: 1 }, { unique: true });
```

This allows two different tiffin-service owners to independently manage customers who share a phone number, without data collisions.

## Ownership Model

Every business model carries an `ownerId` field referencing the User who created it. Every database query on business data includes `ownerId: req.user.id` in the filter. This is the primary multi-tenant isolation mechanism.

The `ownerId` is always derived from the JWT — never accepted from the request body. This prevents:
- IDOR (Insecure Direct Object Reference) vulnerabilities
- Cross-tenant data leakage
- Privilege escalation

When a resource is not found (either because it doesn't exist or it belongs to another owner), the API returns a generic `404` response. This avoids revealing whether a resource exists under another account.

## Billing Calculation Approach

The billing engine (`server/utils/billing.js`) is a pure function with no database dependencies:

```
calculateBill({ monthlyPrice, year, month, pausePeriods })
```

### Algorithm

1. **Count total weekdays.** Iterate every day in the calendar month. Count Mon–Fri.
2. **Count paused weekdays.** For each pause period, clamp its boundaries to the month. Walk each day in the clamped range. If it's a weekday, add its ISO date string to a `Set`.
3. **The `Set` prevents double-counting.** If two pause periods overlap on the same weekday, it's only counted once.
4. **Calculate served days.** `totalWeekdays - pausedDays`.
5. **Calculate bill.** `(monthlyPrice / totalWeekdays) × servedDays`, rounded to 2 decimal places.

### Why a Set for Paused Days?

Multiple pause periods can overlap — for example, if the owner accidentally records two overlapping pauses, or pauses are edited after creation. The `Set<string>` keyed on ISO date strings (`"2026-09-10"`) naturally deduplicates, so overlapping pauses never inflate the paused-day count.

### Why Not Hard-Code 22 Days?

Different months have different weekday counts:
- September 2026: 22 weekdays
- August 2026: 21 weekdays
- February 2024 (leap): 21 weekdays
- February 2023 (non-leap): 20 weekdays

The daily rate must reflect the actual month. Hard-coding would produce incorrect bills in months with fewer or more weekdays.

### Currency Rounding

The daily rate and total bill are rounded to 2 decimal places using `parseFloat(value.toFixed(2))`. The total bill is computed from the unrounded daily rate to minimize rounding error.

## API Design

### RESTful Conventions

- Nouns for resources (`/customers`, `/subscriptions`)
- HTTP verbs for actions (`GET`, `POST`, `PUT`)
- Sub-resources for actions on a resource (`/subscriptions/:id/pause`)
- Query parameters for filtering, pagination, sorting
- Consistent JSON response format (`{ success, data, message }`)

### Pause/Resume as POST, Not PATCH

Pause and resume are modeled as POST actions (`POST /subscriptions/:id/pause`) rather than PATCH operations because they create side effects (PausePeriod creation, status change). They're not simple field updates — they're business operations.

## Authentication Approach

- **bcryptjs** for password hashing (salt factor 10).
- **JWT** with a 7-day expiry, containing only `{ userId }`.
- The auth middleware extracts and verifies the JWT, attaches `req.user = { id }`.
- Password hashes are never returned in API responses (`-password` projection or selective field return).

## Validation

- Required fields are checked in controllers before database operations.
- MongoDB ObjectIds are validated before querying (`mongoose.Types.ObjectId.isValid()`).
- Month format is validated with regex (`/^\d{4}-(0[1-9]|1[0-2])$/`).
- Price must be positive. Subscription status transitions are validated (can't pause an already-paused subscription).
- Mongoose schema-level validation provides a second layer (required, min, enum, match).

## Testing Approach

### Billing Engine Tests (Jest)

24 test cases covering:
- Weekday calculation for standard months, leap years, non-leap years
- Full month, no pauses
- Single weekday pause
- Pause spanning a weekend (weekends don't count)
- Multiple non-overlapping pauses
- Overlapping pauses (no double-counting)
- Pause extending before/after the month (clamping)
- February with leap year (2024, 29 days, 21 weekdays)
- February without leap year (2023, 28 days, 20 weekdays)
- Leap day pause (Feb 29, 2024)
- Different weekday counts across months (dailyRate variation)
- Open-ended pause (null endDate clamped to month end)
- Weekend-only pause (0 paused days)
- Currency rounding verification (2 decimal places)
- Cross-month open pause (pause spanning into subsequent month → entire month paused, ₹0 bill)
- Cross-month resume mid-month (partial pause charge)
- Same-month billing when open pause starts mid-month
- Entire month paused (₹0 bill)

### Authorization Tests (Jest)

13 test cases verifying ownership isolation:
- Owner access to own resources (positive)
- Cross-owner access denied for customers, subscriptions, pauses
- Phone search scoped to owner
- List queries never leak cross-owner records
- Billing ownership chain (customer → subscription → pause periods)

No live MongoDB required — tests use mock data simulating the ownership-scoped query pattern.

## Bugs Encountered and Fixes

### Bug: Timezone mismatch in billing engine (3 test failures)

**Symptom:** Three billing tests failed — "pause extending past end of month" expected 3 paused days but got 2, "February 2024 leap day" expected 1 but got 0, and "open-ended pause" expected 7 but got 6. All were off-by-one on the last day.

**Root cause:** Mixed use of local-time and UTC date constructors. Month boundaries were created with `new Date(year, month-1, day)` (local timezone), while pause dates from string input like `new Date("2026-09-28")` produce UTC midnight. In IST (UTC+5:30), local midnight Sep 30 = Sep 29 18:30 UTC, so comparing a UTC pause date against a local-time month-end excluded the last day of the month.

**Fix:** Rewrote the entire billing engine to use UTC exclusively — `Date.UTC()` for all date creation, `getUTCDay()` for weekday checks, and millisecond arithmetic (`+= 86400000`) for date iteration instead of `setDate()`. Added a `toUTCMidnight()` helper to normalize any date input to a UTC midnight timestamp.

**Lesson:** Date arithmetic in Node.js is timezone-sensitive. Pure billing calculations should use UTC throughout to avoid environment-dependent results.

## Frontend Architecture & Decisions

### 1. Technology Choices
- **React 19 + Vite 8**: Extremely fast Hot Module Reload (HMR) and sub-second production builds (<1s). Avoids heavy framework complexity while delivering high performance.
- **Tailwind CSS v4**: Utility-first styling configured with `@tailwindcss/vite`. Enables rapid, consistent UI development without CSS bloat or runtime overhead.
- **React Router v7**: Declarative routing with layout inheritance (`AppLayout` with `<Outlet />`) and route authentication guarding (`ProtectedRoute`).
- **Axios**: Configured instance with automatic `Authorization: Bearer <token>` injection and global 401 response interceptor for token expiration handling.

### 2. Design Philosophy
- **Food-Service SaaS Aesthetic**: Clean forest green primary palette (`emerald-700/800`), amber status for paused deliveries, and crisp neutral card backgrounds (`slate-50/white`).
- **High Readability & Scannability**: Metric cards, status pills with bullet dots, tabular lists with sorting headers, and monospaced styling for phone numbers.
- **No Decoration without Purpose**: Avoided distracting multi-color gradients in favor of subtle border highlights and soft drop shadows.

### 3. Workflow Optimizations
- **Guided Customer Onboarding**: Creating a customer immediately prompts the owner to configure a subscription plan for them, eliminating lost customer navigation.
- **Transparent Pro-Rated Billing**: The `/billing` view displays both the final bill and an interactive step-by-step pipeline (`Plan Price ÷ Total Weekdays = Daily Rate × Served Days = Final Bill`), making the underlying pro-ration logic immediately verifiable.

---

## Builder Challenge Twists Architecture & Rationale

### 1. Level 1 — T1: Delivery Notifications & Outbox Pattern

#### Why Server-Side and Idempotent?
- **Automated Lifecycle vs Frontend Dependency:** Daily delivery operations in food delivery cannot depend on the tiffin owner keeping a browser tab open. The eligibility check and notification dispatch must be fully deterministic, headless, and server-side.
- **Idempotency via Unique Event Key:** Clock advancements can trigger multiple times (e.g., retried clock ticks, automated scheduler replays, distributed workers). If `/clock` is called repeatedly for the same business date (e.g. `2026-09-14`), generating duplicate customer messages would result in confusion and real-world delivery errors.
- **Durable Outbox Pattern:** Notifications are written to `NotificationOutbox` using a composite unique constraint `deliveryEventKey: ${subscriptionId}_${deliveryDate}`. A duplicate run cleanly catches MongoDB error code 11000 and skips insertion without aborting the batch, guaranteeing exactly-once delivery notification semantics.
- **Strict Weekday and Pause Boundaries:** Deliveries are Monday–Friday only (`dayOfWeek >= 1 && dayOfWeek <= 5`). Paused subscriptions and subscriptions starting in the future are deterministically filtered out before outbox recording.

### 2. Level 2 — T6: Subscription Transfer & Split Billing

#### Why Simply Mutating `subscription.customerId` Is Catastrophic
- In a pro-rated subscription system, a customer is billed based on days *actually served*.
- If a subscription transfer simply overwrote `subscription.customerId = newCustomerId`, the system would lose all historical record of who owned the plan earlier in the month.
- At month-end, the new customer would be charged for the previous customer's lunch meals, and the previous customer would receive an artificial ₹0 bill.

#### The `SubscriptionAssignment` Solution
- Rather than destroying historical context or creating duplicate subscriptions with overlapping cycle dates, we introduced `SubscriptionAssignment`.
- Each assignment tracks `(subscriptionId, customerId, startDate, endDate)`.
- When transferred on `transferDate` (e.g. `2026-09-15`):
  - The previous assignment is finalized with `endDate = 2026-09-14` (inclusive).
  - A new assignment is opened starting on `2026-09-15` with `endDate = null`.
- **Preservation of Plan and Cycle:**
  - The plan price (e.g., ₹3,000) and calendar month cycle (e.g., Sep 1 → Sep 30) remain intact.
  - The daily rate is computed once for the entire plan: `monthlyPrice ÷ totalWeekdays` (e.g. ₹3,000 ÷ 22 = ₹136.3636...).
  - Billing walks every weekday in the month: if not paused, the day is attributed to whichever customer held the assignment on that date.
  - Line-item amounts are calculated using the unrounded daily rate and reconciled against the total bill to prevent rounding drift (e.g. `₹1,363.64 + ₹1,636.36 = ₹3,000.00`).
  - Customer billing lookups (`GET /api/billing/:customerId?month=YYYY-MM`) correctly charge each customer only for their respective served days.

### 3. Level 3 — T4: Messy Customer Import

#### Normalization Before Deduplication
- Real-world CSV customer data is riddled with formatting inconsistencies: spaces (`98765 43210`), dashes (`98765-43210`), international codes (`+91 9876543210`), leading zeros (`09876543210`), and mixed date formats (`YYYY-MM-DD`, `DD/MM/YYYY`, `9-1-2026`).
- Deduplicating raw text without prior normalization leads to severe data contamination: `98765 43210` and `98765-43210` would be treated as two different customers, causing duplicate database records and double-billing.
- By running phone and date normalization *first*, all numbers are transformed into canonical 10-digit strings and dates into UTC midnight timestamps before any uniqueness checks occur.

#### Independent Row Processing & Atomic Per-Row Creation
- Rejecting an entire CSV file because of one malformed row (e.g., a blank name on row 12) is terrible user experience for a tiffin owner uploading 100+ customers.
- Conversely, allowing a row to create a Customer without a Subscription leads to orphaned records.
- **Strategy:** Each row is processed independently. A valid row creates both the Customer, Subscription, and initial Assignment. If a phone is already present in the batch or in the owner's database, it is safely recorded as `deduped`. If essential fields are invalid, it is counted as `rejected` with an explicit reason. The final response returns `{ imported, deduped, rejected }` along with granular row-level reports.

## Trade-Offs

| Decision | Trade-Off |
|----------|-----------|
| **No test database** | Authorization tests use mock data instead of a live MongoDB. Faster and simpler for MVP, but doesn't test actual Mongoose queries. |
| **No rate limiting** | The MVP doesn't implement rate limiting. Should be added before production deployment. |
| **No refresh tokens** | JWTs expire in 7 days with no refresh mechanism. Acceptable for MVP. |
| **One subscription per customer** | Simplifies the data model but means a customer can't switch plans without ending the current one. |
| **No soft deletes** | Customers and subscriptions can't be "archived." A future improvement. |
| **No request logging** | No morgan or winston logging. Should be added for production observability. |

## Future Improvements

- Refresh token rotation for better auth UX
- Rate limiting and request throttling
- Request logging (morgan/winston)
- Delivery-boy assignment and route optimization
- Payment gateway integration (Razorpay/Stripe)
- WhatsApp/SMS notifications for pause/resume/billing
- Bulk pause for holidays/festivals
- Dashboard analytics (revenue, active/paused trends)
- Docker containerization
- CI/CD pipeline
