Markdown
# 🏥 Rendez-Vous — Arabic Medical Booking System

**Rendez-Vous** is an interactive, account-free medical appointment booking platform built with **Next.js**, **Tailwind CSS**, and **Supabase**. Designed specifically for healthcare practices, it delivers a seamless, instant booking experience in Arabic, featuring 2-step verification, dynamic real-time slot management, and flash appointment logic.

---

## ✨ Core Features

- 📅 **Account-Free 2-Step Booking:** Patients book appointments quickly without registration hassles using phone verification codes.
- ⚡ **Flash Slots:** Highlights last-minute and urgent medical openings automatically.
- ⏱️ **Automatic 3-Hour Slot Expiry:** Unconfirmed bookings expire automatically after 3 hours to keep availability open for others.
- 🌐 **Full Arabic RTL Support:** Built from the ground up for native Arabic right-to-left layout and intuitive usability.
- 📱 **Responsive & Mobile-First:** Designed for effortless booking across smartphones, tablets, and desktop devices.
- 🛡️ **Built-in Security & RLS:** Integrated Row Level Security (RLS) and phone blacklisting to prevent spam and double-booking.

---

## 🧠 How It Works

1. **Select Date & Slot:** The patient selects an available appointment or "Flash Slot" from the live schedule.
2. **Submit Details:** The patient inputs their name and phone number without creating an account.
3. **Verification Code:** An automated verification code is generated for verification.
4. **Instant Confirmation:** 
   - ✅ **Confirmed!** The slot is reserved instantly in the database.
   - ⏳ **Pending Expiry:** Unverified slots are freed automatically after 3 hours.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | Next.js (App Router, TypeScript) |
| **Styling** | Tailwind CSS (RTL layout) |
| **Backend & DB** | Supabase (PostgreSQL, Row Level Security) |
| **Hosting** | Netlify / Vercel |

---

## 🚀 Environment Setup

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=[https://your-project.supabase.co](https://your-project.supabase.co)
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
