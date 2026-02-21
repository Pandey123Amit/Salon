# 🤖 AI WhatsApp Booking Agent for Salons — Full Coding Prompt

> **Copy-paste this entire prompt into Claude (or any AI coding tool) to build your salon booking bot step by step.**

---

## MASTER PROMPT

```
You are an expert full-stack developer. Build me a complete AI-powered WhatsApp booking agent for Indian salons. This is a SaaS product where salon owners sign up and get an AI bot that handles their WhatsApp customer interactions automatically.

## PROJECT OVERVIEW

Product Name: SalonBot AI (or suggest a better name)
Target Users: Indian salon/parlour owners
Platform: WhatsApp Business API (via Gupshup or Wati)
Languages: Hindi + English (Hinglish support)
Payments: UPI via Razorpay
Tech Stack: Node.js (Backend) + React.js (Frontend Dashboard) + MongoDB (Database) + OpenAI/Claude API (AI Brain)

---

## CORE FEATURES TO BUILD

### 1. WhatsApp AI Chatbot (Customer-Facing)
The bot should handle these conversations automatically on WhatsApp:

**Booking Flow:**
- Customer sends any message like "appointment chahiye", "kal 3 baje slot hai?", "haircut book karna hai"
- Bot understands the intent (even in Hinglish/Hindi)
- Bot shows available services with prices
- Bot shows available time slots for selected date
- Customer picks a slot → Bot confirms booking
- Bot sends salon Google Maps location
- Bot sends booking confirmation with details

**Reminder System:**
- Send reminder 1 hour before appointment
- Send reminder on the morning of appointment day
- If customer doesn't show up → send follow-up message

**Repeat Visit Reminders:**
- Track last visit date for each customer
- After 30-45 days → send "Time for your next haircut/facial!" message
- Personalize based on what service they got last time

**Payment Collection:**
- Send UPI payment link for advance booking amount
- Confirm payment received
- Send receipt/invoice

**FAQ Handling:**
- "Kya services available hain?" → Show service menu with prices
- "Salon kahan hai?" → Send Google Maps location
- "Timing kya hai?" → Show working hours
- "Koi offer hai?" → Show current discounts/offers
- "Cancel karna hai" → Handle cancellation with policy

**Smart Responses:**
- Understand Hindi, English, and Hinglish messages
- Handle spelling mistakes and slang
- If bot can't understand → gracefully transfer to salon owner
- Handle multiple conversations simultaneously

### 2. Salon Owner Dashboard (Web App)
Build a React.js dashboard where salon owners can:

**Dashboard Home:**
- Today's appointments (timeline view)
- Total bookings this week/month
- Revenue summary
- Upcoming appointments
- No-show count

**Appointment Management:**
- View all appointments (calendar view + list view)
- Accept/reject/reschedule appointments
- Mark as completed/no-show
- Add walk-in customers manually

**Service Management:**
- Add/edit/delete services (name, price, duration)
- Categories: Haircut, Coloring, Facial, Spa, Bridal, etc.
- Set service-specific time slots
- Enable/disable services

**Staff Management:**
- Add staff members (name, specialization)
- Set individual schedules/availability
- Assign services to specific staff
- Track staff performance

**Customer Database (CRM):**
- Auto-save every customer who messages
- Customer name, phone, visit history
- Last visit date, total spending
- Notes/preferences (e.g., "prefers stylist Ravi")
- Birthday tracking for offers

**Schedule & Availability:**
- Set working hours (day-wise)
- Block specific dates (holidays/off days)
- Set break times (lunch, etc.)
- Configure slot duration (30 min, 45 min, 1 hour)

**Offers & Promotions:**
- Create discount codes
- Set up "Happy Hours" deals
- Festival offers (Diwali, Holi, etc.)
- Loyalty rewards (every 5th visit free, etc.)

**Analytics & Reports:**
- Daily/weekly/monthly booking trends
- Revenue reports
- Most popular services
- Peak hours analysis
- Customer retention rate
- No-show rate

**Settings:**
- Salon profile (name, address, photos, Google Maps link)
- WhatsApp number configuration
- Auto-reply messages customization
- Notification preferences
- Payment settings (Razorpay API keys)

### 3. Super Admin Panel (For You - SaaS Owner)
- View all registered salons
- Manage subscriptions (Basic/Pro/Premium)
- Revenue tracking from all salons
- Usage analytics
- Support ticket management

---

## DATABASE SCHEMA (MongoDB)

Design these collections:

### salons
{
  _id,
  name,
  ownerName,
  phone,
  whatsappNumber,
  email,
  address,
  googleMapsLink,
  city,
  workingHours: { monday: { open, close }, ... },
  holidays: [dates],
  breakTime: { start, end },
  slotDuration: 30, // minutes
  subscription: { plan, startDate, endDate, status },
  razorpayKeys: { keyId, keySecret },
  createdAt
}

### services
{
  _id,
  salonId,
  name,
  nameHindi,
  category,
  price,
  duration, // minutes
  description,
  isActive,
  assignedStaff: [staffIds]
}

### staff
{
  _id,
  salonId,
  name,
  phone,
  specialization,
  schedule: { monday: { start, end }, ... },
  isActive
}

### appointments
{
  _id,
  salonId,
  customerId,
  staffId,
  serviceId,
  date,
  timeSlot: { start, end },
  status: "booked" | "confirmed" | "completed" | "cancelled" | "no-show",
  paymentStatus: "pending" | "paid" | "refunded",
  paymentAmount,
  razorpayPaymentId,
  source: "whatsapp" | "walk-in" | "dashboard",
  reminderSent: { oneHour: false, morning: false },
  notes,
  createdAt
}

### customers
{
  _id,
  salonId,
  name,
  phone,
  whatsappId,
  totalVisits,
  totalSpending,
  lastVisitDate,
  lastService,
  preferences,
  birthday,
  notes,
  conversationHistory: [{ message, sender, timestamp }],
  createdAt
}

### offers
{
  _id,
  salonId,
  title,
  description,
  discountType: "percentage" | "flat",
  discountValue,
  validFrom,
  validTill,
  applicableServices: [serviceIds],
  code,
  isActive
}

---

## API ENDPOINTS TO BUILD

### Auth APIs
POST   /api/auth/register          - Salon owner signup
POST   /api/auth/login             - Login
POST   /api/auth/verify-otp        - OTP verification
GET    /api/auth/me                - Get current user

### Salon APIs
GET    /api/salon/profile          - Get salon profile
PUT    /api/salon/profile          - Update salon profile
PUT    /api/salon/working-hours    - Update working hours
PUT    /api/salon/settings         - Update settings

### Service APIs
GET    /api/services               - List all services
POST   /api/services               - Add new service
PUT    /api/services/:id           - Update service
DELETE /api/services/:id           - Delete service

### Staff APIs
GET    /api/staff                  - List all staff
POST   /api/staff                  - Add staff
PUT    /api/staff/:id              - Update staff
DELETE /api/staff/:id              - Remove staff

### Appointment APIs
GET    /api/appointments           - List appointments (with filters)
GET    /api/appointments/today     - Today's appointments
POST   /api/appointments           - Create appointment (walk-in)
PUT    /api/appointments/:id       - Update appointment status
GET    /api/appointments/slots     - Get available slots for a date

### Customer APIs
GET    /api/customers              - List all customers
GET    /api/customers/:id          - Customer detail with history
PUT    /api/customers/:id          - Update customer info
GET    /api/customers/due-revisit  - Customers due for revisit

### Analytics APIs
GET    /api/analytics/dashboard    - Dashboard summary
GET    /api/analytics/revenue      - Revenue reports
GET    /api/analytics/services     - Popular services
GET    /api/analytics/trends       - Booking trends

### WhatsApp Webhook
POST   /api/webhook/whatsapp       - Receive incoming messages
POST   /api/webhook/payment        - Razorpay payment callback

---

## AI CHATBOT LOGIC (Most Important Part)

Build the AI conversation handler with this logic:

### System Prompt for AI:
"You are a friendly WhatsApp assistant for {salon_name} salon located in {city}. 
You help customers book appointments, answer questions about services and prices, 
and provide salon information. You speak in a mix of Hindi and English (Hinglish) 
naturally. Be warm, professional, and helpful. Use emojis occasionally.

Salon Details:
- Name: {salon_name}
- Address: {address}
- Working Hours: {hours}
- Services: {service_list_with_prices}
- Available Slots Today: {available_slots}

Rules:
1. Always try to convert inquiry into a booking
2. If customer asks about price, show price AND suggest booking
3. If customer seems confused, offer top 3 popular services
4. Never make up information - only use provided salon data
5. If you can't handle something, say 'Main aapko salon owner se connect kar deta hoon'
6. Keep messages short - max 3-4 lines per message on WhatsApp
7. Use ✅ 📅 ⏰ 💇 emojis naturally
8. Confirm details before final booking"

### Conversation State Machine:
GREETING → INTENT_DETECTION → SERVICE_SELECTION → DATE_SELECTION → 
SLOT_SELECTION → CONFIRMATION → PAYMENT (optional) → BOOKING_COMPLETE

### Message Handler Flow:
1. Receive WhatsApp message
2. Find or create customer in database
3. Get salon context (services, availability, settings)
4. Send message + context + conversation history to AI API
5. AI generates response with action tags like [BOOK], [SHOW_SLOTS], [SEND_LOCATION]
6. Parse AI response, execute actions (create booking, fetch slots, etc.)
7. Send formatted response back via WhatsApp API

---

## WHATSAPP INTEGRATION

Use Gupshup or Wati WhatsApp Business API:

### Webhook Handler (incoming messages):
- Verify webhook signature
- Parse message type (text, image, location, button reply)
- Route to AI conversation handler
- Handle message queuing for rate limits

### Outgoing Messages:
- Text messages
- Interactive button messages (for slot selection)
- List messages (for service selection)
- Location messages (salon address)
- Template messages (reminders, promotions)

---

## CRON JOBS / SCHEDULED TASKS

1. **Appointment Reminders** (runs every 15 min)
   - Check appointments in next 1 hour → send reminder
   - Check tomorrow's appointments at 8 AM → send morning reminder

2. **Revisit Reminders** (runs daily at 10 AM)
   - Find customers whose last visit > 30 days
   - Send personalized WhatsApp message

3. **No-Show Handler** (runs every 30 min)
   - Mark appointments as no-show if time passed + not completed
   - Send follow-up message to customer

4. **Subscription Check** (runs daily)
   - Check expiring subscriptions
   - Send renewal reminders to salon owners

---

## PAYMENT INTEGRATION (Razorpay)

- Generate UPI payment link for advance booking
- Send payment link via WhatsApp
- Handle payment webhook callback
- Update appointment payment status
- Generate payment receipts

---

## PROJECT STRUCTURE

salon-bot/
├── backend/
│   ├── src/
│   │   ├── config/          # DB, env, constants
│   │   ├── models/          # Mongoose schemas
│   │   ├── routes/          # Express routes
│   │   ├── controllers/     # Route handlers
│   │   ├── services/        # Business logic
│   │   │   ├── ai.service.js        # AI/LLM integration
│   │   │   ├── whatsapp.service.js  # WhatsApp API
│   │   │   ├── booking.service.js   # Booking logic
│   │   │   ├── payment.service.js   # Razorpay
│   │   │   ├── reminder.service.js  # Cron jobs
│   │   │   └── sms.service.js       # SMS fallback
│   │   ├── middleware/      # Auth, error handling
│   │   ├── utils/           # Helpers
│   │   └── app.js           # Express app
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Dashboard pages
│   │   ├── services/        # API calls
│   │   ├── context/         # React context/state
│   │   └── App.jsx
│   └── package.json
└── README.md

---

## ENVIRONMENT VARIABLES (.env)

MONGODB_URI=
JWT_SECRET=
OPENAI_API_KEY= (or ANTHROPIC_API_KEY for Claude)
WHATSAPP_API_KEY=
WHATSAPP_API_URL=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
GUPSHUP_APP_NAME=
GUPSHUP_API_KEY=
PORT=5000
NODE_ENV=development

---

## DEPLOYMENT

- Backend: Railway / Render / AWS EC2
- Frontend: Vercel / Netlify
- Database: MongoDB Atlas
- File Storage: AWS S3 (for salon photos)
- Domain: Custom domain with SSL

---

## BUILD ORDER (Step by Step)

Please build in this exact order:

### Phase 1: Foundation
1. Set up Node.js backend with Express
2. Set up MongoDB connection with Mongoose
3. Create all database models/schemas
4. Build authentication (signup, login, OTP)
5. Build basic CRUD APIs for salon, services, staff

### Phase 2: Booking Engine
6. Build slot availability calculator
7. Build appointment booking logic
8. Build appointment management APIs
9. Build customer database/CRM APIs

### Phase 3: AI Chatbot
10. Build AI conversation handler with OpenAI/Claude
11. Build conversation state management
12. Build intent detection for Hindi/English/Hinglish
13. Build response formatter for WhatsApp

### Phase 4: WhatsApp Integration
14. Set up WhatsApp webhook handler
15. Build message sender (text, buttons, lists)
16. Connect AI chatbot to WhatsApp pipeline
17. Test end-to-end booking via WhatsApp

### Phase 5: Dashboard
18. Build React frontend with routing
19. Build login/signup pages
20. Build dashboard home with stats
21. Build appointment calendar view
22. Build service management page
23. Build staff management page
24. Build customer list and detail pages
25. Build analytics/reports pages
26. Build settings page

### Phase 6: Advanced Features
27. Add Razorpay payment integration
28. Build reminder cron jobs
29. Build revisit reminder system
30. Build offer/promotion system
31. Build super admin panel

### Phase 7: Polish & Deploy
32. Add error handling and logging
33. Add rate limiting and security
34. Write API documentation
35. Deploy to production
36. Test with real salon

---

## IMPORTANT NOTES

- All WhatsApp messages should feel natural, not robotic
- Support Hinglish (mix of Hindi and English) as primary language
- Keep WhatsApp messages SHORT (max 3-4 lines)
- Use WhatsApp interactive buttons wherever possible (easier for customers)
- Mobile-first dashboard design (salon owners use phones mostly)
- Handle edge cases: double booking, cancellation, rescheduling
- Add proper error handling at every step
- Use proper Indian date/time format (DD/MM/YYYY, 12-hour)
- All prices in INR (₹)
- UPI as primary payment method

Now please start building Phase 1. Give me complete, production-ready code for each file. After each phase, I will test and then ask you to proceed to the next phase.
```

