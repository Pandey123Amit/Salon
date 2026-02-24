# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Backend
npm run dev              # Start with nodemon (port 5000)
npm start                # Production start
npm test                 # Run all tests (jest + mongodb-memory-server)
npm run test:verbose     # Verbose test output
npm test -- tests/phase2-appointments.test.js  # Single test file
docker compose up -d     # Start MongoDB on port 27017

# Dashboard (cd dashboard/)
npm run dev              # Vite dev server (port 5173)
npm run build            # Production build to dist/
```

## Architecture

Multi-tenant SaaS WhatsApp booking agent for Indian salons. Each salon gets an AI chatbot that handles appointments via WhatsApp.

### Request Flow

```
Request → app.js middleware stack → routes → controller → service → model → response
```

**Middleware order in app.js matters**: Webhook routes mount BEFORE the JSON body parser to capture raw bytes for HMAC signature verification (`req.rawBody`). All `/api` routes go through rate limiting, auth, and validation.

### Key Patterns

- **asyncHandler** (`src/utils/asyncHandler.js`): Wraps all controller methods — catches async errors and forwards to errorHandler middleware.
- **ApiError/ApiResponse** (`src/utils/`): Factory methods for consistent responses. `ApiError.badRequest()`, `ApiError.notFound()`, `ApiResponse.success(message, data)`.
- **Auth middleware** (`src/middleware/auth.js`): Verifies JWT Bearer token, attaches `req.salon` (full document) for tenant scoping. Every DB query filters by `salonId`.
- **Validation** (`src/middleware/validate.js`): Runs express-validator rules, returns structured errors.

### Multi-Tenant Webhook Routing

Single `/webhook` endpoint handles ALL salons. When Meta sends a message, `phoneNumberId` in the payload identifies which salon it belongs to:

```
POST /webhook → verify HMAC signature → extract phoneNumberId →
  Salon.findOne({ 'whatsapp.phoneNumberId': phoneNumberId, 'whatsapp.isConnected': true }) →
  process message → AI chatbot → send reply via Graph API
```

Returns 200 immediately to Meta; processes asynchronously. Deduplication via `MessageLog.findOne({ wamid })`.

### AI Chatbot Flow

`chat.service.js` orchestrates: resolve customer (auto-create from phone) → get/create conversation session (30min timeout) → build system prompt with salon context → call OpenAI with 8 function tools → execute tool calls → format WhatsApp response.

**8 tools** defined in `llm.service.js`: `get_services`, `get_available_slots`, `create_booking`, `cancel_appointment`, `get_customer_appointments`, `get_salon_info`, `get_offers`, `handoff_to_human`. Max 5 tool iterations per turn.

**System prompt** injects: salon name/address/hours, service catalog with prices, active offers, current date (for relative date handling).

### Slot Availability Algorithm (`slot.service.js`)

For each eligible staff member: walk through the day in `salon.slotDuration` increments, check each candidate `[t, t+serviceDuration]` against existing appointments (with buffer). Conflict = overlap detection. Returns sorted slots with staff assignment.

### Token Encryption

WhatsApp access tokens stored encrypted in MongoDB using AES-256-GCM. Format: `iv:authTag:ciphertext` (hex-encoded). Key from `WHATSAPP_ENCRYPTION_KEY` env var.

## Database Models

- **Salon** — tenant anchor. Contains `whatsapp` subdoc (phoneNumberId, encrypted accessToken, isConnected). Password field is `select: false`.
- **Service** — categories enum: `Hair, Skin, Nails, Makeup, Spa, Beard, Bridal, Other` (capitalized).
- **Staff** — has `services[]` (ObjectId refs) and `schedule[]` (per-day hours). No staff = no available slots.
- **Appointment** — statuses: `pending, confirmed, in-progress, completed, cancelled, no-show`. Compound index on `(salonId, date, staffId)`.
- **Customer** — auto-created when new phone number messages. Indian phone normalized: strip "91" prefix.
- **Conversation** — chat session with `state`, `messages[]`, `bookingContext`. Expires after 30min inactivity.
- **MessageLog** — audit trail with `wamid` (Meta's message ID, unique). Tracks delivery status.

## Test Setup

Tests use `mongodb-memory-server` (no external MongoDB needed). Global setup spawns the in-memory server; teardown cleans up. `tests/helpers.js` has factory functions: `createSalonAndToken()`, `createFullSetup()`, `buildWebhookPayload()`, `signPayload()`.

Phase 1-4 test files cover: auth, salon CRUD, services, staff, customers, appointments, chat/LLM, message formatting, crypto, webhooks, onboarding.

## Environment Variables

**Required**: `MONGODB_URI`, `JWT_SECRET`, `OPENAI_API_KEY` — validated on startup by `src/config/env.js`.

**WhatsApp** (optional for dev): `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_ENCRYPTION_KEY`, `WHATSAPP_PHONE_NUMBER_ID`, `BASE_URL`.

## Build Phases

- Phase 1-4: Complete (backend + WhatsApp integration + 161 tests)
- Phase 5: Dashboard (React/TypeScript/Vite) — scaffolded, needs integration
- Phase 6: Razorpay payments, cron jobs (reminders, no-show handling)
- Phase 7: Production deployment
