# 🚀 Deploying Hindu Wisdom (Vercel + Render + MongoDB Atlas)

Three free services host the three parts of the app:

| Part | Host | Result |
|---|---|---|
| Frontend (React/Vite) | **Vercel** | your public site URL |
| Backend (Express API) | **Render** | the API URL |
| Database | **MongoDB Atlas** | cloud database |

Do the steps in order. You'll need free accounts on GitHub, MongoDB Atlas, Render, and Vercel.

---

## 1. Push the code to your own GitHub repo
Create a new **empty** repo at <https://github.com/new> (e.g. `hindu-marketplace`). Then, from the project folder, point the remote at it and push (Claude will help run these).

---

## 2. MongoDB Atlas (database)
1. Sign up at <https://www.mongodb.com/cloud/atlas/register>.
2. Create a **free (M0) cluster**.
3. **Database Access** → add a database user (username + password). Save them.
4. **Network Access** → Add IP → **Allow access from anywhere** (`0.0.0.0/0`).
5. **Connect → Drivers** → copy the connection string. It looks like:
   `mongodb+srv://USER:PASSWORD@cluster0.xxxx.mongodb.net/?retryWrites=true&w=majority`
6. Add the database name before the `?`:
   `mongodb+srv://USER:PASSWORD@cluster0.xxxx.mongodb.net/hindu-marketplace?retryWrites=true&w=majority`

This full string is your production `MONGODB_URI`.

---

## 3. Render (backend API)
1. Sign up at <https://render.com> with GitHub.
2. **New → Web Service** → pick your repo.
3. Settings:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance type:** Free
4. **Environment variables** — add all of these:
   | Key | Value |
   |---|---|
   | `MONGODB_URI` | your Atlas string from step 2 |
   | `JWT_SECRET` | a long random string |
   | `RAZORPAY_KEY_ID` | your Razorpay key |
   | `RAZORPAY_KEY_SECRET` | your Razorpay secret |
   | `RAZORPAY_WEBHOOK_SECRET` | (set after step 6) |
   | `CLOUDINARY_CLOUD_NAME` | `r2akhhqa` |
   | `CLOUDINARY_API_KEY` | your key |
   | `CLOUDINARY_API_SECRET` | your secret |
   | `CLIENT_URL` | (fill after step 4 — your Vercel URL) |
   | `REQUIRE_EMAIL_VERIFICATION` | `false` |
5. Deploy. Note the URL, e.g. `https://hindu-marketplace-api.onrender.com`.
   - Test it: opening that URL should return `{"message":"Hindu Marketplace API is running!"}`.

> ⚠️ Render's free tier **sleeps after 15 min idle**; the first request then takes ~30–60s to wake. Fine for launch; upgrade later for always-on.

---

## 4. Vercel (frontend)
1. Sign up at <https://vercel.com> with GitHub.
2. **Add New → Project** → import your repo.
3. Settings:
   - **Root Directory:** `frontend`
   - Framework: **Vite** (auto-detected)
4. **Environment Variable:**
   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://YOUR-RENDER-URL.onrender.com/api` |
5. Deploy. You'll get your live link, e.g. `https://hindu-marketplace.vercel.app`.

---

## 5. Connect the two
1. In **Render** → set `CLIENT_URL` = your Vercel URL (e.g. `https://hindu-marketplace.vercel.app`) → save (redeploys).
2. Redeploy Vercel if you changed anything.

---

## 6. Razorpay webhook (production)
1. Razorpay Dashboard → **Settings → Webhooks → Add**.
2. URL: `https://YOUR-RENDER-URL.onrender.com/api/orders/webhook`
3. Secret: choose one, and set it as `RAZORPAY_WEBHOOK_SECRET` in Render.
4. Active events: `payment.captured`, `order.paid`.

---

## 7. Seed your admin on the live database
Locally, point at Atlas once to create your admin (or use Render's shell):
```bash
cd backend
# temporarily set MONGODB_URI to the Atlas string, then:
node scripts/createAdmin.js you@email.com "Your Name" yourStrongPassword
```
Then log in on your live Vercel site and upload real books from the admin panel.

---

## Going fully live with payments
When ready for real money: switch Razorpay to **Live mode**, generate Live API keys, and replace `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` in Render (and re-create the webhook with the live secret).
