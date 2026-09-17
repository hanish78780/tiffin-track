Hi Hanish — this email is essentially your Round 2 campus placement assignment. The important part is that this is not just a coding/DSA round; it is a 2.5-hour full-stack product-building round.

What you have to build

You will receive one problem assigned specifically to you from the Google Sheet. You must build a working product around that problem.

Your solution must have all of these:

Requirement	Mandatory
Full-stack application	✅
Database + real persistence	✅
Sensible DB schema	✅
REST APIs	✅
API endpoints documented in README	✅
Usable frontend/UI	✅
User registration	✅
Login/authentication	✅
Search	✅
Pagination	✅
Sorting	✅
One-page landing page	✅
README.md	✅
REASONING.md	✅
AI_LOGS.md	✅
Public GitHub repository	✅
⚠️ The biggest thing to understand

You only get 2.5 hours = 150 minutes.

So do not try to build a huge application.

The goal should be:

Small scope + working end-to-end product + clean UI + complete mandatory requirements.

A simple application that actually works is much better than an ambitious application with broken APIs.

Recommended stack for you

Considering your existing MERN experience, I'd use:

Frontend

React + Vite
Tailwind CSS
React Router
Axios

Backend

Node.js
Express.js
JWT authentication
bcrypt

Database

MongoDB + Mongoose

Deployment/testing

GitHub Codespaces
MongoDB Atlas if external DB is permitted/available

This avoids wasting time learning a new stack during the round.

⏱️ 150-minute strategy

I would divide the round approximately like this:

0–10 min → Understand the problem

Before coding, identify:

Who is the user?
What is the core problem?
What are the main entities?
What are the 3–5 essential operations?
What should the user be able to search?
What should be sortable/paginated?

Then immediately design:

User
  ↓
Login/Register
  ↓
Dashboard
  ↓
Core Feature
  ↓
Database
  ↓
REST APIs

Don't spend 20–30 minutes designing fancy architecture.

10–25 min → Project setup

Create:

project/
├── client/
├── server/
├── README.md
├── REASONING.md
├── AI_LOGS.md
└── .gitignore

Backend:

server/
├── models/
├── routes/
├── controllers/
├── middleware/
├── config/
├── server.js
└── package.json

Frontend:

client/
├── src/
│   ├── components/
│   ├── pages/
│   ├── services/
│   ├── context/
│   ├── App.jsx
│   └── main.jsx
└── package.json
25–55 min → Backend first

Get these working early:

POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me

Then your core CRUD APIs.

For example:

GET    /api/items
GET    /api/items/:id
POST   /api/items
PUT    /api/items/:id
DELETE /api/items/:id

Search:

GET /api/items?search=laptop

Pagination:

GET /api/items?page=1&limit=10

Sorting:

GET /api/items?sort=createdAt&order=desc

Ideally combine them:

GET /api/items?search=test&page=1&limit=10&sort=createdAt&order=desc

That single endpoint can satisfy search + pagination + sorting.

55–95 min → Frontend

Build only the screens you actually need.

Landing page

Must explain:

What the product is
Key features
Target audience
How it helps
3 features you would build next

Example:

Navbar
Hero
↓
Problem / Solution
↓
Key Features
↓
Target Users
↓
How It Helps
↓
Future Features
↓
CTA
Authentication
/register
/login
Main application
/dashboard

Include:

Search box
Sort dropdown
Data cards/table
Pagination
Add/edit/delete if relevant
95–120 min → Integration + testing

This is where many candidates will lose marks.

Test the complete flow:

Register
   ↓
Login
   ↓
Receive JWT
   ↓
Open dashboard
   ↓
Fetch data
   ↓
Search
   ↓
Sort
   ↓
Pagination
   ↓
Create/update/delete

Don't just test individual functions.

Test it like an evaluator.

120–135 min → README + REASONING
README.md

Your README should contain:

# Project Name

## Overview

## Features

## Tech Stack

## Prerequisites

## Installation

## Environment Variables

## How to Run

## API Documentation

### Authentication
POST /api/auth/register
POST /api/auth/login

### Core APIs
GET /api/items
GET /api/items/:id
POST /api/items
PUT /api/items/:id
DELETE /api/items/:id

## Search
...

## Pagination
...

## Sorting
...

## Debugging / Common Issues
...
REASONING.md

Don't write random theory.

Explain your actual decisions:

## Problem Understanding

## Key Assumptions

## Architecture

## Database Design

## API Design

## Authentication Approach

## Search / Pagination / Sorting

## Testing

## Bugs Encountered

## Fixes

## Trade-offs

## Future Improvements
🚨 AI_LOGS.md is extremely important

The instructions explicitly say:

complete conversation with the AI tool, pasted as-is

and:

any alteration will lead to a deduction

