# REASONING.md — TiffinTrack Engineering Reasoning

## 1. Problem Interpretation

TiffinTrack models a home-style weekday lunch service. Customers subscribe to a monthly plan, receive lunch Monday-Friday, and can temporarily pause service. The owner needs accurate billing for the days lunch was actually served.

The central business rule is:

```text
totalWeekdays = weekdays in the billing month
pausedDays    = unique paused weekdays within the billing window
servedDays    = eligible weekdays - pausedDays
dailyRate     = monthlyPrice / totalWeekdays
totalBill     = round(dailyRate * servedDays, 2)
```

The application also implements three Builder Challenge twists:

- **T1:** morning delivery notifications through a clock-triggered durable outbox;
- **T6:** mid-cycle subscription transfer with historical ownership and split billing; and
- **T4:** messy customer CSV import with normalization, deduplication, rejection, and reporting.

The design goal is not to simulate a large enterprise platform. It is to make the core business lifecycle correct, auditable, owner-scoped, and easy to operate.

---

## 2. Architectural Principles

The implementation follows five priorities:

1. **Business correctness** — billing is derived from actual calendar service days.
2. **Historical integrity** — lifecycle changes do not overwrite facts required for past billing.
3. **Tenant isolation** — every business record belongs to the authenticated owner.
4. **Idempotency** — repeated operational triggers do not create duplicate delivery events.
5. **Simple workflows** — common owner operations remain accessible from the UI without unnecessary navigation.

The stack is intentionally conventional:

- React + Vite + Tailwind for the client;
- Express + Mongoose for the API;
- MongoDB for durable business state; and
- Jest for backend regression and business-rule tests.

---

## 3. Data Model

### User

Represents a tiffin-service owner/account.

```text
User
- name
- email
- passwordHash
```

Passwords are hashed with bcryptjs. The API never returns password hashes.

### Customer

Represents the person receiving lunch.

```text
Customer
- name
- phone
- address
- ownerId
```

The compound unique index:

```js
customerSchema.index({ ownerId: 1, phone: 1 }, { unique: true });
```

means the same phone can exist under two independent tiffin-service owners without creating a cross-tenant collision.

### Subscription

Represents the monthly commercial plan.

```text
Subscription
- customerId
- ownerId
- planName
- monthlyPrice
- startDate
- status
```

The subscription remains the stable plan/cycle object even when ownership changes during T6 transfer.

### PausePeriod

Represents one pause interval.

```text
PausePeriod
- subscriptionId
- ownerId
- startDate
- endDate
- reason
```

A nullable `endDate` represents an open pause until the customer resumes.

### SubscriptionAssignment

Introduced for T6 historical ownership.

```text
SubscriptionAssignment
- subscriptionId
- ownerId
- customerId
- startDate
- endDate
```

An assignment answers the historical question:

> Which customer held this subscription on a particular date?

This is essential because changing `subscription.customerId` alone would destroy the information required to split historical billing correctly.

### NotificationOutbox

Introduced for T1 durable delivery events.

Each notification is keyed by a deterministic delivery event key:

```text
${subscriptionId}_${deliveryDate}
```

A unique database constraint makes the delivery trigger idempotent.

---

## 4. Multi-Tenant Ownership

Every registered user represents an independent tiffin service.

The ownership flow is:

```text
JWT
 ↓
req.user.id
 ↓
ownerId
 ↓
owner-scoped database query
```

`ownerId` is never trusted from request body or query parameters.

All business operations are owner-scoped, including:

- customers;
- subscriptions;
- pause periods;
- subscription assignments;
- billing;
- imports; and
- delivery notification generation.

When a requested resource does not exist or belongs to another owner, the API uses the application's generic not-found behavior where appropriate. This avoids leaking another tenant's resource existence.

This model is intentionally enforced at the database-query/controller boundary rather than relying on frontend filtering.

---

## 5. Billing Design

### Why Calendar Weekdays?

The service operates Monday-Friday. Therefore a fixed assumption such as 22 service days is incorrect because months have different weekday counts.

Examples:

```text
September 2026 = 22 weekdays
August 2026    = 21 weekdays
February 2024  = 21 weekdays
February 2023  = 20 weekdays
```

The billing engine therefore walks the selected calendar month and counts Monday-Friday dynamically.

### Why a Set for Pauses?

Multiple pause records may overlap. If each pause simply incremented a counter, an overlapping weekday could be deducted twice.

The implementation stores normalized ISO date strings in a `Set`:

```text
2026-09-10
2026-09-11
2026-09-14
```

The same weekday appearing in two pause intervals is therefore counted only once.

### Pause Boundaries

Pause start and end dates are inclusive.

A pause from Sep 10 through Sep 15 includes both boundary dates. Weekends inside the interval are ignored because they were never delivery days.

### Cross-Month Pauses

Pause intervals are clamped to the requested billing window. This supports pauses that begin before the month, end after the month, or remain open-ended.

### Currency Rounding

The exact daily rate is retained internally:

```text
3000 / 22 = 136.363636...
```

The final total is rounded to two decimal places. This avoids compounding an intermediate two-decimal rounding error.

