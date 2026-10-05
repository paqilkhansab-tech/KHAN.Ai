# KHAN — Email Setup (5 minutes, one time)

Email on KHAN uses **your own Gmail account** to deliver:

1. **Support tickets** from customers → to your inbox `paqilkhansab@gmail.com`
2. **Password-reset OTP codes** → to each customer's inbox (this REQUIRES the setup below — a relay service cannot deliver to arbitrary customers)

There is no way to send real email without an email account. Google gives you a free
"App Password" for exactly this. Follow the steps once and everything works forever.

## Works without setup (owner bridge)

Even with NO env vars set, the site self-heals partially:

- **Support tickets** are relayed to your Gmail through the built-in FormSubmit
  bridge. The very first ticket triggers a one-time **"Activate FormSubmit"
  email to your inbox — click Activate once** and deliveries start.
- **Resetting YOUR OWN password** (`paqilkhansab@gmail.com`) rides the same
  bridge: request a code → click the Activate email once (first time only) →
  request again → the code arrives in your Gmail.
- Resetting **any other customer's** password always needs the Gmail App
  Password setup below — no relay can deliver into someone else's inbox.

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
| "One-time activation needed" message | FormSubmit is waiting — open `paqilkhansab@gmail.com`, click the **Activate FormSubmit** link, then request the code again |
| Changed Google password | App passwords keep working; if revoked, create a new one and update the env var |

## Preview / sandbox test mode

On the development preview, outbound email is blocked by the sandbox. When the
env var `OTP_DEV_ECHO=true` is set **and** the app runs in development mode,
the forgot-password flow shows the 6-digit code directly on the reset card so
the flow stays testable. **Never set `OTP_DEV_ECHO` on the live hosting** —
production builds ignore it anyway (double safety gate).

## Why not other services?

- **FormSubmit relay** (built in as fallback) delivers support tickets — and
  owner-only password resets — to YOUR inbox after a one-time activation click.
  It can never deliver OTP codes to customers, so customer resets need SMTP.
- **Gmail SMTP with App Password** is free, trusted (high inbox delivery), and needs no
  third-party dependency. That is why it is the primary path.