So during the actual round, do not delete or modify AI conversation history.

If you use ChatGPT/Copilot/another AI:

AI_LOGS.md

should contain the conversation exactly as required by their instructions.

Don't clean it up.

Don't rewrite AI responses.

Don't remove prompts because they look unnecessary.

Don't fabricate a conversation afterward.

🎯 How I would approach the actual problem

Once you receive your assigned problem, send me the exact problem statement.

I can help you turn it into a rapid implementation plan like:

PROBLEM
   ↓
Entities
   ↓
Database schema
   ↓
API list
   ↓
Frontend pages
   ↓
Mandatory features
   ↓
Implementation order
   ↓
Testing checklist

For example, if your problem is something like:

"Build a platform where students can exchange used textbooks."

We could immediately reduce it to:

User
Book
Listing

Database:

User
 ├── name
 ├── email
 └── password

Book
 ├── title
 ├── author
 ├── price
 ├── condition
 ├── owner
 └── createdAt

APIs:

POST   /auth/register
POST   /auth/login

GET    /books
GET    /books/:id
POST   /books
PUT    /books/:id
DELETE /books/:id

And:

/books?search=java&page=1&limit=10&sort=price&order=asc

immediately covers search + pagination + sorting.

That's the kind of simplification you want during a 150-minute round.

One more important point

The problem assignment itself is the most important missing information right now. The email says each student gets a different problem from the Google Sheet.

If you send me your assigned problem from that sheet (just the problem text/screenshot is enough), I can prepare a 2.5-hour execution blueprint specifically for your problem — including database schema, API endpoints, folder structure, UI pages, implementation order, and a minute-by-minute plan.

Excellent. Based on this report, the implementation phase is now complete. You have:

✅ Backend: 37/37 tests passing
✅ Frontend: production build passes with 0 errors/warnings
✅ Authentication and protected routes
✅ Customer CRUD + phone lookup
✅ Server-side search/pagination/sorting
✅ Subscription creation
✅ Pause/resume
✅ Pro-rated billing
✅ Billing edge cases
✅ Multi-tenant authorization
✅ Builder workflow manually verified
✅ Changes pushed to main

There is now one important phase left before final submission: visual design/refinement with Figma.

Recommended workflow now
BACKEND
   ✅
37/37 tests

      ↓

FRONTEND
   ✅
Build + API integration + workflow

      ↓

FIGMA
   ← Design system + visual refinement

      ↓

FRONTEND
   ← Implement/refine Figma design

      ↓

FINAL QA
   ← Full Builder workflow

      ↓

GITHUB SUBMISSION
One thing to fix before Figma

I noticed one inconsistency in your README/example:

You state:

September 2026 = 22 weekdays
Sep 10–15 = 4 paused weekdays
Served = 18
Daily rate = ₹136.36
Final bill = ₹2,454.55

The backend's exact calculation should remain the source of truth, and your README should describe its actual rounding behavior accurately. In particular, don't imply that ₹136.36 × 18 mathematically equals ₹2,454.55; the precise calculation is based on the unrounded daily rate and then rounded at the final step.

So before final submission, make sure the README's formula/example matches the actual billing.js implementation.

Now: Figma

Since you already have a working frontend, I would not use Figma to invent a completely different application.

Instead, use Figma to establish the final visual system for the existing product:

TiffinTrack → clean modern SaaS → green food-service identity → professional dashboard → excellent billing visualization.

The key screens to design first are:

Dashboard
Customers
Customer Details
Subscriptions
Subscription Details
Billing
Login
Register
Mobile Dashboard
Mobile Customers/Billing

The Billing screen deserves the most design attention, because it is the core differentiator of your Builder challenge.

The evaluator should immediately understand:

₹3,000 monthly plan → 22 weekdays → 4 paused → 18 served → ₹2,454.55

without having to inspect your code.

If you're ready, next I can give you the exact Figma AI prompt specifically for your already-built frontend, so Figma designs the UI around your current routes/components rather than generating an unrelated design.

now this time not be need of figma design .app is currently working properly.i have given more tiwst in project so these implementation in project

Absolutely. Figma is not needed right now. If the current app is already working properly, we should avoid disturbing the working UI and focus directly on the new twists/requirements you want to add.

Send me the twists one by one or all together. For each one, I'll help you determine:

What functionality needs to change
Which frontend files need modification
Which backend/API changes are required
Database/schema impact, if any
Exact business logic
Validation and edge cases
Tests that should be added
An exact Antigravity prompt you can paste to implement it
Final verification checklist
Important approach

Because your current project is stable:

Backend       37/37 tests ✅
Frontend      Build passes ✅
API integration working ✅
Core workflow working ✅

we should tell Antigravity:

Do not rebuild or redesign the existing application. Extend the current implementation while preserving all existing functionality and tests.