For September 2026:

```text
Monthly price = ₹3,000
Weekdays = 22
Pause = Sep 10-15
Paused weekdays = 4
Served weekdays = 18

Final bill = 18 × (3000 / 22)
           = ₹2,454.55
```

---

## 6. Current-Month Billing Cutoff

A completed month and an in-progress month have different billing windows.

### Past Month

The entire calendar month is evaluated.

### Current Month

The billing window ends on the current calendar date. Future weekdays are not yet served and therefore cannot be billed.

The important invariant is that the daily rate still comes from the complete month's weekday count:

```text
dailyRate = monthlyPrice / totalWeekdaysInMonth
```

We do **not** change the daily rate to `monthlyPrice / weekdaysElapsed`, because that would change the economics of the monthly plan simply because the month is incomplete.

### Future Month

A future month does not contain completed service days and is not treated as a normal completed-month bill.

### Date Safety

Billing uses UTC-safe calendar calculations. The implementation avoids mixing local-time constructors with UTC dates, which previously caused last-day-of-month and leap-day off-by-one failures in IST environments.

---

## 7. T1 — Delivery Notifications & Outbox

### Eligibility

For a target clock date, a delivery notification is generated only if:

1. the date is Monday-Friday;
2. the subscription has started by the target date;
3. the subscription is active for that date;
4. no pause period covers that date;
5. a valid customer assignment exists for the date; and
6. owner isolation is satisfied.

This is calculated server-side so the operation does not depend on a browser being open.

### Clock Trigger

The clock endpoint advances the business date and evaluates eligible subscriptions. The challenge-compatible endpoints include `/clock` and `/api/clock`.

The generated events are exposed through `/outbox` and `/api/outbox` for inspection.

### Idempotency

The event key is:

```text
subscriptionId + deliveryDate
```

and is protected by a unique MongoDB constraint.

If the same clock date is processed twice, the second attempt does not create a second delivery event for the same subscription/date.

This is preferable to relying on a frontend flag because retries and scheduler replays can happen independently of the UI.

### Why an Outbox?

The outbox separates the business decision "this customer is due today" from notification transport. The event is first made durable, so notification processing can be retried without recomputing the underlying eligibility decision or generating duplicate events.

---

## 8. T6 — Subscription Transfer

### Why Not Mutate `subscription.customerId`?

Consider:

```text
Customer A owns the plan Sep 1-Sep 14
Customer B owns the plan Sep 15-Sep 30
```

If the application simply changed:

```js
subscription.customerId = customerB;
```

the database would no longer contain enough information to know that Customer A was served during the first part of the month.

That would cause incorrect billing and destroy historical information.

### Assignment Intervals

Instead, transfer closes the previous assignment on the day before the transfer and creates a new assignment beginning on the transfer date.

Example:

```text
Customer A
Sep 1 → Sep 14

Customer B
Sep 15 → Sep 30
```

The plan itself remains unchanged:

```text
Plan name       = unchanged
Monthly price   = unchanged
Original cycle  = unchanged
```

### Split Billing

Billing walks each weekday and asks:

```text
Is this date billable?
Is it paused?
Which assignment owns this date?
```

A served weekday is then attributed to the assignment's customer.

The same daily rate is used for all customers on the transferred plan. Customer-level amounts are reconciled so rounded line items still add up to the final bill.

### Transfer to a New Customer

The transfer workflow supports both:

```text
Existing customer
```

and:

```text
New customer
```

When a new customer is created as part of the transfer, the customer creation and assignment update should be transactional. This prevents an unsuccessful transfer from leaving an orphan customer record.

The owner-scoped `(ownerId, phone)` uniqueness rule is also preserved.

---

## 9. T4 — Messy Customer Import

### Why Normalize Before Deduplicating?

Real-world customer lists frequently contain formatting variations:

```text
9876543210
98765 43210
98765-43210
+91 9876543210
09876543210
```

Treating these as raw strings could create duplicate customers.

Phone normalization therefore happens before uniqueness checks.

### Date Normalization

Supported input date forms are parsed into UTC-safe dates according to the documented import convention. The importer does not rely on the JavaScript runtime's ambiguous general-purpose date parser for business dates.

### Row-Level Processing

The importer intentionally handles rows independently:

```text
valid row
→ imported

duplicate row
→ deduped

invalid row
→ rejected
```

A malformed row should not prevent unrelated valid customers from being imported.

### Atomic Customer + Subscription Creation

A valid row creates the complete initial lifecycle:

```text
Customer
+
Subscription
+
Initial SubscriptionAssignment
```

These records must not be left partially created when the row fails.

### Import Report

The API returns the required top-level result:

```text
imported
 deduped
 rejected
```

along with row-level details and reasons. This gives the owner an actionable explanation of what happened to every input row.

---

## 10. Customer Deletion

Deletion is intentionally constrained by lifecycle state.

A customer with an active subscription should not be silently removed because doing so could invalidate current service and billing relationships.

The delete workflow therefore checks ownership and active subscription state before deleting.

Historical records required for billing, such as transfer assignments, must not be destroyed merely because a customer record is being removed.

