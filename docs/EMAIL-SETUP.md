# KHAN — Email Setup (5 minutes, one time)

Email on KHAN uses **your own Gmail account** to deliver:

1. **Support tickets** from customers → to your inbox `paqilkhansab@gmail.com`
2. **Password-reset OTP codes** → to each customer's inbox (this REQUIRES the setup below — a relay service cannot deliver to arbitrary customers)

There is no way to send real email without an email account. Google gives you a free
"App Password" for exactly this. Follow the steps once and everything works forever.

## Step-by-step

1. Go to **https://myaccount.google.com/security** (sign in as `paqilkhansab@gmail.com`)
2. Under "How you sign in to Google", enable **2-Step Verification** (if not already on)
3. Go to **https://myaccount.google.com/apppasswords**
   - App name: type `KHAN Website` → click **Create**
   - Google shows a **16-character password** like `abcd efgh ijkl mnop` — copy it
4. On your **hosting platform** (where the website runs), add these two
   **environment variables** (usually under Settings → Environment Variables):
   - `GMAIL_USER` = `paqilkhansab@gmail.com`
   - `GMAIL_APP_PASSWORD` = the 16-character code **without spaces** (e.g. `abcdefghijklmnop`)
5. **Redeploy / restart** the app so it picks up the variables.

> Also add `AUTH_SECRET` (any long random string) while you are there — see `.env.example`.

## How to verify it works

- Submit a test ticket from your own site → it must arrive in your Gmail within seconds.
- Click "Forgot password?" on the login modal → the 6-digit code must arrive in the customer inbox.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Ticket saved but `emailed: false` | Env vars missing on the host — check step 4, then restart |
| Gmail "sign-in blocked" alert | Open the alert email and confirm it was you (happens once) |
| OTP email never arrives | Check the customer's spam folder; confirm env vars are set |
| Changed Google password | App passwords keep working; if revoked, create a new one and update the env var |

## Why not other services?

- **FormSubmit relay** (built in as fallback) can only deliver support tickets to YOUR inbox
  after a one-time activation click — it can never deliver OTP codes to customers.
- **Gmail SMTP with App Password** is free, trusted (high inbox delivery), and needs no
  third-party dependency. That is why it is the primary path.