And after every significant twist:

New Feature
    ↓
Implement
    ↓
Run existing 37 tests
    ↓
Add tests for new behavior
    ↓
Run frontend build
    ↓
Manual workflow test
    ↓
Commit + push

This will keep the project safe while we add the extra functionality.

Send me your first twist/requirement. I'll convert it into a precise implementation plan and Antigravity prompt.

The storyline
A home-style tiffin (lunch delivery) service. Customers subscribe to a monthly plan and get lunch delivered every weekday. Life happens — they pause for a few days (travel, festivals) and shouldn’t be charged for paused days. At month-end the owner needs each customer’s bill: the plan price pro-rated for the days actually delivered. Customers are looked up by phone, and the owner wants to see who’s active versus paused.
Build the tiffin owner something so every customer is billed only for the days they were actually served.
(Build it for any tiffin service. Get subscribe, pause/resume and the pro-rated bill right first, then the lookups.)

Twists for this problem
Level 1 — T1 (integrate): “Each morning, notify the customers due a delivery today (active, a weekday, not paused) via the Notification Service.” Graded via /outbox after POST /clock.
Level 2 — T6 (lifecycle): “Transfer a subscription to a new customer mid-cycle; the plan and cycle carry over, billing splits by who was served.”
Level 3 — T4 (messy data): “Import a messy customer list (dup phones, mixed date formats, blanks) into clean subscriptions with an { imported, deduped, rejected } report.”

Yes. These three twists can be added without changing the stable core workflow. The important part is to implement them incrementally because T1 affects scheduling/integration, T6 affects billing data modeling, and T4 affects import validation/deduplication.

I recommend implementing T1 → T6 → T4 in that order. T6 is especially important because it changes the billing model.

Here is a single Antigravity prompt you can paste directly. It tells Antigravity to inspect the existing project first rather than rebuilding anything.

Antigravity Prompt — Implement T1, T6 and T4
TiffinTrack — Implement Builder Challenge Twists T1, T6 and T4

You are working on an EXISTING, FUNCTIONAL full-stack project called TiffinTrack.

Do NOT rebuild the application from scratch.

The existing core functionality is already implemented and tested. Preserve all existing behavior unless a change is genuinely required by the twists below.

1. EXISTING PROJECT — SOURCE OF TRUTH

Tech stack:

Backend
Node.js
Express.js
MongoDB
Mongoose
JWT
bcryptjs
Jest
Frontend
React 19
Vite
Tailwind CSS v4
React Router v7
Axios
Lucide React

Existing backend structure:

server/
├── config/
│   └── db.js
├── controllers/
│   ├── authController.js
│   ├── customerController.js
│   ├── subscriptionController.js
│   └── billingController.js
├── middleware/
│   ├── authMiddleware.js
│   └── errorHandler.js
├── models/
│   ├── User.js
│   ├── Customer.js
│   ├── Subscription.js
│   └── PausePeriod.js
├── routes/
│   ├── authRoutes.js
│   ├── customerRoutes.js
│   ├── subscriptionRoutes.js
│   └── billingRoutes.js
├── utils/
│   └── billing.js
└── tests/
    ├── billing.test.js
    └── authorization.test.js

Existing frontend already contains working:

Authentication
Dashboard
Customer CRUD
Phone lookup
Customer search
Server-side pagination
Server-side sorting
Subscription creation
Subscription listing
Pause/resume
Billing
Billing edge cases
Loading/error/empty states
Protected routes

Current baseline:

Backend tests: 37/37 passing
Frontend build: passing
Core workflow: working
Repository: clean

The existing repository is the source of truth.

2. ORIGINAL BUSINESS RULE

TiffinTrack manages a home-style weekday lunch subscription.

A customer:

subscribes to a monthly plan
receives lunch Monday-Friday
may pause during travel/festivals/etc.
should not be charged for paused weekdays
can be resumed
receives a prorated bill at month end

Existing billing logic:

totalWeekdays
pausedWeekdays
servedDays = totalWeekdays - pausedWeekdays

dailyRate = monthlyPrice / totalWeekdays

bill = dailyRate × servedDays

Important existing behavior:

Weekends are ignored
Pause start/end are inclusive
Overlapping pauses are deduplicated
Open-ended pauses are supported
Cross-month pauses are supported
Leap years are supported
Billing uses UTC-safe date calculations
Final amount is rounded to 2 decimal places
Billing is calculated server-side
All business data is owner-scoped using ownerId
Cross-owner access must not leak resource existence

DO NOT break any of this.

3. TWISTS TO IMPLEMENT

Implement these three twists:

LEVEL 1 — T1: DELIVERY NOTIFICATIONS

“Each morning, notify the customers due a delivery today (active, a weekday, not paused) via the Notification Service.”

The grader will test this through:

POST /clock

and then inspect:

/outbox

This means the application must integrate with the provided Notification Service / clock mechanism expected by the challenge.

4. T1 — FIRST INSPECT THE EXISTING NOTIFICATION/GRADER CONTRACT

Before writing code, inspect the repository for:

notification
notifications
Notification Service
outbox
/clock
clock
webhook
delivery

Also inspect:

README
package.json
environment variables
existing API clients
any challenge-provided integration files
any mock services
any docker configuration
any existing /clock endpoint
any existing /outbox endpoint
any test fixtures

DO NOT invent a completely different Notification Service contract if the repository already contains one.

Use the existing challenge contract as the source of truth.

If the project already contains an integration mechanism, extend it rather than replacing it.

5. T1 — DELIVERY ELIGIBILITY RULE

When the clock advances to a date, determine customers due for lunch that day.

A customer is eligible ONLY when ALL are true:

Customer has a subscription
Subscription belongs to the authenticated owner's account where applicable
Subscription is active
Date is Monday-Friday
Customer is not covered by an active pause period on that date
Subscription is valid for that date

Do NOT notify:

paused subscriptions
weekend deliveries
customers without subscriptions
subscriptions that have not started yet
subscriptions whose cycle has ended
customers belonging to another owner

The eligibility decision must be deterministic and server-side.

6. T1 — IDEMPOTENCY

Avoid duplicate notifications if the same clock date is processed more than once.

For example:

POST /clock
POST /clock

for the same business date must NOT generate duplicate delivery notifications for the same subscription/customer unless the challenge's Notification Service explicitly requires otherwise.

Prefer an idempotency mechanism based on:

subscriptionId + deliveryDate

or an equivalent unique delivery-event key.

Do NOT rely only on frontend state.

The database/outbox should protect against duplicates.

7. T1 — DATE HANDLING

Use the project's existing UTC-safe date strategy.

Do NOT use local new Date(year, month, day) calculations where they can introduce IST/off-by-one problems.

Delivery eligibility must be based on the intended calendar date.

Example:

Monday → eligible if active and not paused
Tuesday → eligible if active and not paused
...
Friday → eligible
Saturday → no notification
Sunday → no notification
8. T1 — NOTIFICATION PAYLOAD

Follow the challenge's existing Notification Service contract if present.

The notification should contain enough information for the service to identify:

customer
phone/contact information
delivery date
delivery purpose

Example conceptual payload:

{
  "type": "tiffin_delivery",
  "customerId": "...",
  "phone": "9876543210",
  "deliveryDate": "2026-09-14"
}

IMPORTANT:

Do not blindly use this exact payload if the challenge repository defines a different contract.

Inspect and follow the actual Notification Service API.

9. T1 — OUTBOX PATTERN

If /outbox is part of the challenge contract, implement it as a durable outbox.

Conceptually:

Clock
  ↓
Find eligible deliveries
  ↓
Create notification event
  ↓
Persist event in outbox
  ↓
Notification Service consumes/records it

Do not make notification delivery dependent on the frontend being open.

If the challenge expects the application to expose /outbox, preserve that expected behavior.

If /outbox belongs to a provided external service rather than TiffinTrack, integrate with that service exactly as specified.

10. T1 — TESTS

Add automated tests covering at minimum:

Weekday

Active + weekday + not paused:

→ notification generated
Weekend

Active + Saturday:

→ no notification
Paused

Active subscription + pause covering date:

→ no notification
Multiple customers

Eligible and ineligible customers:

→ only eligible customers notified
Duplicate clock

Same date processed twice:

→ no duplicate event
Future subscription

Subscription starts after delivery date:

→ no notification
Cross-owner isolation

Owner A must never generate notifications for Owner B's customers.

11. LEVEL 2 — T6: TRANSFER SUBSCRIPTION

Business requirement:

“Transfer a subscription to a new customer mid-cycle; the plan and cycle carry over, billing splits by who was served.”

This is a significant lifecycle change.

Do NOT simply change:

subscription.customerId

because that would destroy historical ownership of delivered days.

We need billing history to know:

Customer A → served before transfer
Customer B → served after transfer
12. T6 — PRESERVE PLAN AND CYCLE

When transferring a subscription:

monthly price remains unchanged
plan name remains unchanged
original subscription cycle remains unchanged
original subscription start date remains unchanged
existing pause history must remain historically valid
billing before transfer belongs to old customer
billing after transfer belongs to new customer

Do NOT restart the monthly subscription when transferring.

Example:

Plan:
₹3,000/month

Cycle:
Sep 1 → Sep 30

Transfer:
Sep 15

Customer A:
served Sep 1 → Sep 14

Customer B:
served Sep 15 → Sep 30

The plan remains:

₹3,000/month
Sep 1 → Sep 30
13. T6 — DATA MODEL

