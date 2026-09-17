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
- Frontend client (React or Next.js)
- Docker containerization
- CI/CD pipeline