This is a deliberate integrity rule rather than a convenience CRUD operation.

---

## 11. API Design

The API uses resource-oriented paths and explicit action endpoints for state transitions.

Examples:

```text
GET  /api/customers
POST /api/customers
PUT  /api/customers/:id
DELETE /api/customers/:id

POST /api/subscriptions/:id/pause
POST /api/subscriptions/:id/resume
POST /api/subscriptions/:id/transfer

GET /api/billing/:customerId?month=YYYY-MM
```

Pause, resume, and transfer are modeled as POST actions because they represent business operations with side effects, rather than arbitrary partial field updates.

Filtering, pagination, and sorting use query parameters so the customer and subscription lists can remain server-side and scalable.

---

## 12. Authentication

The application uses JWT authentication.

The JWT payload contains only the user identifier needed by the authorization layer:

```text
{ userId }
```

The middleware verifies the token and exposes:

```text
req.user = { id }
```

Passwords are hashed with bcryptjs before persistence.

The frontend stores the authentication token and restores the session through `/api/auth/me`. Protected routes redirect unauthenticated users to the login flow.

---

## 13. Validation and Error Handling

Validation happens at more than one layer:

- controller validation for request-specific business rules;
- Mongoose schema validation for persisted data; and
- explicit ObjectId/date/month validation before database operations.

The API uses consistent HTTP semantics:

```text
400 → invalid input
401 → unauthenticated
404 → resource not found / cross-owner resource
409 → lifecycle or uniqueness conflict
500 → unexpected server error
```

A centralized error handler prevents database internals and stack traces from becoming API responses.

---

## 14. Testing Strategy

The test suite focuses on business invariants and tenant isolation rather than only happy-path controller responses.

The latest completed twist suite contains 65 tests:

```text
Billing                         24
Authorization / ownership      13
T1 Clock / Outbox                8
T6 Transfer / Split Billing    12
T4 Import                        8
--------------------------------
Total                           65
```

### Billing

Tests cover:

- weekday counts;
- leap and non-leap February;
- single pauses;
- weekend-spanning pauses;
- multiple pauses;
- overlapping pauses;
- partial month pauses;
- open-ended pauses;
- cross-month pauses and resumes;
- entire-month pauses;
- rounding; and
- historical transfer billing.

### Authorization

Tests verify that owners can access their own resources while cross-owner customer, subscription, pause, phone lookup, and billing access is isolated.

### T1

Tests verify:

- weekday notification generation;
- weekend exclusion;
- pause exclusion;
- mixed eligibility;
- duplicate clock idempotency;
- future subscription exclusion; and
- owner isolation.

### T6

Tests verify:

- mid-cycle transfer;
- transfer with pauses;
- first/last-day transfers;
- historical assignment preservation;
- split billing;
- invalid transfer dates;
- missing/cross-owner targets; and
- lifecycle conflict handling.

### T4

Tests verify:

- phone normalization;
- date parsing;
- quoted CSV parsing;
- clean import;
- in-batch deduplication;
- database deduplication;
- row rejection; and
- multi-tenant isolation.

The frontend production build is also checked separately with Vite.

---

## 15. Important Bug and Lesson

### Timezone mismatch in the billing engine

The first billing implementation mixed local-time date construction with UTC dates parsed from ISO strings. In an IST environment this caused month-end and leap-day comparisons to shift across calendar boundaries.

The solution was to make the billing engine UTC-consistent:

- `Date.UTC()` for date creation;
- `getUTCDay()` for weekday detection;
- UTC midnight normalization; and
- millisecond-based day iteration.

The lesson is that calendar billing is a date-domain problem, not a timestamp-domain problem. The implementation must make its calendar timezone explicit rather than relying on the host machine's local timezone.

---

## 16. Trade-Offs

| Decision | Reason / Trade-Off |
|---|---|
| MongoDB + Mongoose | Natural fit for the small document-oriented domain and rapid MVP development. |
| One active subscription per customer | Keeps lifecycle rules simple for the challenge; more complex plan switching can be added later. |
| Separate PausePeriod documents | Makes pause history and date-range queries straightforward. |
| SubscriptionAssignment for transfers | Adds a model but preserves historical billing correctness. |
| Durable outbox | Adds persistence and a unique key, but makes notification generation retry-safe. |
| Per-row import processing | More implementation work, but one malformed row does not destroy an otherwise valid import. |
| No soft delete | Simpler MVP lifecycle; historical retention policy can be expanded later. |
| Mock-based authorization tests | Fast isolation tests; a future production suite should also include database-backed integration tests. |
| JWT without refresh tokens | Simple MVP authentication with a finite token lifetime. |

---

## 17. Future Improvements

The following are intentionally outside the current Builder Challenge scope:

- refresh-token rotation;
- rate limiting;
- structured request logging and observability;
- delivery route optimization;
- payment gateway integration;
- WhatsApp/SMS provider integration;
- bulk holiday pause management;
- richer revenue analytics;
- database-backed end-to-end test environments; and
- CI/CD deployment automation.

These are future extensions rather than prerequisites for the core subscription, pause/resume, transfer, notification, import, and billing workflows.
