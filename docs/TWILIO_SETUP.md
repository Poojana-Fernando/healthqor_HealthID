# Twilio SMS Phone Verification — Setup Walkthrough

This guide walks you through configuring **Twilio** for Health ID post-registration phone OTP verification. The app sends a 6-digit SMS code to the mobile number entered at signup, after email verification succeeds.

---

## How it works in Health ID

1. User completes signup and verifies email.
2. User lands on the dashboard (`/profile`).
3. A **blocking modal** appears if `phoneVerified` is `false` and a mobile is on file.
4. Backend sends SMS via Twilio (or logs OTP to console when Twilio is not configured).
5. User enters the code → `phoneVerified` is set to `true` on the `users` collection.

---

## Step 1 — Create a Twilio account (free trial)

1. Go to [https://www.twilio.com/try-twilio](https://www.twilio.com/try-twilio).
2. Sign up with your email and verify your personal phone number.
3. You receive **trial credit** (typically ~$15 USD) — enough for demos and development.

> Trial accounts can only send SMS to **verified recipient numbers** unless you upgrade. For demos, verify your test phone in the Twilio Console.

---

## Step 2 — Get your Account SID and Auth Token

1. Open the [Twilio Console Dashboard](https://console.twilio.com/).
2. On the home page, find:
   - **Account SID** — starts with `AC...`
   - **Auth Token** — click to reveal (keep secret)
3. Copy both into your root `.env` file:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
```

---

## Step 3 — Get a Twilio phone number

1. In the Console, go to **Phone Numbers → Manage → Buy a number**  
   (or **Get a trial number** on trial accounts).
2. Choose a number that supports **SMS**.
3. For Sri Lanka (+94) recipients, Twilio can deliver SMS internationally from a US/other trial number — trial geo permissions may apply.
4. Copy the number in **E.164 format** (e.g. `+15017122661`):

```env
TWILIO_FROM_NUMBER=+15017122661
```

---

## Step 4 — Verify recipient numbers (trial only)

On a **trial account**, SMS can only be sent to numbers you verify:

1. Go to **Phone Numbers → Manage → Verified Caller IDs**  
   (or **Messaging → Try it out → Send an SMS** and follow verify prompts).
2. Add your mobile (e.g. `+94771234567`) and complete the verification call/SMS.
3. Use **that same number** when registering in Health ID so the OTP is delivered.

When you upgrade the account, you can send to any valid E.164 number.

---

## Step 5 — Configure Health ID `.env`

Add to your project root `.env` (same file as MongoDB and Brevo keys):

```env
# Phone verification (Twilio)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_FROM_NUMBER=+15017122661
PHONE_OTP_EXPIRY_MINUTES=15
PHONE_RESEND_COOLDOWN_SECONDS=60
PHONE_MAX_SENDS_PER_HOUR=3
```

Restart the backend after changing `.env`.

| Variable | Purpose |
|----------|---------|
| `TWILIO_ACCOUNT_SID` | Twilio account identifier |
| `TWILIO_AUTH_TOKEN` | Secret for API authentication |
| `TWILIO_FROM_NUMBER` | Your Twilio sender number (E.164) |
| `PHONE_OTP_EXPIRY_MINUTES` | OTP validity (default 15) |
| `PHONE_RESEND_COOLDOWN_SECONDS` | Minimum wait between resends |
| `PHONE_MAX_SENDS_PER_HOUR` | Rate limit per user |

---

## Step 6 — Development without Twilio (no SMS cost)

Leave `TWILIO_ACCOUNT_SID` **empty** in `.env`. The backend uses `NoOpSmsService` and logs:

```
DEV phone verification SMS to +94771234567: OTP=123456 (expires in 15 minutes)
```

The frontend modal shows a hint in dev mode to check the backend console.

---

## Step 7 — Test the full flow

1. Start backend: `cd backend && .\run.ps1`
2. Start frontend: `cd frontend && npm run dev`
3. Register at http://localhost:5173/signup with a **verified trial recipient** mobile in E.164 format.
4. Complete email verification.
5. On `/profile`, the phone verification modal should appear and send an SMS (or log OTP).
6. Enter the 6-digit code → dashboard unlocks.
7. Confirm: `GET /api/profile/me` returns `"phoneVerified": true`.

---

## API endpoints (authenticated)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/send-phone-otp` | Send OTP to registered mobile |
| POST | `/api/auth/resend-phone-otp` | Resend after cooldown |
| POST | `/api/auth/verify-phone` | Body: `{ "code": "123456" }` |

Requires JWT cookie (`healthid_access_token`) from login or email verification.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| SMS not received (trial) | Verify recipient number in Twilio Console |
| `Failed to send SMS` | Check SID, token, `FROM` number; ensure trial geo permissions |
| `21608` / unverified number | Add number to Verified Caller IDs (trial) |
| OTP in console only | `TWILIO_ACCOUNT_SID` empty — NoOp mode active |
| Modal keeps appearing | Complete verification; check `phoneVerified` in profile API |
| Changed mobile in profile | `phoneVerified` resets — verify again |

---

## Moving off Twilio later

The `SmsService` interface supports swapping providers:

- Implement `BrevoSmsService` or another provider.
- Register it with `@ConditionalOnExpression` like `TwilioSmsService`.
- No frontend changes required.

---

## Cost notes (trial → production)

- **Trial:** Limited to verified numbers; prefixed SMS may say "Sent from your Twilio trial account".
- **Production:** Upgrade Twilio account; pay per SMS (rates vary by country).
- Monitor usage at **Twilio Console → Monitor → Logs → Messaging**.
