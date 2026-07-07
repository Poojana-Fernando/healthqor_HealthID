# Deployment Guide — Render + Frontend (Vercel or Netlify)

Public demo stack for Healthqor Health ID:

| Layer | Platform | Cost |
|-------|----------|------|
| Frontend (React/Vite) | **Vercel** or **Netlify** | Free |
| Backend (Spring Boot JAR) | **Render** | Free Web Service |
| Database | **MongoDB Atlas** M0 | Free |
| Email | **Brevo** | Free tier |
| SMS (optional) | **Twilio** | Trial |
| AI | **OpenAI** | Pay-as-you-go |

Choose **one** frontend host (Vercel or Netlify). Both proxy `/api/*` to Render so JWT cookies and CSRF work on a single origin.

---

## Architecture

The app uses **JWT in HttpOnly cookies** and **CSRF** (`XSRF-TOKEN` cookie read by JavaScript). Those only work when the browser talks to **one public origin**.

**Vercel:**

```
Browser  →  https://your-app.vercel.app
              ├── /              → React static files
              ├── /api/*         → Vercel rewrite → Render backend
              └── /actuator/*    → Vercel rewrite → Render (CSRF bootstrap)
```

**Netlify:**

```
Browser  →  https://your-app.netlify.app
              ├── /              → React static files
              ├── /api/*         → Netlify proxy (_redirects) → Render backend
              └── /actuator/*    → Netlify proxy → Render
```

**Do not** set `VITE_API_URL` to the Render URL in production. That splits origins and breaks CSRF.

---

## Prerequisites