---

## 💡 HOW TO USE THIS PROMPT

### Step 1: Copy the entire prompt above (everything inside the ``` code block)
### Step 2: Paste it into Claude / ChatGPT / Cursor / any AI coding tool
### Step 3: Claude will start building Phase 1
### Step 4: After testing Phase 1, say "Build Phase 2" and continue
### Step 5: Repeat until all 7 phases are complete

---

## 🔧 QUICK TIPS

| Tip | Detail |
|-----|--------|
| **Use Cursor IDE** | Best AI coding tool — paste this prompt as project context |
| **Use Claude Sonnet** | Best for coding tasks, faster + cheaper than Opus |
| **Build phase by phase** | Don't try to build everything at once |
| **Test each phase** | Run and test before moving to next phase |
| **Start with 1 salon** | Your doctor/salon client — get it working first |
| **Use Gupshup** | Cheapest WhatsApp Business API for India (~₹0.50/message) |
| **MongoDB Atlas** | Free tier is enough to start |

---

## 📋 PRE-REQUISITES (Set Up Before Coding)

1. **WhatsApp Business API** — Sign up on [Gupshup](https://www.gupshup.io/) or [Wati](https://www.wati.io/)
2. **OpenAI API Key** — Get from [platform.openai.com](https://platform.openai.com/) (or use Claude API)
3. **Razorpay Account** — Sign up on [razorpay.com](https://razorpay.com/) for UPI payments
4. **MongoDB Atlas** — Free cluster on [mongodb.com](https://www.mongodb.com/atlas)
5. **Node.js 18+** — Install from [nodejs.org](https://nodejs.org/)
6. **Domain Name** — Buy a .in or .com domain for your SaaS

---

## 💰 ESTIMATED MONTHLY COSTS (Starting)

| Service | Cost |
|---------|------|
| WhatsApp API (Gupshup) | ₹500-2,000/month |
| OpenAI API | ₹1,000-3,000/month |
| MongoDB Atlas | FREE (M0 tier) |
| Hosting (Railway/Render) | FREE tier to start |
| Domain | ₹500-800/year |
| **TOTAL** | **₹2,000-5,000/month** |

Once you have 5+ salons paying ₹999-1,499/month, you're profitable! 🎉
