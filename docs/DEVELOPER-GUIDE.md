# SalonBot Developer Guide

Complete technical documentation for new developers joining the project.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Quick Start](#2-quick-start)
3. [Architecture](#3-architecture)
4. [Directory Structure](#4-directory-structure)
5. [Request Lifecycle](#5-request-lifecycle)
6. [Database Models](#6-database-models)
7. [Authentication & Multi-Tenancy](#7-authentication--multi-tenancy)
8. [API Endpoints Reference](#8-api-endpoints-reference)
9. [WhatsApp Chatbot System](#9-whatsapp-chatbot-system)
10. [Slot Availability Algorithm](#10-slot-availability-algorithm)
11. [Payment System (Razorpay)](#11-payment-system-razorpay)
12. [Webhook Architecture](#12-webhook-architecture)
13. [Cron Jobs](#13-cron-jobs)
14. [Security](#14-security)
15. [Dashboard (React SPA)](#15-dashboard-react-spa)
16. [Testing](#16-testing)
17. [Deployment](#17-deployment)
18. [Common Patterns & Conventions](#18-common-patterns--conventions)
19. [Adding a New Feature (Walkthrough)](#19-adding-a-new-feature-walkthrough)

---

## 1. Project Overview

SalonBot is a **multi-tenant SaaS platform** that gives Indian salons an AI-powered WhatsApp chatbot for booking appointments. Each salon gets:

- A WhatsApp chatbot (powered by OpenAI) that handles bookings, cancellations, FAQs
- A React dashboard for managing services, staff, appointments, and analytics
- Online payment collection via Razorpay
- Automated reminders and no-show detection

**Tech stack:**

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20+ |
| Framework | Express.js |
| Database | MongoDB (Mongoose ODM) |
| AI | OpenAI GPT-4o-mini (function calling) |
| Messaging | WhatsApp Business Cloud API (Meta) |
| Payments | Razorpay |
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS 4 |
| UI Library | shadcn/ui (Radix primitives) |
| Testing | Jest + mongodb-memory-server |
| Deployment | Docker + nginx + Let's Encrypt |

---

## 2. Quick Start

### Prerequisites

- Node.js 20+
- Docker (for MongoDB) or a local MongoDB instance
- An OpenAI API key

### Setup

```bash
# Clone and install
git clone <repo-url>
cd salon
npm install

# Start MongoDB
docker compose up -d    # starts MongoDB on port 27017

# Create .env (copy from .env.example)
cp .env.example .env
# Fill in: MONGODB_URI, JWT_SECRET, OPENAI_API_KEY

# Run backend
npm run dev             # nodemon on port 5000

# Run dashboard (separate terminal)
cd dashboard
npm install
npm run dev             # Vite on port 5173
```

### Seed Test Data

```bash
node scripts/seed-test-data.js
```

This creates a test salon with services and staff so you can immediately explore the API and dashboard.

### Run Tests

```bash
npm test                # all 199 tests (uses in-memory MongoDB)
npm run test:verbose    # with detailed output
npm test -- tests/phase2-appointments.test.js  # single file
```

---

## 3. Architecture

### High-Level Flow

```
                    ┌─────────────┐
                    │   WhatsApp   │
                    │  (Customer)  │
                    └──────┬──────┘
                           │ Meta Cloud API
                           ▼
┌──────────────────────────────────────────────┐
│                  Express Server              │
│                                              │
│  ┌─────────┐  ┌──────────┐  ┌────────────┐  │
│  │ Webhook  │  │   API    │  │  Dashboard  │  │
│  │ Routes   │  │  Routes  │  │  (Static)   │  │
│  └────┬─────┘  └────┬─────┘  └─────┬──────┘  │
│       │              │              │          │
│       ▼              ▼              │          │
│  ┌─────────┐  ┌──────────┐         │          │
│  │ Services │  │Controllers│        │          │
│  │ (Chat,   │  │          │         │          │
│  │  LLM,    │  └────┬─────┘        │          │
│  │  Slot)   │       │              │          │
│  └────┬─────┘       │              │          │
│       │              │              │          │
│       ▼              ▼              │          │
│  ┌──────────────────────────┐      │          │
│  │     Mongoose Models      │      │          │
│  └────────────┬─────────────┘      │          │
│               │                    │          │
└───────────────┼────────────────────┘          │
                ▼                               │
         ┌──────────┐              ┌────────────┘
         │ MongoDB  │              │ React SPA
         └──────────┘              │ (Vite + shadcn/ui)
                                   └──────────────────
```

### Request Flow

Every API request follows this path:

```
HTTP Request
  → app.js middleware stack (cors, helmet, rate limiting, etc.)
    → Route matcher
      → Auth middleware (JWT verification, attaches req.salon)
        → Validation middleware (express-validator rules)
          → Controller (orchestrates response)
            → Service layer (business logic)
              → Model (database operations)
            ← ApiResponse / ApiError
          ← JSON response
```

### Key Design Principle: Middleware Order in app.js

**This is critical:** Webhook routes are mounted BEFORE the JSON body parser. Why? Because webhook signature verification needs the raw request bytes (`req.rawBody`). If the JSON parser runs first, the raw bytes are consumed and verification fails.

```javascript
// app.js (simplified)
app.use('/webhook', webhookRoutes);           // raw body needed
app.use('/razorpay-webhook', razorpayRoutes); // raw body needed
app.use(express.json({ ... }));               // JSON parser AFTER webhooks
app.use('/api', apiRoutes);                   // normal JSON routes
```

---

## 4. Directory Structure

```
salon/
├── server.js                    # Entry point: connects DB, starts server + cron
├── app.js                       # Express app: middleware stack, route mounting, SPA serving
├── package.json
├── Dockerfile                   # Multi-stage: build dashboard → copy into app image
├── docker-compose.yml           # app + mongo + nginx + certbot
├── .env.example
│
├── src/
│   ├── config/
│   │   ├── env.js               # Loads + validates env vars (fails fast on missing required vars)
│   │   ├── constants.js         # All enums, defaults, cron schedules
│   │   └── db.js                # mongoose.connect() with retry
│   │
│   ├── models/                  # Mongoose schemas
│   │   ├── index.js             # Re-exports all models
│   │   ├── Salon.js             # Tenant anchor (has whatsapp + payment subdocs)
│   │   ├── Service.js           # Salon's service catalog
│   │   ├── Staff.js             # Staff members with schedules
│   │   ├── Customer.js          # Auto-created from WhatsApp messages
│   │   ├── Appointment.js       # Core booking record
│   │   ├── Conversation.js      # Chat session with message history
│   │   ├── MessageLog.js        # WhatsApp message audit trail
│   │   ├── Payment.js           # Razorpay payment records
│   │   └── Offer.js             # Promotions / discounts
│   │
│   ├── routes/                  # Express routers
│   │   ├── index.js             # Mounts all /api sub-routes
│   │   ├── auth.routes.js
│   │   ├── salon.routes.js
│   │   ├── service.routes.js
│   │   ├── staff.routes.js
│   │   ├── appointment.routes.js
│   │   ├── customer.routes.js
│   │   ├── chat.routes.js
│   │   ├── webhook.routes.js         # Meta WhatsApp webhook
│   │   ├── razorpay-webhook.routes.js
│   │   ├── payment.routes.js
│   │   ├── analytics.routes.js
│   │   └── whatsapp-onboarding.routes.js
│   │
│   ├── controllers/             # Request handlers (thin — delegate to services)
│   ├── services/                # Business logic
│   │   ├── chat.service.js      # Main chatbot orchestrator
│   │   ├── llm.service.js       # OpenAI integration + tool definitions
│   │   ├── slot.service.js      # Availability algorithm
│   │   ├── payment.service.js   # Razorpay SDK wrapper
│   │   ├── whatsapp.service.js  # Meta Graph API client
│   │   ├── whatsapp-crypto.service.js  # AES-256-GCM encryption
│   │   ├── whatsapp-formatter.service.js  # LLM text → WhatsApp interactive messages
│   │   ├── reminder.service.js  # Cron: send appointment reminders
│   │   ├── noshow.service.js    # Cron: auto-mark no-shows
│   │   └── cleanup.service.js   # Cron: expire sessions, purge old logs
│   │
│   ├── middleware/
│   │   ├── auth.js              # JWT verification → req.salon
│   │   ├── validate.js          # express-validator result checker
│   │   ├── errorHandler.js      # Global error handler
│   │   ├── notFound.js          # 404 handler
│   │   ├── rateLimiter.js       # express-rate-limit (auth + general)
│   │   ├── webhookSignature.js  # Meta HMAC-SHA256 verification
│   │   └── razorpayWebhookSignature.js  # Razorpay per-salon signature verification
│   │
│   ├── validators/              # express-validator rule arrays
│   │   ├── auth.validator.js
│   │   ├── salon.validator.js
│   │   ├── service.validator.js
│   │   ├── staff.validator.js
│   │   ├── appointment.validator.js
│   │   └── customer.validator.js
│   │
│   ├── utils/
│   │   ├── ApiError.js          # Error factory: .badRequest(), .notFound(), etc.
│   │   ├── ApiResponse.js       # Response factory: .success(message, data)
│   │   ├── asyncHandler.js      # Wraps async controllers → catches errors
│   │   ├── logger.js            # Winston logger
│   │   └── otp.js               # OTP generation + (stub) SMS sending
│   │
│   └── cron/
│       └── index.js             # Registers all cron jobs via node-cron
│
├── dashboard/                   # React SPA
│   ├── src/
│   │   ├── main.tsx             # React entry point
│   │   ├── App.tsx              # QueryClient + Router provider
│   │   ├── router/
│   │   │   ├── routes.tsx       # All route definitions
│   │   │   └── protected-route.tsx  # Auth guard
│   │   ├── contexts/
│   │   │   └── auth-context.tsx # JWT token management
│   │   ├── api/
│   │   │   ├── client.ts        # Axios instance (base URL, JWT interceptor)
│   │   │   └── query-keys.ts    # React Query key factories
│   │   ├── hooks/               # React Query hooks (one per resource)
│   │   ├── pages/               # Route-level page components
│   │   ├── components/
│   │   │   ├── layout/          # Sidebar, header, page-header
│   │   │   ├── shared/          # Reusable components
│   │   │   └── ui/              # shadcn/ui primitives
│   │   ├── types/
│   │   │   └── index.ts         # TypeScript interfaces
│   │   └── lib/
│   │       └── utils.ts         # cn() helper for Tailwind
│   └── package.json
│
├── tests/
│   ├── helpers.js               # Factory functions for test data
│   ├── setup.js                 # DB connect/disconnect/clear
│   ├── globalSetup.js           # Start mongodb-memory-server
│   ├── globalTeardown.js        # Stop in-memory server
│   ├── env.setup.js             # Set test env vars
│   ├── phase1-*.test.js         # Auth + Salon CRUD
│   ├── phase2-*.test.js         # Services, Staff, Customers, Appointments
│   ├── phase3-*.test.js         # Chat, LLM, Formatter
│   ├── phase4-*.test.js         # Crypto, Onboarding, Webhooks
│   └── phase6-*.test.js         # Payments, Cron jobs
│
├── scripts/
│   ├── init-server.sh           # VPS provisioning (Docker, SSL, env)
│   ├── seed-test-data.js        # Seed a test salon
│   ├── check-data.js            # Inspect DB
│   ├── send-test-message.js     # Simulate WhatsApp message
│   └── send-hi.js               # Quick "Hi" test
│
├── nginx/
│   ├── nginx.conf               # Global nginx config
│   └── conf.d/salonbot.conf     # Site config (proxy, SSL, static)
│
└── docs/
    ├── USER-GUIDE.md
    └── DEVELOPER-GUIDE.md       # This file
```

---

## 5. Request Lifecycle

### Standard API Request

```
1. Client sends: PUT /api/salon/payment-settings
   Headers: Authorization: Bearer <jwt>
   Body: { "razorpayKeyId": "rzp_live_xxx", "isPaymentEnabled": true }

2. app.js middleware stack:
   - cors() → helmet() → mongoSanitize() → hpp()
   - generalLimiter (100 req/15min)
   - express.json() (parses body, sets req.rawBody)

3. Route: /api/salon/payment-settings
   - protect middleware → verifies JWT → loads Salon → sets req.salon
   - validate(updatePaymentSettingsRules) → checks body fields
   - salon.controller.updatePaymentSettings

4. Controller:
   - Reads req.body fields
   - Encrypts sensitive values (razorpayKeySecret)
   - Calls Salon.findByIdAndUpdate()
   - Returns ApiResponse.success()

5. Response: { status: "success", message: "Payment settings updated", data: { salon: {...} } }
```

### Webhook Request (WhatsApp)

```
1. Meta sends: POST /webhook
   Headers: X-Hub-Signature-256: sha256=abc123...
   Body: { "object": "whatsapp_business_account", "entry": [...] }

2. app.js: webhook routes mounted BEFORE json parser
   - express.json with verify callback → stores req.rawBody
   - webhookSignature middleware → HMAC-SHA256 verify with WHATSAPP_APP_SECRET
   - webhook.controller.handleWebhook

3. Controller:
   - Returns 200 immediately (Meta requires fast response)
   - Processes asynchronously:
     a. Extract messages from payload
     b. Look up salon by phoneNumberId
     c. Dedup check via MessageLog.wamid
     d. Call chat.service.processMessage()

4. chat.service.processMessage():
   a. resolveCustomer(phone) → find or create
   b. getOrCreateConversation() → 30-min session window
   c. buildSalonContext() → load salon + services + offers
   d. buildSystemPrompt() → inject context
   e. chatCompletion() → OpenAI with 8 tools
   f. Tool call loop (max 5 iterations):
      - Execute tool → append result → call OpenAI again
   g. formatForWhatsApp() → convert to buttons/list/text
   h. sendMessage() → Meta Graph API
   i. Save conversation + message logs
```

---

## 6. Database Models

### Relationships

```
Salon (tenant anchor)
  ├── Service[]       (salonId)
  ├── Staff[]         (salonId, services[])
  ├── Customer[]      (salonId)
  ├── Appointment[]   (salonId, customerId, staffId, serviceId)
  ├── Conversation[]  (salonId, customerId)
  ├── MessageLog[]    (salonId)
  ├── Payment[]       (salonId, appointmentId, customerId)
  └── Offer[]         (salonId, applicableServices[])
```

### Key Fields to Know

**Salon** — The tenant record. Contains embedded subdocuments for WhatsApp config and payment config. Sensitive fields use `select: false` so they're excluded from normal queries.

**Appointment** — The central business object. Links customer, staff, service. Has an embedded `payment` subdocument for quick status checks without joining to the Payment collection. Statuses: `pending → confirmed → in-progress → completed` (or `cancelled` / `no-show`).

**Conversation** — Chat session tracking. Has a `bookingContext` subdocument that accumulates booking details as the conversation progresses (service → date → time → staff). The `state` field tracks where in the flow the conversation is. Expires after 30 minutes of inactivity.

**MessageLog** — Audit trail for every WhatsApp message (inbound and outbound). The `wamid` field (Meta's message ID) is unique and used for deduplication — Meta sometimes sends duplicate webhook events.

**Customer** — Auto-created when a new phone number messages. Indian phone numbers are normalized by stripping the "91" country prefix. Unique index on `(salonId, phone)`.

### Important Indexes

```javascript
// Salon — sparse unique for WhatsApp phone number routing
{ 'whatsapp.phoneNumberId': 1 }  // unique, sparse

// Appointment — for slot conflict detection
{ salonId: 1, date: 1, staffId: 1 }

// Payment — for webhook event lookup
{ razorpayOrderId: 1 }
{ razorpayPaymentLinkId: 1 }

// MessageLog — for deduplication
{ wamid: 1 }  // unique
```

---

## 7. Authentication & Multi-Tenancy

### JWT Authentication

```javascript
// auth.js middleware (simplified)
const token = req.headers.authorization?.split(' ')[1];  // "Bearer <token>"
const decoded = jwt.verify(token, env.jwtSecret);
const salon = await Salon.findById(decoded.id);
req.salon = salon;  // Available in all downstream handlers
```

Every authenticated request has `req.salon` — the full Salon document for the current tenant.

### Multi-Tenancy: The salonId Pattern

Every resource belongs to a salon. This is enforced at the query level:

```javascript
// Creating a resource — stamp with salonId
const service = await Service.create({
  salonId: req.salon._id,
  name: 'Haircut',
  ...
});

// Querying — always filter by salonId
const services = await Service.find({ salonId: req.salon._id });

// Updating — scope to salonId to prevent cross-tenant access
const service = await Service.findOneAndUpdate(
  { _id: serviceId, salonId: req.salon._id },
  updates
);
```

> **Rule:** Every database query that touches tenant data MUST include `salonId: req.salon._id`. Missing this is a security bug.

---

## 8. API Endpoints Reference

### Authentication (`/api/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | No | Register new salon |
| POST | `/api/auth/login` | No | Login, returns JWT |
| POST | `/api/auth/verify-otp` | No | Verify phone OTP |
| GET | `/api/auth/me` | Yes | Get current salon |

### Salon (`/api/salon`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/salon/profile` | Yes | Get profile |
| PUT | `/api/salon/profile` | Yes | Update name, address, etc. |
| PUT | `/api/salon/working-hours` | Yes | Update daily schedule |
| PUT | `/api/salon/settings` | Yes | Update slot duration, buffer, holidays |
| PUT | `/api/salon/payment-settings` | Yes | Configure Razorpay |
| PUT | `/api/salon/reminder-settings` | Yes | Configure reminders |

### Services (`/api/services`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/services` | Yes | List salon's services |
| POST | `/api/services` | Yes | Create service |
| PUT | `/api/services/:id` | Yes | Update service |
| DELETE | `/api/services/:id` | Yes | Delete service |

### Staff (`/api/staff`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/staff` | Yes | List staff |
| POST | `/api/staff` | Yes | Create staff member |
| PUT | `/api/staff/:id` | Yes | Update staff |
| DELETE | `/api/staff/:id` | Yes | Delete staff |

### Appointments (`/api/appointments`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/appointments` | Yes | List (paginated, filterable) |
| GET | `/api/appointments/today` | Yes | Today's appointments |
| GET | `/api/appointments/slots?serviceId=&date=` | Yes | Available time slots |
| POST | `/api/appointments` | Yes | Create appointment |
| PUT | `/api/appointments/:id` | Yes | Update status |

### Customers (`/api/customers`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/customers` | Yes | List (searchable, paginated) |
| GET | `/api/customers/due-revisit` | Yes | Customers needing follow-up |
| GET | `/api/customers/:id` | Yes | Customer detail |
| PUT | `/api/customers/:id` | Yes | Update customer |

### Payments (`/api/payments`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/payments/link` | Yes | Create Razorpay payment link |
| POST | `/api/payments/order` | Yes | Create Razorpay order |
| POST | `/api/payments/verify` | Yes | Verify payment signature |
| GET | `/api/payments` | Yes | List payments |
| GET | `/api/payments/appointment/:id` | Yes | Get payment for appointment |
| POST | `/api/payments/:paymentId/refund` | Yes | Initiate refund |

### Analytics (`/api/analytics`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/analytics/dashboard` | Yes | Summary stats |
| GET | `/api/analytics/revenue` | Yes | Revenue trends |
| GET | `/api/analytics/services` | Yes | Service performance |
| GET | `/api/analytics/staff` | Yes | Staff performance |
| GET | `/api/analytics/bookings` | Yes | Booking trends |
| GET | `/api/analytics/customers` | Yes | Customer acquisition |

### WhatsApp Onboarding (`/api/salon/whatsapp`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/salon/whatsapp/connect` | Yes | Connect WhatsApp account |
| DELETE | `/api/salon/whatsapp/disconnect` | Yes | Disconnect |
| GET | `/api/salon/whatsapp/status` | Yes | Connection status |

### Webhooks (No auth — signature verified)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/webhook` | Meta verification handshake |
| POST | `/webhook` | Incoming WhatsApp messages |
| POST | `/razorpay-webhook` | Razorpay payment events |

---

## 9. WhatsApp Chatbot System

The chatbot is the most complex subsystem. Here's how it works end-to-end.

### Entry Point: `chat.service.js` → `processMessage()`

```
processMessage(salonId, phone, messageText)
  │
  ├── resolveCustomer(salonId, phone)
  │     └── Find by (salonId, phone) or auto-create
  │
  ├── getOrCreateConversation(salonId, customerId, phone)
  │     └── Find active session or create new one (30-min timeout)
  │
  ├── buildSalonContext(salonId)
  │     └── Load: salon + services + active offers
  │
  ├── Build messages array:
  │     ├── System prompt (with salon context injected)
  │     ├── Last N conversation messages (from Conversation.messages)
  │     └── Current user message
  │
  ├── Tool call loop (max 5 iterations):
  │     ├── chatCompletion(messages, tools) → OpenAI API
  │     ├── If response has tool_calls:
  │     │     ├── executeToolCall(toolName, args, salonId, customerId)
  │     │     ├── Append tool result to messages
  │     │     └── Loop again
  │     └── If response is text:
  │           └── Break loop
  │
  ├── formatForWhatsApp(responseText)
  │     └── Detect buttons/lists → convert to interactive format
  │
  ├── Save to Conversation.messages
  │
  └── Return formatted response
```

### The 8 LLM Tools

Defined in `llm.service.js` as OpenAI function-calling tool definitions:

| Tool | Parameters | What It Does |
|------|-----------|-------------|
| `get_services` | `category?` | Query Service collection, return name/price/duration |
| `get_available_slots` | `serviceId, date, staffId?` | Call slot.service.getAvailableSlots() |
| `create_booking` | `serviceId, staffId, date, startTime` | Create Appointment + optionally Payment link |
| `cancel_appointment` | `appointmentId` | Set status to cancelled |
| `get_customer_appointments` | — | Find upcoming appointments for this customer |
| `get_salon_info` | — | Return address, hours, phone |
| `get_offers` | — | Find active Offer records |
| `handoff_to_human` | `reason?` | Set conversation state to human_handoff |

### System Prompt

The system prompt is dynamically built with real salon data:

```
You are a friendly WhatsApp booking assistant for {salon.name}.
Location: {address}. Hours: {formatted hours}.

Services:
- Men's Haircut — ₹300, 30 min
- Facial — ₹800, 45 min
...

Active Offers:
- 20% off on Bridal Makeup (valid till 28/02/2026)

Today's date: 24/02/2026 (Monday)
Respond in Hinglish. Keep messages under 3-4 lines.
If payment is required, send payment link after booking.
```

### Message Formatting

`whatsapp-formatter.service.js` converts LLM text into WhatsApp interactive message types:

- **Buttons** (2-3 options detected): Interactive reply buttons
- **Lists** (4+ numbered items detected): Interactive list with sections
- **Plain text**: Regular text message

Detection uses regex patterns to identify confirmation questions ("Shall I book?") and numbered lists ("1. Haircut — ₹300").

---

## 10. Slot Availability Algorithm

`slot.service.js` → `getAvailableSlots(salonId, serviceId, date, staffId?)`

```
1. Validate date:
   - Is the salon open on this day? (check workingHours)
   - Is this date a holiday?

2. Get eligible staff:
   - If staffId specified → just that staff member
   - Otherwise → all staff who can do this service AND are available on this day

3. For each staff member:
   a. Get their working hours for this day (startTime, endTime)
   b. Get existing appointments for this staff on this date
   c. Walk through the day in slotDuration increments:
      - Candidate window: [currentTime, currentTime + serviceDuration]
      - Check if window fits within staff hours
      - Check for conflicts with existing appointments:
        - Conflict if: existingStart < candidateEnd AND existingEnd > candidateStart
        - Buffer time added: actual blocked range = [apptStart - buffer, apptEnd + buffer]
      - If no conflict → this slot is available

4. Return sorted array:
   [{ startTime: "10:00", endTime: "10:30", staffId, staffName }, ...]
```

### Conflict Detection (Visual)

```
Timeline:  9:00  9:30  10:00  10:30  11:00  11:30
                 ├─────existing─────┤
           ├─buf─┤                  ├─buf─┤
     ────────BLOCKED RANGE──────────────────
                                          ├──candidate──┤  ← OK, no overlap
           ├──candidate──┤                               ← BLOCKED, overlaps
```

---

## 11. Payment System (Razorpay)

### Two Payment Flows

**1. WhatsApp Flow (Payment Link)**

```
Chatbot create_booking tool
  → payment.service.createPaymentLink(salon, appointment, customer)
    → Razorpay SDK: razorpay.paymentLink.create({ amount, customer, notify, callback_url })
    → Returns short URL (e.g., https://rzp.io/i/abc123)
    → Chatbot sends link in WhatsApp message
    → Customer pays
    → Razorpay POSTs to /razorpay-webhook (payment_link.paid event)
    → processWebhookEvent() updates Payment + Appointment status
```

**2. Dashboard Flow (Razorpay Order + Checkout)**

```
Dashboard: POST /api/payments/order { appointmentId }
  → payment.service.createOrder(salon, appointment)
    → Razorpay SDK: razorpay.orders.create({ amount, currency })
    → Returns orderId
  → Client opens Razorpay Checkout modal (razorpayKeyId + orderId)
  → Customer pays in modal
  → Client receives (razorpay_payment_id, razorpay_order_id, razorpay_signature)
  → Client: POST /api/payments/verify { razorpayPaymentId, razorpayOrderId, razorpaySignature }
    → verifyPaymentSignature() → HMAC-SHA256 check
    → Update Payment + Appointment
```

### Per-Salon Razorpay Accounts

Each salon can configure their own Razorpay account (Key ID + Key Secret + Webhook Secret). The `getRazorpayClient(salonId)` function checks for salon-level keys first, falling back to platform-level env vars.

The webhook signature middleware (`razorpayWebhookSignature.js`) does per-salon verification:

```
1. Parse payload → extract payment_link_id / order_id / payment_id
2. Look up Payment record → get salonId
3. Look up Salon → decrypt their razorpayWebhookSecret
4. Verify signature with salon's secret
5. If no salon secret or Payment not found → try global env secret
6. If neither matches → reject 401
```

---

## 12. Webhook Architecture

### WhatsApp Webhook (`POST /webhook`)

```
Meta Cloud API → POST /webhook
  │
  ├── webhookSignature middleware:
  │     HMAC-SHA256(rawBody, WHATSAPP_APP_SECRET) === X-Hub-Signature-256
  │
  ├── webhook.controller.handleWebhook:
  │     ├── Return 200 immediately
  │     └── processWebhookPayload (async):
  │           ├── Extract entry[].changes[].value
  │           ├── Handle messages[]:
  │           │     ├── Extract: phoneNumberId, from (phone), text
  │           │     ├── Find salon by phoneNumberId
  │           │     ├── Dedup check: MessageLog.findOne({ wamid })
  │           │     ├── chat.service.processMessage()
  │           │     └── whatsapp.service.sendMessage()
  │           └── Handle statuses[]:
  │                 └── Update MessageLog delivery status
```

### Razorpay Webhook (`POST /razorpay-webhook`)

```
Razorpay → POST /razorpay-webhook
  │
  ├── razorpayWebhookSignature middleware:
  │     Per-salon or global HMAC-SHA256 verification
  │
  ├── razorpay-webhook.controller.handleRazorpayWebhook:
  │     └── payment.service.processWebhookEvent(event):
  │           ├── payment_link.paid → update Payment + Appointment
  │           ├── payment.captured → update Payment + Appointment
  │           ├── payment.failed → mark Payment as failed
  │           └── refund.processed → mark as refunded
```

### Multi-Tenant Webhook Routing (WhatsApp)

All salons share a single `/webhook` URL. Routing works by `phoneNumberId`:

```javascript
// The phoneNumberId in the payload identifies which salon this message belongs to
const salon = await Salon.findOne({
  'whatsapp.phoneNumberId': phoneNumberId,
  'whatsapp.isConnected': true,
});
```

---

## 13. Cron Jobs

Registered in `src/cron/index.js`, started from `server.js`.

| Job | Schedule | Service | What It Does |
|-----|----------|---------|-------------|
| Reminders | `*/5 * * * *` (every 5 min) | `reminder.service.processReminders()` | Find confirmed appointments approaching their reminder windows. Send WhatsApp messages. Track sent reminders in `appointment.remindersSent[]` to avoid duplicates. |
| No-Show | `*/15 * * * *` (every 15 min) | `noshow.service.processNoShows()` | Find confirmed/in-progress appointments where `endTime + noShowBufferMinutes` has passed. Set status to `no-show`. |
| Cleanup | `0 3 * * *` (daily 3am) | `cleanup.service.runCleanup()` | Expire conversations inactive for 24+ hours. Delete MessageLog entries older than 90 days. |

---

## 14. Security

### Password Handling

- Hashed with bcrypt (12 rounds) via Mongoose pre-save hook
- `select: false` in schema — never included in query results by default
- Compared via `salon.comparePassword(candidatePassword)` using timing-safe bcrypt.compare

### Token Encryption (AES-256-GCM)

Used for WhatsApp access tokens, Razorpay keys, and webhook secrets.

```javascript
// Encrypt: returns "iv:authTag:ciphertext" (all hex-encoded)
const encrypted = encryptToken(plaintext);  // uses WHATSAPP_ENCRYPTION_KEY

// Decrypt: reverses the process
const plaintext = decryptToken(encrypted);
```

Key: 32-byte hex string from `WHATSAPP_ENCRYPTION_KEY` env var. Same key for all encrypted fields (WhatsApp and Razorpay).

### Webhook Signature Verification

**WhatsApp (Meta):**
```javascript
HMAC-SHA256(rawBody, WHATSAPP_APP_SECRET) === X-Hub-Signature-256 header
```

**Razorpay:**
```javascript
HMAC-SHA256(rawBody, webhookSecret) === X-Razorpay-Signature header
// Tries salon-specific secret first, falls back to global
```

Both use `crypto.timingSafeEqual()` to prevent timing attacks.

### Rate Limiting

```javascript
// Auth endpoints: 10 requests per 15 minutes (per IP)
// API endpoints: 100 requests per 15 minutes (per IP)
```

### Input Sanitization

- `express-mongo-sanitize` — prevents NoSQL injection (`$gt`, `$regex` in body)
- `hpp` — prevents HTTP parameter pollution
- `helmet` — security headers
- `express-validator` — input validation on all routes

### CORS

Configured for dashboard origin in production. Wide open in development.

---

## 15. Dashboard (React SPA)

### Tech Stack

- **React 19** with TypeScript
- **Vite** for dev server and builds
- **React Router v7** for client-side routing
- **React Query** for server state management
- **React Hook Form + Zod** for form validation
- **Tailwind CSS 4** for styling
- **shadcn/ui** (Radix primitives) for UI components
- **Recharts** for analytics charts
- **Axios** for API calls

### Key Patterns

**API Layer (`dashboard/src/api/`):**
```typescript
// client.ts — Axios instance with JWT interceptor
const api = axios.create({ baseURL: '/api' });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

**React Query Hooks (`dashboard/src/hooks/`):**
```typescript
// Each resource has a dedicated hook file
// Query: useAppointments(), useServices(), useStaff(), etc.
// Mutation: useCreateAppointment(), useUpdateService(), etc.
// Keys are centralized in api/query-keys.ts
```

**Auth Context:**
```typescript
// Wraps the app, provides login/logout/token management
// ProtectedRoute component redirects to /login if no token
```

### Adding a New Dashboard Page

1. Create `dashboard/src/pages/my-feature/index.tsx`
2. Add route in `dashboard/src/router/routes.tsx`
3. Add sidebar link in `dashboard/src/components/layout/sidebar.tsx`
4. Create React Query hook in `dashboard/src/hooks/use-my-feature.ts`

### Production Serving

The dashboard is built to `dashboard/dist/` and served as static files by Express:

```javascript
// app.js
app.use(express.static(path.join(__dirname, 'dashboard', 'dist')));

// SPA fallback — all non-API routes serve index.html
app.get(/^\/(?!api|webhook|razorpay-webhook|health).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard', 'dist', 'index.html'));
});
```

---

## 16. Testing

### Setup

Tests use `mongodb-memory-server` — a completely in-memory MongoDB. No external database needed.

```
globalSetup.js  → Starts MongoMemoryServer, writes URI to env
setup.js        → beforeAll: connect, afterEach: clear all collections, afterAll: disconnect
globalTeardown.js → Stops MongoMemoryServer
```

### Test Helpers (`tests/helpers.js`)

```javascript
// Create a salon + JWT token for authenticated requests
const { salon, token } = await createSalonAndToken();

// Create a full setup (salon + service + staff + customer)
const { salon, token, service, staff, customer } = await createFullSetup();

// Build a Meta webhook payload
const payload = buildWebhookPayload(phoneNumberId, from, text);

// Sign a payload for webhook tests
const signature = signPayload(payload, secret);
```

### Running Tests

```bash
npm test                                        # all tests
npm test -- tests/phase2-appointments.test.js   # single file
npm test -- --testNamePattern="should create"    # by name pattern
npm run test:verbose                            # detailed output
```

### Test File Organization

| Phase | Files | Coverage |
|-------|-------|---------|
| Phase 1 | auth, salon | Registration, login, OTP, profile CRUD |
| Phase 2 | services, staff, customers, appointments | All CRUD + slot availability + conflict detection |
| Phase 3 | chat, llm, formatter | Chatbot flow, tool execution, WhatsApp formatting |
| Phase 4 | crypto, onboarding, webhook | Encryption, WhatsApp connect, webhook handling |
| Phase 6 | payment, chat-payment, cron | Razorpay flow, chatbot payments, scheduled jobs |

### Writing New Tests

Follow the existing pattern:

```javascript
const request = require('supertest');
const app = require('../app');
const { createSalonAndToken } = require('./helpers');

describe('My Feature', () => {
  let salon, token;

  beforeEach(async () => {
    ({ salon, token } = await createSalonAndToken());
  });

  it('should do something', async () => {
    const res = await request(app)
      .post('/api/my-route')
      .set('Authorization', `Bearer ${token}`)
      .send({ field: 'value' });

    expect(res.status).toBe(200);
    expect(res.body.data.field).toBe('value');
  });
});
```

---

## 17. Deployment

### Docker Setup

```
Dockerfile (multi-stage):
  Stage 1: Build dashboard (npm run build in /dashboard)
  Stage 2: Copy app + built dashboard into Node 20 Alpine image

docker-compose.yml:
  app:      Node app (port 5000, PM2 runtime)
  mongo:    MongoDB 7 (persistent volume)
  nginx:    Reverse proxy (80/443 → app:5000)
  certbot:  SSL certificate management
```

### Production Architecture

```
Internet → nginx (80/443)
             ├── /api/*              → proxy to app:5000
             ├── /webhook            → proxy to app:5000
             ├── /razorpay-webhook   → proxy to app:5000
             ├── /health             → proxy to app:5000
             └── /*                  → dashboard static files (with SPA fallback)
```

### VPS Setup Script

`scripts/init-server.sh` automates server provisioning:

1. System update + firewall (UFW: allow SSH, HTTP, HTTPS)
2. Install Docker
3. Clone repo
4. Interactive .env creation (prompts for secrets)
5. SSL certificate via Let's Encrypt (2-phase: HTTP-only first, then switch to HTTPS)
6. Start `docker compose up -d`
7. Health check verification

### Environment Variables

**Required for production:**

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Random 64+ char string |
| `OPENAI_API_KEY` | OpenAI API key |
| `WHATSAPP_APP_SECRET` | From Meta App Dashboard |
| `WHATSAPP_VERIFY_TOKEN` | Custom string for webhook verification |
| `WHATSAPP_ENCRYPTION_KEY` | 32-byte hex (for AES-256-GCM) |
| `BASE_URL` | `https://yourdomain.com` |

**Optional:**

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5000 |
| `RAZORPAY_KEY_ID` | Platform Razorpay key | — |
| `RAZORPAY_KEY_SECRET` | Platform Razorpay secret | — |
| `RAZORPAY_WEBHOOK_SECRET` | Platform webhook secret | — |

---

## 18. Common Patterns & Conventions

### Error Handling

```javascript
// In controllers — asyncHandler catches all errors
const myHandler = asyncHandler(async (req, res) => {
  const item = await Model.findOne({ _id: id, salonId: req.salon._id });
  if (!item) throw ApiError.notFound('Item not found');
  res.json(ApiResponse.success('Got it', { item }));
});

// ApiError factory methods:
ApiError.badRequest('message')     // 400
ApiError.unauthorized('message')   // 401
ApiError.notFound('message')       // 404
ApiError.internal('message')       // 500

// ApiResponse factory:
ApiResponse.success('message', data)  // { status: "success", message, data }
```

### Validation

```javascript
// validators/my.validator.js
const myRules = [
  body('name').trim().notEmpty().withMessage('Name required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be positive'),
];

// routes/my.routes.js
router.post('/', protect, validate(myRules), controller.create);
```

### Adding a New Model

1. Create `src/models/MyModel.js` with Mongoose schema
2. Add to `src/models/index.js` exports
3. Remember: include `salonId` field with index

### Adding a New API Endpoint

1. Create validator rules in `src/validators/`
2. Create controller in `src/controllers/` (use `asyncHandler`)
3. Create route in `src/routes/` (use `protect`, `validate`)
4. Mount in `src/routes/index.js`
5. Add test in `tests/`

---

## 19. Adding a New Feature (Walkthrough)

Let's say you need to add a "Reviews" feature where customers can rate appointments.

### Step 1: Model

```javascript
// src/models/Review.js
const reviewSchema = new mongoose.Schema({
  salonId: { type: ObjectId, ref: 'Salon', required: true, index: true },
  appointmentId: { type: ObjectId, ref: 'Appointment', required: true },
  customerId: { type: ObjectId, ref: 'Customer', required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, maxlength: 500 },
}, { timestamps: true });
```

Add to `src/models/index.js`.

### Step 2: Validator

```javascript
// src/validators/review.validator.js
const createReviewRules = [
  body('appointmentId').isMongoId(),
  body('rating').isInt({ min: 1, max: 5 }),
  body('comment').optional().trim().isLength({ max: 500 }),
];
```

### Step 3: Controller

```javascript
// src/controllers/review.controller.js
const createReview = asyncHandler(async (req, res) => {
  const review = await Review.create({
    salonId: req.salon._id,
    ...req.body,
  });
  res.status(201).json(ApiResponse.success('Review created', { review }));
});
```

### Step 4: Routes

```javascript
// src/routes/review.routes.js
router.post('/', protect, validate(createReviewRules), controller.createReview);
router.get('/', protect, controller.listReviews);
```

Mount in `src/routes/index.js`:
```javascript
router.use('/reviews', require('./review.routes'));
```

### Step 5: Test

```javascript
// tests/reviews.test.js
describe('Reviews', () => {
  it('should create a review', async () => {
    const { token, salon } = await createFullSetup();
    // ... create appointment, then review it
  });
});
```

### Step 6: Dashboard

1. Hook: `dashboard/src/hooks/use-reviews.ts`
2. Page: `dashboard/src/pages/reviews/index.tsx`
3. Route: Add to `dashboard/src/router/routes.tsx`
4. Sidebar: Add link in `dashboard/src/components/layout/sidebar.tsx`

### Step 7: Chatbot Tool (Optional)

If customers should be able to leave reviews via WhatsApp:

1. Add tool definition in `llm.service.js`
2. Add execution handler in `chat.service.js` → `executeToolCall()`
3. Update system prompt to mention the capability

---

That's the full picture. If you have questions about any specific subsystem, read the source file — the codebase is well-organized and most files are under 200 lines.