- GitHub repo pushed and accessible to your frontend host + Render
- [MongoDB Atlas](https://www.mongodb.com/atlas) cluster
- [Brevo](https://app.brevo.com) account (for real signup emails)
- [Google Cloud](https://console.cloud.google.com/) OAuth client (optional)
- [OpenAI](https://platform.openai.com/) API key (for AI features)

Generate secrets locally (save them — you will paste into Render):

```bash
openssl rand -hex 32    # HEALTHID_ENCRYPTION_KEY
openssl rand -base64 48 # JWT_SECRET
```

---

## Phase 1 — MongoDB Atlas

1. Create a **free M0** cluster.
2. **Database Access** → create user with read/write on `healthid`.
3. **Network Access** → **Allow Access from Anywhere** (`0.0.0.0/0`) — required for Render free tier (no fixed IP).
4. Copy connection string:

```
mongodb+srv://USER:PASS@cluster.mongodb.net/healthid?retryWrites=true&w=majority
```

---

## Phase 2 — Backend on Render

### Option A — Blueprint (recommended)

1. [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**.
2. Connect this GitHub repo — Render reads [`render.yaml`](../render.yaml) at repo root.
3. When prompted, fill **secret** env vars (MongoDB URI, OpenAI, Google, admin password, `FRONTEND_ORIGIN` — use a placeholder for now, e.g. `https://your-app.netlify.app` or `https://your-app.vercel.app`).
4. Deploy and wait for **Live** status.
5. Copy your service URL, e.g. `https://healthid-api.onrender.com`.
6. Test: `https://healthid-api.onrender.com/actuator/health` → `{"status":"UP"}`.

> **Cold starts:** Free Render services sleep after ~15 minutes idle. First request may take 30–60 seconds. Use [UptimeRobot](https://uptimerobot.com) to ping `/actuator/health` every 10 minutes during demos.

### Option B — Manual Web Service

| Setting | Value |
|---------|--------|
| **Runtime** | **Docker** |
| **Dockerfile Path** | `backend/Dockerfile` |
| **Docker Build Context** | `backend` |
| **Health Check Path** | `/actuator/health` |

> Render has no native Java runtime. The [`backend/Dockerfile`](../backend/Dockerfile) builds the JAR with Maven (Java 21) and runs it in a JRE image.

### Backend environment variables (Render)

| Variable | Required | Example / notes |
|----------|----------|-----------------|
| `SPRING_PROFILES_ACTIVE` | Yes | `prod` |
| `MONGODB_URI` | Yes | Atlas connection string |
| `MONGODB_DATABASE` | No | `healthid` |
| `HEALTHID_ENCRYPTION_KEY` | Yes | 64-char hex |
| `JWT_SECRET` | Yes | Long random string |
| `FRONTEND_ORIGIN` | Yes | Your frontend URL (exact, no trailing `/`) — Vercel or Netlify |
| `OPENAI_API_KEY` | Yes* | `sk-...` (*AI falls back without it) |
| `GOOGLE_CLIENT_ID` | For OAuth | |
| `GOOGLE_CLIENT_SECRET` | For OAuth | |
| `ADMIN_EMAIL` | Yes | First admin bootstrap |
| `ADMIN_PASSWORD` | Yes | Strong password |
| `ADMIN_NAME` | No | `System Admin` |
| `BREVO_API_KEY` | Strongly recommended | Without it, emails only log to console |
| `BREVO_SENDER_EMAIL` | With Brevo | Verified sender in Brevo |
| `BREVO_SENDER_NAME` | No | `HealthID` |
| `PHONE_SMS_PROVIDER` | For SMS OTP | `twilio` (or `noop` to disable) |
| `TWILIO_ACCOUNT_SID` | With Twilio | From [Twilio Console](https://console.twilio.com/) |
| `TWILIO_AUTH_TOKEN` | With Twilio | Keep secret |
| `TWILIO_FROM_NUMBER` | With Twilio | E.164 format, e.g. `+15017122661` |
| `PHONE_OTP_EXPIRY_MINUTES` | No | `15` (default in blueprint) |
| `PHONE_RESEND_COOLDOWN_SECONDS` | No | `60` |
| `PHONE_MAX_SENDS_PER_HOUR` | No | `3` |
| `CACHE_TYPE` | No | `simple` (set automatically in `prod` profile) |

`prod` profile also enables `cookie.secure=true` and `cookie.samesite=Strict` (see `application-prod.properties`).

---

## Phase 3 — Frontend hosting

Pick **Vercel** or **Netlify** (not both for the same deployment).

### Option A — Vercel

#### 3A.1 Import project

1. [Vercel](https://vercel.com) → **Add New Project** → import GitHub repo.
2. Settings:

| Setting | Value |
|---------|--------|
| **Framework Preset** | Vite |
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build:vercel` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |

#### 3A.2 Vercel environment variables

Add for **Production** (and Preview if desired):

| Variable | Value |
|----------|--------|
| `VERCEL_BACKEND_URL` | `https://healthid-api.onrender.com` (your Render URL, **no trailing slash**) |
| `VITE_API_URL` | *(leave empty)* |
| `VITE_GOOGLE_CLIENT_ID` | Same as `GOOGLE_CLIENT_ID` on Render |

`npm run build:vercel` runs [`scripts/ensure-vercel-config.mjs`](../frontend/scripts/ensure-vercel-config.mjs), which writes `frontend/vercel.json` rewrites from `VERCEL_BACKEND_URL`.

#### 3A.3 Git LFS (3D / video assets)

If home page 3D or video assets are missing after deploy:

1. Vercel project → **Settings** → enable **Git LFS**, **or**
2. Change **Build Command** to: `git lfs pull && npm run build:vercel`

#### 3A.4 Deploy

1. Deploy on Vercel → note URL, e.g. `https://healthid-xxxx.vercel.app`.
2. **Update Render** `FRONTEND_ORIGIN` to that exact URL → **Manual Deploy** on Render.
3. Redeploy Vercel if you changed `VERCEL_BACKEND_URL`.

---

### Option B — Netlify

#### 3B.1 Import project

1. [Netlify](https://app.netlify.com) → **Add new site** → **Import from Git** → select repo.
2. Settings (Netlify reads [`frontend/netlify.toml`](../frontend/netlify.toml) when base directory is `frontend`):

| Setting | Value |
|---------|--------|
| **Base directory** | `frontend` |
| **Build command** | `npm run build:netlify` |
| **Publish directory** | `dist` |

#### 3B.2 Netlify environment variables

Add for **Production** (and Deploy Previews if desired):

| Variable | Value |
|----------|--------|
| `NETLIFY_BACKEND_URL` | `https://healthid-api.onrender.com` (your Render URL, **no trailing slash**) |
| `VITE_API_URL` | *(leave empty)* |
| `VITE_GOOGLE_CLIENT_ID` | Same as `GOOGLE_CLIENT_ID` on Render |

`npm run build:netlify` runs [`scripts/ensure-netlify-config.mjs`](../frontend/scripts/ensure-netlify-config.mjs), which writes `frontend/public/_redirects` before Vite build. Vite copies it to `dist/_redirects` for Netlify proxy rules.

> **Proxy timeout:** Netlify’s edge proxy has a **~26 second** request timeout on the free tier. Slow AI routes (`/api/ai/*`, `/api/healthcare/facilities/search`) may occasionally return **504** if OpenAI or Overpass is slow. Vercel Hobby allows ~60s. Keep Render warm (UptimeRobot) and retry on timeout.

#### 3B.3 Git LFS (3D / video assets)

If home page video or assets are missing after deploy:

1. Netlify site → **Site configuration** → **Build & deploy** → enable **Git LFS**, **or**
2. Change **Build command** to: `git lfs pull && npm run build:netlify`

#### 3B.4 Deploy

1. Deploy on Netlify → note URL, e.g. `https://healthid-xxxx.netlify.app`.
2. **Update Render** `FRONTEND_ORIGIN` to that exact URL → **Manual Deploy** on Render.
3. Redeploy Netlify if you changed `NETLIFY_BACKEND_URL`.

#### 3B.5 Verify redirects in build log

After deploy, confirm `dist/_redirects` contains your Render URL (not the placeholder). If POST requests return 403, `VITE_API_URL` is likely set incorrectly or `_redirects` was not generated.

---

## Phase 4 — Third-party services

### Brevo (email)

1. [app.brevo.com](https://app.brevo.com) → verify sender email/domain.
2. Create API v3 key → `BREVO_API_KEY` on Render.
3. Test: register a real email on the live site → receive verification OTP.

### Google OAuth

[Google Cloud Console](https://console.cloud.google.com/) → OAuth 2.0 **Web application**:

| Field | Value |
|-------|--------|
| **Authorized JavaScript origins** | `https://your-app.vercel.app` or `https://your-app.netlify.app` |
| **Authorized redirect URIs** | `https://your-app.vercel.app/auth/google/callback` or `https://your-app.netlify.app/auth/google/callback` |

Set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` on Render and `VITE_GOOGLE_CLIENT_ID` on Vercel or Netlify (rebuild after change).

### OpenAI

`OPENAI_API_KEY` on Render only. AI routes may take 10–30s; Vercel proxy timeout is usually ~60s on Hobby; Netlify ~26s (see above).

### Twilio (optional)

See [TWILIO_SETUP.md](TWILIO_SETUP.md). For demo without SMS: `PHONE_SMS_PROVIDER=noop` on Render.

### OpenStreetMap Overpass

No setup — used by **Find Care** (`HealthcareFacilityService`).

---

## Phase 5 — Post-deploy checklist

Replace “frontend URL” with your Vercel or Netlify domain.

| # | Test | Pass? |
|---|------|-------|
| 1 | Open frontend URL — home page loads | |
| 2 | DevTools → Cookies on frontend domain — `XSRF-TOKEN` appears after load | |
| 3 | Register → Brevo email received → verify → login | |
| 4 | `/profile` loads when logged in | |
| 5 | `/find-care` loads when logged in (map + facility search) | |
| 6 | Google login (if configured) | |
| 7 | Admin login (`ADMIN_EMAIL`) → `/admin` | |
| 8 | e-Channeling doctor search (seed doctors via Admin first) | |
| 9 | AI symptom check / chat (authenticated) | |
| 10 | Logout clears session | |

### Common failures

| Symptom | Fix |
|---------|-----|
| 403 on all POST requests | `VITE_API_URL` must be **empty**; check `vercel.json` (Vercel) or `dist/_redirects` (Netlify) |
| CORS error | `FRONTEND_ORIGIN` on Render must match frontend URL exactly; remove `VITE_API_URL` if set to Render |
| 502 on `/api/*` | Render cold start or wrong backend URL env var |
| 504 on AI routes (Netlify) | Netlify ~26s proxy timeout — retry; keep Render warm |
| Login then immediate logout | HTTPS + `cookie.secure=true` in prod (already configured) |
| MongoDB connection failed | Atlas IP allowlist + correct `MONGODB_URI` |
| Google OAuth `redirect_uri_mismatch` | Add exact callback URL in Google Console |
| `/profile` 404 on refresh (Netlify) | Ensure `/* /index.html 200` is last line in `_redirects` |

---

## Phase 6 — Demo data

After first deploy:

1. Log in as admin (`ADMIN_EMAIL` / `ADMIN_PASSWORD`).
2. **Admin → Doctors** → add 2–3 doctors with location (lat/lng) for e-Channeling / nearby search.
3. Optionally create a test citizen account for booking flow.

---

## Phase 7 — Custom domain (optional)

1. **Vercel** or **Netlify** → add domain `healthid.yourdomain.com`.
2. Update **Render** `FRONTEND_ORIGIN=https://healthid.yourdomain.com`.
3. Update **Google OAuth** origins + redirect URI.
4. Redeploy Render (and frontend if env changed).

Backend URL env var (`VERCEL_BACKEND_URL` or `NETLIFY_BACKEND_URL`) stays pointed at Render — only the public frontend URL changes.

---

## Deploy order (Netlify example)

1. MongoDB Atlas — cluster + connection string
2. Render — Blueprint deploy + secrets; note `https://<service>.onrender.com`
3. Netlify — import repo, set `NETLIFY_BACKEND_URL`, deploy; note `https://<site>.netlify.app`
4. Render — set `FRONTEND_ORIGIN` to Netlify URL; manual redeploy
5. Google OAuth — update origins + callback to Netlify URL
6. Run Phase 5 checklist

---

## Local production smoke test

```bash
# Terminal 1 — backend
cd backend
mvn clean package -DskipTests
set SPRING_PROFILES_ACTIVE=prod
set MONGODB_URI=...
set HEALTHID_ENCRYPTION_KEY=...
set JWT_SECRET=...
set FRONTEND_ORIGIN=http://localhost:4173
java -jar target/healthid-backend-1.0.0.jar

# Terminal 2 — frontend (uses Vite preview proxy to :8080)
cd frontend
npm run build
npm run preview
```

---

## Files reference

| File | Purpose |
|------|---------|
| [`render.yaml`](../render.yaml) | Render Blueprint for backend |
| [`frontend/vercel.json`](../frontend/vercel.json) | Vercel API proxy rewrites (auto-updated by build script) |
| [`frontend/scripts/ensure-vercel-config.mjs`](../frontend/scripts/ensure-vercel-config.mjs) | Writes `vercel.json` from `VERCEL_BACKEND_URL` |
| [`frontend/vercel.json.example`](../frontend/vercel.json.example) | Vercel template if configuring manually |
| [`frontend/netlify.toml`](../frontend/netlify.toml) | Netlify build settings |
| [`frontend/scripts/ensure-netlify-config.mjs`](../frontend/scripts/ensure-netlify-config.mjs) | Writes `public/_redirects` from `NETLIFY_BACKEND_URL` |
| [`frontend/_redirects.example`](../frontend/_redirects.example) | Netlify redirects template if configuring manually |
| [`application-prod.properties`](../backend/src/main/resources/application-prod.properties) | Prod: no Swagger, secure cookies, no Redis |
| [`postman/HealthID-API.postman_collection.json`](../postman/HealthID-API.postman_collection.json) | API testing — set `baseUrl` to frontend URL for proxied tests |

---

## Team split

| Role | Tasks |
|------|--------|
| **Backend** | Render deploy, all Render env vars, Atlas |
| **Frontend (Vercel)** | Vercel project, `VERCEL_BACKEND_URL`, `VITE_GOOGLE_CLIENT_ID` |
| **Frontend (Netlify)** | Netlify site, `NETLIFY_BACKEND_URL`, `VITE_GOOGLE_CLIENT_ID` |
| **Integrations** | Brevo, Google OAuth, OpenAI |
| **QA** | Phase 5 checklist, Postman on prod URL |

---

## Cost estimate

| Service | Typical cost |
|---------|----------------|
| Vercel Hobby or Netlify Starter | $0 |
| Render free web service | $0 (cold starts) |
| MongoDB Atlas M0 | $0 |
| Brevo free tier | $0 (~300 emails/day) |
| OpenAI | ~$1–5 for light demo usage |
