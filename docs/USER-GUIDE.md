# SalonBot User Guide

**Your AI-Powered WhatsApp Booking Assistant**

Welcome to SalonBot! This platform gives your salon a smart WhatsApp chatbot that handles appointments, payments, and customer communication — so you can focus on what you do best.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Dashboard Overview](#2-dashboard-overview)
3. [Managing Services](#3-managing-services)
4. [Managing Staff](#4-managing-staff)
5. [Appointments](#5-appointments)
6. [Customers](#6-customers)
7. [WhatsApp Chatbot](#7-whatsapp-chatbot)
8. [Online Payments (Razorpay)](#8-online-payments-razorpay)
9. [Analytics](#9-analytics)
10. [Settings](#10-settings)
11. [How Your Customers Use It](#11-how-your-customers-use-it)
12. [FAQ](#12-faq)

---

## 1. Getting Started

### Step 1: Create Your Account

1. Open the SalonBot dashboard in your browser
2. Click **Register**
3. Fill in your salon name, email, phone number, and a password
4. You'll receive an OTP on your phone — enter it to verify your number
5. You're in!

### Step 2: Set Up Your Salon

After logging in, head to **Settings** and complete these tabs:

| Tab | What to Configure |
|-----|-------------------|
| **Profile** | Salon name, address, description |
| **Working Hours** | Which days you're open + opening/closing times |
| **Slot Settings** | Appointment slot duration (15/30/45/60 min) and buffer time between appointments |

### Step 3: Add Your Services

Go to **Services** and add everything you offer:
- Name (e.g., "Men's Haircut")
- Category (Hair, Skin, Nails, Makeup, Spa, Beard, Bridal, Other)
- Duration in minutes
- Price in rupees
- Gender (unisex, male, female)

### Step 4: Add Your Staff

Go to **Staff** and add each team member:
- Name and phone number
- Which services they can perform (select from your services list)
- Their working schedule (which days and hours they're available)

> **Important:** The chatbot can only show available slots if you have staff members assigned to services. No staff = no bookable slots.

### Step 5: Connect WhatsApp (Optional)

Go to **Settings > WhatsApp** to connect your WhatsApp Business account. This requires a Meta Business account with WhatsApp Business API access. Contact support if you need help setting this up.

### Step 6: Enable Payments (Optional)

Go to **Settings > Payments** to connect your Razorpay account. You'll need:
- Razorpay Key ID (starts with `rzp_live_...`)
- Razorpay Key Secret
- Razorpay Webhook Secret (from Razorpay Dashboard > Settings > Webhooks)

Choose your payment mode:
- **Optional** — Customers can pay online or at the salon
- **Required** — Customers must pay online to confirm their booking

---

## 2. Dashboard Overview

Your dashboard home page shows at a glance:

- **Today's Appointments** — How many appointments you have today
- **Today's Revenue** — Total revenue earned today
- **Active Staff** — Number of active team members
- **Upcoming Appointments** — Quick list of what's coming up

This is your daily command centre. Check it every morning to see what's ahead.

---

## 3. Managing Services

### Adding a Service

1. Go to **Services** from the sidebar
2. Click **Add Service**
3. Fill in the details:
   - **Name**: What customers will see (e.g., "Bridal Makeup")
   - **Category**: Helps organize your menu (Hair, Skin, Nails, etc.)
   - **Duration**: How long it takes (in minutes)
   - **Price**: Cost in rupees
   - **Gender**: Who it's for — unisex, male only, or female only
4. Click **Save**

### Editing or Removing a Service

- Click on any service to edit its details
- Use the delete button to remove services you no longer offer
- Deactivated services won't appear in the chatbot or booking flow

### Tips

- Be specific with names — "Men's Haircut" is better than "Haircut"
- Set accurate durations — this directly affects slot availability
- Group services by category so customers can browse easily

---

## 4. Managing Staff

### Adding a Staff Member

1. Go to **Staff** from the sidebar
2. Click **Add Staff**
3. Enter their name, phone, and role
4. **Assign services** — check which services they can perform
5. **Set their schedule** — for each day, toggle availability and set start/end times
6. Click **Save**

### How Staff Affects Bookings

The slot availability system works like this:
- When a customer asks "What times are free for a haircut on Tuesday?" the system checks **which staff members can do haircuts** and **when they're available on Tuesday**
- It then checks existing appointments to avoid conflicts
- Only free slots are shown to the customer

So keeping staff schedules accurate is critical for smooth bookings.

---

## 5. Appointments

### Viewing Appointments

Go to **Appointments** to see all bookings. You can filter by:
- Date range
- Status (pending, confirmed, completed, cancelled, no-show)

### Creating an Appointment (Walk-in)

1. Click **New Appointment**
2. Select the customer (or enter their phone to create a new one)
3. Choose the service, staff member, date, and time slot
4. Click **Create**

### Managing Appointment Status

Each appointment goes through these stages:

```
Pending → Confirmed → In-Progress → Completed
                  ↘ Cancelled
                  ↘ No-Show (auto-marked)
```

- **Pending**: Just booked, awaiting confirmation
- **Confirmed**: Ready to go
- **In-Progress**: Customer is being served
- **Completed**: Done! Revenue is counted
- **Cancelled**: Customer or salon cancelled
- **No-Show**: Customer didn't show up (auto-marked after a configurable buffer time)

Click on any appointment to update its status.

### Today's View

The **Today** quick-view shows just today's appointments — perfect for your front desk.

---

## 6. Customers

### Customer List

Go to **Customers** to see everyone who has booked with you. You can search by name or phone number.

### How Customers Are Created

Customers are **automatically created** when:
- Someone messages your WhatsApp chatbot for the first time
- You create an appointment for a new phone number from the dashboard

You don't need to manually add customers — the system handles it.

### Customer Details

Click on any customer to see:
- Their contact information
- Total visits and last visit date
- Complete appointment history
- Any notes you've added

### Due for Revisit

The system can flag customers who haven't visited recently — great for sending follow-up messages.

---

## 7. WhatsApp Chatbot

This is the heart of SalonBot. Once connected, your customers can message your WhatsApp Business number and an AI chatbot handles the conversation.

### What the Chatbot Can Do

| Capability | Example |
|-----------|---------|
| **Show services** | "What services do you offer?" |
| **Check availability** | "Any slots free for haircut tomorrow?" |
| **Book appointments** | "Book me for 3pm" |
| **Cancel bookings** | "Cancel my appointment" |
| **Show upcoming appointments** | "What appointments do I have?" |
| **Share salon info** | "What's your address?" / "What are your hours?" |
| **Show offers** | "Any discounts?" |
| **Hand off to human** | "I want to talk to someone" |

### How a Typical Booking Conversation Looks

```
Customer: Hi
Bot:      Hello! Welcome to Glamour Salon! How can I help you today?

Customer: I want a haircut
Bot:      Sure! Here are our haircut services:
          1. Men's Haircut - ₹300 (30 min)
          2. Women's Haircut - ₹500 (45 min)
          Which one would you like?

Customer: Men's haircut
Bot:      Great choice! When would you like to come?

Customer: Tomorrow
Bot:      Here are available slots for tomorrow:
          • 10:00 AM - Rahul
          • 10:30 AM - Rahul
          • 11:00 AM - Vikram
          • 2:00 PM - Rahul
          Which time works for you?

Customer: 10:30
Bot:      Perfect! Here's your booking summary:
          Service: Men's Haircut
          Date: 25/02/2026
          Time: 10:30 AM
          Staff: Rahul
          Price: ₹300
          Shall I confirm this booking?

Customer: Yes
Bot:      Done! Your appointment is booked.
          [Payment link if payments are enabled]
```

### Language

The chatbot speaks in friendly **Hinglish** (Hindi + English mix) — natural and comfortable for Indian customers. It keeps messages short (3-4 lines max) so they're easy to read on mobile.

### Human Handoff

If a customer asks something the bot can't handle, or specifically asks to talk to a person, the bot hands off the conversation. You'll see this flagged in the system.

---

## 8. Online Payments (Razorpay)

### Setup

1. Create a [Razorpay](https://razorpay.com) account if you don't have one
2. Get your API keys from Razorpay Dashboard > Settings > API Keys
3. Get your Webhook Secret from Razorpay Dashboard > Settings > Webhooks
4. Enter all three in **Settings > Payments**
5. Toggle **Enable Online Payments** on
6. Choose your payment mode (Optional or Required)

### How It Works

**WhatsApp flow:**
- After booking, the chatbot sends a payment link directly in the chat
- Customer taps the link, pays via UPI/card/netbanking
- Payment status updates automatically

**Dashboard flow:**
- When creating appointments from the dashboard, you can trigger a Razorpay checkout
- Payment is verified and linked to the appointment

### Payment Statuses

| Status | Meaning |
|--------|---------|
| Pending | Payment link sent, waiting for customer |
| Paid | Customer has paid successfully |
| Failed | Payment attempt failed |
| Refunded | Full refund issued |

### Refunds

Go to the payment record and click **Refund** to process a refund through Razorpay. The refund is processed to the original payment method.

### Per-Salon Webhook Secret

If you're using your own Razorpay account (not the platform's shared account), make sure to enter your **Razorpay Webhook Secret** in Settings > Payments. This ensures payment notifications from Razorpay are verified correctly for your salon.

---

## 9. Analytics

Go to **Analytics** to understand your business performance:

### Revenue Analytics
- Daily, weekly, and monthly revenue trends
- Total revenue over selected period
- Revenue breakdown by payment method

### Booking Analytics
- Booking volume trends
- Booking sources (WhatsApp vs Dashboard vs Walk-in)
- Cancellation and no-show rates

### Service Analytics
- Which services are most popular
- Revenue per service
- Average bookings per service

### Staff Analytics
- Appointments per staff member
- Revenue generated per staff
- Staff utilization rates

### Customer Analytics
- New customer acquisition over time
- Returning vs new customer ratio

---

## 10. Settings

### Profile
Update your salon's basic info: name, description, address, GST number.

### Working Hours
Set which days you're open and your opening/closing times. Toggle any day off (e.g., Sunday).

### Slot Settings
- **Slot Duration**: How long each bookable time slot is (15, 30, 45, or 60 minutes). If you mostly do 30-minute services, set this to 30.
- **Buffer Time**: Minutes between appointments (0-60). Set to 10-15 minutes if your staff needs cleanup time between clients.

### Payments
Configure your Razorpay integration:
- **Razorpay Key ID**: Your public API key
- **Razorpay Key Secret**: Your private API key (stored encrypted)
- **Razorpay Webhook Secret**: For verifying payment notifications (stored encrypted)
- **Payment Mode**: Optional (pay at salon or online) or Required (must pay online)

### Reminders
Configure WhatsApp appointment reminders:
- **Enable/Disable** reminders
- **Schedule**: Add multiple reminder times (e.g., "1 day before" = 1440 minutes, "2 hours before" = 120 minutes)
- **No-Show Buffer**: How many minutes after the appointment end time before auto-marking as no-show (default: 30 minutes)

### WhatsApp
View your WhatsApp Business connection status. Shows whether you're connected, your Phone Number ID, and when you connected.

---

## 11. How Your Customers Use It

Your customers don't need to download any app or create any account. They simply message your WhatsApp Business number — just like texting a friend.

### For the Customer, It's Simple

1. **Save your salon's WhatsApp number** (or scan a QR code)
2. **Send "Hi"** to start a conversation
3. **Chat naturally** — ask about services, check times, book appointments
4. **Get reminders** — automatic WhatsApp messages before their appointment
5. **Pay online** (if enabled) — tap the payment link in the chat

### What Makes It Great for Customers

- **No app to download** — works in WhatsApp they already use
- **Available 24/7** — customers can book at midnight if they want
- **Instant responses** — no waiting on hold or for a callback
- **Easy cancellation** — just tell the bot to cancel
- **Payment links** — pay with UPI, card, or netbanking right from the chat
- **Reminders** — never forget an appointment

---

## 12. FAQ

### Do I need a WhatsApp Business API account?
Yes. You need a Meta Business account with access to the WhatsApp Business API (Cloud API). This is different from the regular WhatsApp Business app. Contact our support team for help setting this up.

### Can I have multiple staff members?
Yes! Add as many staff members as you need. Each can have their own schedule and service assignments. The chatbot automatically shows slots based on staff availability.

### What happens if a customer doesn't show up?
The system automatically marks appointments as "no-show" after a configurable buffer time (default: 30 minutes past the appointment end). You can adjust this in Settings > Reminders.

### Can I use my own Razorpay account?
Absolutely. Enter your Razorpay Key ID, Key Secret, and Webhook Secret in Settings > Payments. Your payment data stays in your Razorpay dashboard.

### Is my data secure?
Yes. All sensitive data (WhatsApp tokens, Razorpay keys) is encrypted using AES-256-GCM before storage. Passwords are hashed with bcrypt. All API communication uses HTTPS.

### Can customers book from the website too?
Currently, bookings happen through WhatsApp or the dashboard (which you or your front desk uses). A customer-facing web booking page is on the roadmap.

### What languages does the chatbot support?
The chatbot responds in Hinglish (Hindi + English mix), which is natural for Indian customers. It understands messages in both Hindi and English.

### How do reminders work?
The system checks every 5 minutes for upcoming appointments that match your reminder schedule. For example, if you set a "1 day before" reminder, customers get a WhatsApp message 24 hours before their appointment with all the details.

### Can I see conversation history?
The system logs all WhatsApp conversations. Each conversation session lasts 30 minutes of inactivity before expiring.

### What if the chatbot can't handle a request?
Customers can say "I want to talk to someone" and the chatbot will flag the conversation for human handoff. You'll see this in the system and can follow up manually.

---

**Need help?** Contact our support team for assistance with setup, WhatsApp configuration, or any questions about using SalonBot.
