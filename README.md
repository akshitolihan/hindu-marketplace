# 🕉️ Hindu Wisdom — Ebook Marketplace

A lightweight platform to sell Hindu scripture ebooks (PDFs). Users sign up, buy
books with Razorpay, and read/download them from a personal library. Admins
upload books and manage pricing, sales, orders, and users from a dashboard.

**Stack:** React 19 + Vite + Tailwind v4 (frontend) · Node/Express + MongoDB
(backend) · Razorpay (payments) · Cloudinary (private PDF storage) · Nodemailer.

---

## How it stays secure

- **PDFs are private.** Book files live in Cloudinary as `authenticated`
  resources. They are *never* returned in any public API response. A buyer gets
  a **short‑lived (5 min) signed URL**, minted only after an ownership check.
- **Payments are verified server‑side.** Razorpay signatures are checked with
  HMAC before access is granted, plus a **webhook** as the source of truth.
- **Prices are server‑trusted.** The amount charged is computed from the
  product's `effectivePrice` (sale‑aware) — the client cannot set it.
- Admin access is a database **role**, not a hardcoded email. Auth routes are
  rate‑limited and validated; `helmet` and a CORS allowlist are enabled.

---

## Prerequisites

- **Node.js 18+** and npm (not currently installed on this machine — install
  from <https://nodejs.org>).
- A **MongoDB Atlas** cluster (free tier is fine).
- A **Razorpay** account (test keys to start).
- A **Cloudinary** account.
- (Optional) A Gmail account with an **App Password** for email.

---

## Setup

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env      # then fill in the values
npm run dev               # starts on http://localhost:5000
```

Fill `backend/.env` (see `.env.example` for the full list):

| Variable | What it is |
|---|---|
| `MONGODB_URI` | Atlas connection string |
| `JWT_SECRET` | long random string (`openssl rand -hex 32`) |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | from Razorpay dashboard |
| `RAZORPAY_WEBHOOK_SECRET` | from Razorpay → Settings → Webhooks |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | from Cloudinary |
| `CLIENT_URL` | frontend origin, e.g. `http://localhost:5173` |
| `EMAIL_USER` / `EMAIL_PASS` | optional Gmail + app password |
| `REQUIRE_EMAIL_VERIFICATION` | `true` to force email verification before login |

### 2. Create the first admin

```bash
cd backend
npm run seed:admin admin@example.com "Admin Name" yourStrongPassword
```

Promotes the user if they already exist, otherwise creates a verified admin.
Log in with those credentials and you'll land on `/admin`.

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env      # VITE_API_URL=http://localhost:5000/api
npm run dev               # starts on http://localhost:5173
```

### 4. Razorpay webhook (recommended)

In the Razorpay dashboard add a webhook pointing to
`https://YOUR_BACKEND/api/orders/webhook`, subscribe to `payment.captured` /
`order.paid`, and set the secret to match `RAZORPAY_WEBHOOK_SECRET`. For local
testing, expose the backend with a tunnel (e.g. `ngrok http 5000`).

---

## Project structure

```
backend/
  config/        cloudinary + env validation
  middleware/    auth, adminAuth, rate limiting, uploads, validation
  models/        User, Product, Cart, Order
  routes/        auth, products, cart, orders (+webhook), library, admin
  utils/         email, signed-URL storage, order fulfillment
  scripts/       createAdmin.js
frontend/
  src/api/       axios client
  src/context/   Auth + Cart providers
  src/components/ Navbar, Footer, BookCard, ProtectedRoute
  src/pages/     Home, Books, BookDetail, Cart, MyLibrary, Login, Signup,
                 VerifyEmail, Admin
```

## Key API routes

| Method | Route | Access |
|---|---|---|
| POST | `/api/auth/signup` · `/login` · `/verify-email` | public |
| GET | `/api/products` · `/api/products/:id` | public (no file URLs) |
| GET/POST/DELETE | `/api/cart…` | user |
| POST | `/api/orders/create-order` · `/verify-payment` | user |
| POST | `/api/orders/webhook` | Razorpay (signed) |
| GET | `/api/library` · `/api/library/:id/download` | owner only |
| * | `/api/admin/…` | admin only |

---

## Notes / possible next steps

- Forgot/reset password flow (model fields already exist).
- Coupon codes (current sales are per‑book price + end date).
- An in‑browser PDF reader (currently opens the signed URL in a new tab).