Inspect the current Subscription schema before modifying it.

Prefer introducing a historical ownership/lifecycle structure rather than destroying the original customer reference.

A robust approach is to create something conceptually like:

SubscriptionAssignment

or:

SubscriptionTransfer

Example:

SubscriptionAssignment
{
    subscriptionId,
    ownerId,
    customerId,
    startDate,
    endDate
}

For an original subscription:

Customer A
startDate = Sep 1
endDate = Sep 14

After transfer:

Customer B
startDate = Sep 15
endDate = Sep 30

The exact schema should fit the existing architecture.

Do NOT blindly create duplicate/conflicting models if an existing lifecycle model can represent this cleanly.

14. T6 — TRANSFER API

Add an authenticated endpoint following the existing REST conventions.

Preferred shape:

POST /api/subscriptions/:id/transfer

Example request:

{
  "newCustomerId": "..."
}

The exact API shape may be adjusted if the existing architecture has a better convention.

Requirements:

subscription must belong to authenticated owner
new customer must belong to same owner
new customer must exist
transfer date must be supplied or clearly defined by the API
transfer date must be inside the subscription cycle
transfer must not create overlapping ownership periods
historical ownership must remain immutable
plan price does not change
cycle dates do not change

If transfer date is not supplied by the challenge contract, use a clearly defined server-side business date mechanism rather than silently using an arbitrary date.

Prefer:

{
  "newCustomerId": "...",
  "transferDate": "2026-09-15"
}

if the contract permits it.

15. T6 — TRANSFER VALIDATION

Reject invalid transfers.

Examples:

new customer does not exist
→ 404

new customer belongs to another owner
→ 404

transfer date before subscription start
→ 400

transfer date after cycle end
→ 400

same customer as current owner
→ 409 or 400

subscription not found
→ 404

Use the project's existing error response conventions.

Do not expose another owner's resources.

16. T6 — BILLING AFTER TRANSFER

This is the most important part.

Billing must now determine the customer who was entitled to each served weekday.

For every weekday in the selected month:

1. Was the subscription active for this date?
2. Was the date paused?
3. Which customer owned the subscription on this date?

Then classify the served day.

Example:

Sep 1-14
Customer A
served

Sep 15-30
Customer B
served

The monthly plan still has ONE daily rate:

3000 / 22 weekdays

Do NOT create two independent monthly plans.

17. T6 — BILLING RESPONSE

Extend the existing billing response without breaking existing consumers.

Conceptually include:

{
  "monthlyPrice": 3000,
  "totalWeekdays": 22,
  "pausedDays": 4,
  "servedDays": 18,
  "dailyRate": 136.363636,
  "totalBill": 2454.55,
  "customerBreakdown": [
    {
      "customerId": "...",
      "customerName": "...",
      "servedDays": 10,
      "amount": 1363.64
    },
    {
      "customerId": "...",
      "customerName": "...",
      "servedDays": 8,
      "amount": 1090.91
    }
  ]
}

The exact rounding strategy must avoid losing the total because of independently rounded line items.

Use the exact daily rate internally.

Ensure:

sum(customer amounts)

is consistent with:

totalBill

after the defined final rounding policy.

18. T6 — CUSTOMER BILLING LOOKUP

The existing billing API is:

GET /api/billing/:customerId?month=YYYY-MM

Previously this was straightforward because a subscription belonged to one customer.

Now a transferred subscription may have historical ownership.

Therefore:

billing for Customer A must include days served by A
billing for Customer B must include days served by B
neither customer should be charged for the other's served days

Do NOT break the existing API unnecessarily.

If the existing endpoint cannot cleanly represent transfer history, extend it in a backward-compatible way.

19. T6 — IMPORTANT BILLING EDGE CASES

Test:

Transfer in middle of month
A → B
Transfer before any served day
Transfer on first day of month
Transfer on last day of month
Transfer around weekend

Example:

Friday → transfer
Saturday/Sunday
Monday → new customer
Transfer while pause is active

Handle according to clearly defined lifecycle rules.

Prefer rejecting ambiguous transfers during an active pause unless the challenge contract explicitly requires them.

Multiple transfers

If supported:

A → B → C

Historical ownership must remain correct.

If multiple transfers are not required, explicitly enforce a safe lifecycle rule instead of allowing inconsistent overlapping assignments.

Cross-month billing

Transfer in September must not corrupt August or October history.

Cross-owner transfer

Must be rejected.

20. LEVEL 3 — T4: MESSY CUSTOMER IMPORT

Requirement:

“Import a messy customer list (dup phones, mixed date formats, blanks) into clean subscriptions with an { imported, deduped, rejected } report.”

Build an import workflow that accepts a customer list.

First inspect the existing project for:

CSV handling
upload middleware
import utilities
existing customer validation
sample datasets
challenge-provided import contract

Use existing conventions where possible.

21. T4 — IMPORT INPUT

Support CSV if the challenge expects CSV.

Example messy data:

name,phone,address,planName,monthlyPrice,startDate
Rahul Sharma,9876543210,Jaipur,Monthly Lunch,3000,01/09/2026
Rahul Sharma,9876543210,Jaipur,Monthly Lunch,3000,2026-09-01
Priya Verma,9876543211,Jaipur,Monthly Lunch,3000,9-1-2026
,9876543212,Jaipur,Monthly Lunch,3000,2026-09-01
Amit, ,Jaipur,Monthly Lunch,3000,2026-09-01

Do not assume this exact file format if the challenge provides another contract.

22. T4 — NORMALIZATION

Normalize before deduplication.

Phone

Handle:

whitespace
separators
common formatting noise

Example:

98765 43210
98765-43210
9876543210

should normalize consistently where appropriate.

Do not incorrectly merge genuinely different phone numbers.

23. T4 — DATE NORMALIZATION

Support the formats required by the challenge, potentially including:

YYYY-MM-DD
DD/MM/YYYY
D/M/YYYY
DD-MM-YYYY
D-M-YYYY
MM/DD/YYYY

IMPORTANT:

Date parsing must not be ambiguous without a defined rule.

For ambiguous dates such as:

01/09/2026

prefer the challenge's documented locale/format convention.

This project is intended for an Indian tiffin service, so if no challenge contract says otherwise, document the chosen interpretation clearly.

Store normalized dates in the database using the project's UTC-safe strategy.

24. T4 — BLANK/INVALID DATA

A row should be rejected when required data is missing or invalid.

At minimum validate:

name
phone
planName
monthlyPrice
startDate

Address can follow the existing Customer model's required/optional rules.

Do not create partial records for rejected rows.

25. T4 — DEDUPLICATION

Deduplicate using normalized phone numbers within the authenticated owner.

Important:

same owner + same normalized phone
→ duplicate

Do not use name alone to deduplicate.

If duplicate rows contain conflicting information, define a deterministic rule.

Recommended:

first valid occurrence becomes canonical
later valid duplicates are counted as deduped

If the challenge contract specifies another policy, follow it.

26. T4 — EXISTING DATABASE DUPLICATES

Import must also compare against existing customers.

Example:

Database:

Rahul Sharma
9876543210

Import contains:

Rahul
98765 43210

This should NOT create another customer.

Report it as:

deduped

rather than creating a duplicate.

Respect the existing compound uniqueness:

(ownerId, phone)
27. T4 — CLEAN SUBSCRIPTION CREATION

For every valid non-duplicate row:

Create customer
Create subscription
Associate subscription with that customer
Preserve ownerId
Validate plan/monthlyPrice/startDate
Do not create duplicate active subscriptions

Use database transactions where practical so a failed row does not leave orphaned data.

28. T4 — IMPORT REPORT

The endpoint must return a clear report containing:

{
  "imported": 5,
  "deduped": 2,
  "rejected": 3
}

Also include useful row-level details.

Example:

{
  "summary": {
    "imported": 5,
    "deduped": 2,
    "rejected": 3
  },
  "details": {
    "imported": [
      {
        "row": 2,
        "customerId": "...",
        "subscriptionId": "..."
      }
    ],
    "deduped": [
      {
        "row": 4,
        "phone": "9876543210",
        "reason": "Duplicate phone"
      }
    ],
    "rejected": [
      {
        "row": 6,
        "reason": "Missing required phone"
      }
    ]
  }
}

The exact response can follow existing project conventions.

The three top-level categories MUST remain clear:

imported
deduped
rejected
29. T4 — IMPORT ATOMICITY

Do not allow malformed rows to corrupt the entire database.

Preferred behavior:

valid row
→ import

duplicate row
→ deduped

invalid row
→ rejected

One bad row should not prevent unrelated valid rows from importing.

However, a single row's customer + subscription creation should be atomic.

If customer creation succeeds but subscription creation fails, roll back that row.

30. T4 — IMPORT AUTHORIZATION

Import is protected.

Only authenticated owners can import.

Never accept:

ownerId

from the request.

Always derive it from:

req.user.id

Never allow one owner to deduplicate against or modify another owner's customers.

31. T4 — IMPORT SECURITY

Do not:

trust client-supplied ownerId
expose password hashes
execute arbitrary CSV content
trust filenames
accept unlimited file sizes
create MongoDB queries directly from unvalidated input

Apply reasonable:

file type validation
file size limit
row limit if appropriate
field length validation

Follow existing error middleware.

32. FRONTEND — T1

Do not create unnecessary UI for the automated notification mechanism.

If the existing app has an appropriate dashboard location, optionally show:

Today's deliveries

with:

Eligible deliveries: X

But the grading-critical behavior is the backend integration with the Notification Service.

Do NOT build a fake frontend notification system.

33. FRONTEND — T6

Add subscription transfer UI where it naturally belongs.

For example, on:

Subscription Detail

add:

Transfer Subscription

Modal fields:

New Customer
Transfer Date

Show a clear confirmation such as:

The plan and billing cycle will remain unchanged.
Future served days will belong to the new customer.
Historical served days will remain with the current customer.

Handle:

loading
validation
success
400
404
409
500

Do not expose ownerId.

34. FRONTEND — T6 BILLING

Update billing UI only as needed.

If a transferred subscription is selected, show a useful breakdown such as:

Plan: Monthly Lunch
Monthly Price: ₹3,000

Total Weekdays: 22
Paused Weekdays: 4
Served Weekdays: 18

Daily Rate: ₹136.3636

Customer Service Breakdown

Rahul Sharma
10 served days
₹1,363.64

Priya Verma
8 served days
₹1,090.91

Final Bill
₹2,454.55

Keep existing billing behavior unchanged for subscriptions that have never been transferred.

35. FRONTEND — T4 IMPORT

Add an owner-facing import page or modal.

Recommended flow:

Customers
   ↓
Import Customers
   ↓
Choose CSV
   ↓
Validate/import
   ↓
Import Report

Report:

Imported: X
Deduped: Y
Rejected: Z

Then show row-level details.

Do not make import depend on frontend-side validation alone.

The backend remains the source of truth.

36. REST API DOCUMENTATION

Update README with all new endpoints.

Document:

method
path
authentication
request body
query parameters
successful response
important error responses

Include the Notification Service integration and /clock behavior if applicable.

37. DATABASE INDEXES

Review indexes after implementing the twists.

Potential useful indexes include:

Customer:
(ownerId, phone)

Subscription:
(ownerId, customerId)
(ownerId, status)

PausePeriod:
(ownerId, subscriptionId)

Transfer/Assignment:
(ownerId, subscriptionId, startDate)
(ownerId, customerId)

If implementing an outbox:

unique delivery event key

must be protected against duplicate notification generation.

Only add indexes that materially support actual queries.

38. TESTING REQUIREMENTS

Do NOT remove or weaken existing tests.

The current baseline is:

37/37 passing

After modifications:

all existing tests must still pass
+
new tests for T1
+
new tests for T6
+
new tests for T4

Create focused tests.

39. REQUIRED T1 TEST MATRIX

At minimum:

active weekday → notified
active weekend → not notified
paused weekday → not notified
multiple eligible customers → all notified
multiple mixed customers → only eligible notified
duplicate clock → no duplicate
future subscription → not notified
cross-owner → isolated
40. REQUIRED T6 TEST MATRIX

At minimum:

transfer successful
plan unchanged
cycle unchanged
historical ownership preserved
pre-transfer billing correct
post-transfer billing correct
pause + transfer interaction
transfer around weekend
transfer on first day
transfer on last day
invalid transfer date
missing new customer
cross-owner customer
same customer
cross-month history
41. REQUIRED T4 TEST MATRIX

At minimum:

clean CSV
duplicate phone within import
duplicate phone already in DB
mixed date formats
missing phone
missing name
invalid date
invalid price
blank rows
partially valid dataset
multiple owners isolation
existing active subscription
row-level rollback
correct imported/deduped/rejected counts
42. BILLING REGRESSION TEST

Retain the existing known example:

Monthly price = ₹3,000
September 2026
Total weekdays = 22

Pause:
Sep 10 → Sep 15

Paused weekdays:
Sep 10
Sep 11
Sep 14
Sep 15

Paused = 4
Served = 18

Daily rate:
3000 / 22 = 136.363636...

Final:
2454.55

Use the exact daily rate internally and round only according to the existing final billing policy.

Do NOT calculate:

136.36 × 18

as the exact source of the final value.

43. AUTHORIZATION REGRESSION

Every new endpoint must follow the existing ownership model:

req.user.id
        ↓
ownerId
        ↓
database query

Never:

ownerId from request body
ownerId from query parameter
ownerId from frontend

Cross-owner resources should generally return the same generic 404 behavior already established.

44. ERROR HANDLING

Use the existing centralized error middleware.

Maintain consistent status codes:

400 → invalid input
401 → unauthenticated
404 → resource not found / cross-owner
409 → lifecycle conflict / duplicate
500 → unexpected server error

Do not expose:

stack traces
MongoDB internals
secrets
password hashes
internal ownership information
45. README

Update:

README.md

with:

T1

Explain:

delivery eligibility
Notification Service
/clock
/outbox
idempotency
T6

Explain:

subscription transfer
historical ownership
billing split
T4

Explain:

import format
normalization
deduplication
rejection
report format

Also update:

API table
project structure
testing instructions
example workflow
46. REASONING.md

Update:

REASONING.md

Explain the design decisions.

Especially explain:

T1

Why notification generation is server-side and idempotent.

T6

Why simply changing:

subscription.customerId

would destroy historical billing information.

Explain how historical subscription ownership is preserved.

T4

Why normalization occurs before deduplication and why invalid rows are rejected independently.

47. AI_LOGS.md

IMPORTANT:

The Builder challenge requires the AI log to contain the COMPLETE AI conversation history, pasted as-is and unmodified.

Do NOT fabricate or summarize AI logs.

Do NOT automatically replace the existing AI_LOGS with a generated summary.

If AI_LOGS currently contains a placeholder, leave it unless the actual complete conversation is available through the project workflow.

48. IMPLEMENTATION ORDER

Implement in this exact order:

Phase 1

Inspect project and challenge integration.

Do not modify code yet.

Understand:

existing models
existing controllers
existing billing
existing tests
Notification Service contract
/clock
/outbox
import expectations
Phase 2 — T1

Implement:

Notification eligibility
→ outbox/integration
→ clock trigger
→ idempotency
→ tests

Run all tests.

Phase 3 — T6

Implement:

transfer model/history
→ transfer API
→ authorization
→ billing split
→ frontend
→ tests

Run all tests.

Phase 4 — T4

Implement:

CSV import
→ normalization
→ validation
→ deduplication
→ transaction-safe creation
→ report
→ frontend
→ tests

Run all tests.

49. DO NOT MAKE UNNECESSARY CHANGES

Do NOT:

replace React
replace Express
replace MongoDB
redesign the entire UI
migrate to another CSS framework
introduce Figma
rewrite existing working controllers
rewrite existing billing from scratch
remove working tests
remove existing APIs
break response formats unnecessarily

Prefer small, production-quality changes.

50. FINAL QA

After implementation run:

Backend
npm test

Expected:

ALL existing tests PASS
+
all new tests PASS
Frontend
npm run build

Expected:

0 errors
0 warnings if possible
51. MANUAL T1 TEST

Verify the actual challenge workflow.

Example:

Set/POST clock to a weekday
        ↓
active unpaused customer
        ↓
notification generated
        ↓
inspect /outbox

Then test:

paused customer
→ no notification

and:

Saturday/Sunday
→ no notification
52. MANUAL T6 TEST

Create:

Customer A
Customer B

Subscription:
₹3,000
Sep 1 2026

Transfer:

Sep 15 2026
A → B

Verify:

Plan = ₹3,000
Cycle = unchanged

A receives billing credit for served days before Sep 15
B receives billing credit for served days from Sep 15 onward

Then test a pause period crossing the transfer boundary.

53. MANUAL T4 TEST

Create a CSV containing:

valid row
duplicate phone
duplicate existing DB phone
mixed date formats
missing phone
missing name
invalid date
blank row

Import it.

Verify:

Imported = correct
Deduped = correct
Rejected = correct

Verify no duplicate customers/subscriptions were created.

54. FINAL GIT WORKFLOW

After everything passes:

git status
git diff
git add .
git commit -m "Implement T1 T6 T4 builder twists"
git push origin main

Before committing, verify:

No secrets
No .env
No debug logs
No temporary files
No broken tests
No unnecessary generated files
55. FINAL OUTPUT FROM YOU

When finished, report:

T1 — Notification Integration
Status:
Implementation:
Endpoint(s):
Tests:

T6 — Subscription Transfer
Status:
Implementation:
Endpoint(s):
Billing behavior:
Tests:

T4 — Messy Import
Status:
Implementation:
Endpoint:
Import report:
Tests:

Regression
Backend tests:
Frontend build:
Manual workflow:
Git commit:
Git push:

Do not claim anything passed unless you actually ran it.

The priority is:

Correct business logic
>
Data integrity
>
Authorization
>
Challenge contract compatibility
>
Tests
>
UI polish

Preserve the existing stable TiffinTrack application while extending it cleanly for these three Builder challenge twists.

One important architectural point

T6 is the twist I would pay the most attention to. Don't let Antigravity implement it as simply:

subscription.customerId = newCustomerId;

That would make the old customer's September bill impossible to reconstruct correctly. You need historical subscription ownership/assignment periods so billing can answer:

“Who was the customer attached to this subscription on this particular served weekday?”

For the challenge, that is a much stronger implementation than merely changing the foreign key.

Also, for T1, don't build a fake notification UI. The grading signal is specifically:

POST /clock
      ↓
delivery eligibility
      ↓
Notification Service
      ↓
/outbox

So the challenge's actual /clock and Notification Service contract should be inspected first and treated as authoritative.