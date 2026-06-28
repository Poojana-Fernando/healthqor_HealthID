# Healthqor Health ID

Digital Health Identity platform for Sri Lanka — encrypted health records, AI symptom triage & diet analysis, 3D profile viewer, e-Channeling, and admin tooling.

**Stack:** Spring Boot 3 · React 18 · MongoDB · Redis · OpenAI · Three.js

---

## Features

| Feature | Description |
|---------|-------------|
| **Health ID** | Unique ID generated on signup: `HID-{COUNTRY}-{YEAR}-{HASH}-{RANDOM}` |
| **Encrypted records** | AES-256 encryption for NIC, allergies, and sensitive fields |
| **Auth** | JWT (HttpOnly cookies), email/password, Google OAuth2, GitHub OAuth |
| **AI Symptom Checker** | OpenAI triage with what-not-to-do guidance and recommended articles |
| **AI Health Analysis** | Personalised diet recommendations from profile data |
| **3D Humanoid** | Three.js particle viewer (male/female models by gender) |
| **e-Channeling** | Doctor search, nearby doctors, appointment booking |
| **Admin panel** | User management, Health ID lookup, audit logs |

---

## Project structure

```
healthid/
├── backend/          # Java 21 + Spring Boot API
│   ├── run.ps1       # Start backend (loads ../.env)
│   └── mvn.cmd       # Maven wrapper helper (Windows)
├── frontend/         # React + Vite + Tailwind + Three.js
├── .env.example      # Environment template (copy to .env)
└── README.md
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Java | 21+ (25 supported with Lombok 1.18.40+) |
| Maven | 3.9+ |
| Node.js | 18+ |
| MongoDB | 6+ (Atlas cluster or self-hosted replica set) |
| Redis | Optional for local dev |

---

## Quick start

### 1. Clone the repository

```bash
git clone https://github.com/Poojana-Fernando/healthqor_HealthID.git
cd healthqor_HealthID
```

> **Git LFS:** The background video is stored with Git LFS. Install [Git LFS](https://git-lfs.com/) before cloning:
> ```bash
> git lfs install
> git clone https://github.com/Poojana-Fernando/healthqor_HealthID.git
> ```

### 2. Configure MongoDB

Create a database on your MongoDB cluster (e.g. `healthid`) and obtain a connection URI. A **replica set** is required for multi-document transactions (standard on MongoDB Atlas).

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set these **required** values:

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string (e.g. `mongodb+srv://...`) |
| `HEALTHID_ENCRYPTION_KEY` | 64-char hex string (32 bytes) — `openssl rand -hex 32` |
| `JWT_SECRET` | Long random string for signing tokens |
| `OPENAI_API_KEY` | OpenAI API key for AI features |

**Optional:**

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGODB_DATABASE` | `healthid` | Database name |
| `ADMIN_EMAIL` | — | First-run admin bootstrap email (only when no ADMIN exists) |
| `ADMIN_PASSWORD` | — | First-run admin bootstrap password |
| `ADMIN_NAME` | `System Admin` | Display name for bootstrapped admin |
| `GOOGLE_CLIENT_ID` | — | Google OAuth client ID (Web application) |
| `GOOGLE_CLIENT_SECRET` | — | Google OAuth client secret |
| `VITE_GOOGLE_CLIENT_ID` | — | Same client ID as `GOOGLE_CLIENT_ID` (loaded from root `.env` by Vite) |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | CORS origin |
| `CACHE_TYPE` | `simple` | Use `simple` locally without Redis |
| `SPRING_PROFILES_ACTIVE` | `dev` | Dev profile disables Redis requirement |
| `VITE_API_URL` | *(empty)* | Leave empty — Vite proxies to backend |
| `BREVO_API_KEY` | — | Brevo API v3 key for sending verification emails (optional in dev — OTP logged to console when unset) |
| `BREVO_SENDER_EMAIL` | — | Verified sender address in Brevo |
| `BREVO_SENDER_NAME` | `HealthID` | Sender display name |
| `EMAIL_REVERIFY_DAYS` | `30` | Password logins require email re-verification after this many days |
| `EMAIL_OTP_EXPIRY_MINUTES` | `15` | OTP / magic link expiry |
| `TWILIO_ACCOUNT_SID` | — | Twilio account SID for SMS phone verification (optional in dev — OTP logged to console) |
| `TWILIO_AUTH_TOKEN` | — | Twilio auth token |
| `TWILIO_FROM_NUMBER` | — | Twilio sender number in E.164 (e.g. `+15017122661`) |
| `PHONE_OTP_EXPIRY_MINUTES` | `15` | SMS OTP expiry after registration |

**Email verification (Brevo):** Sign up at [Brevo](https://app.brevo.com), verify a sender email or domain, then create an API v3 key. Without `BREVO_API_KEY`, the backend uses a dev no-op mailer that logs OTP codes to the console.

**Phone verification (Twilio):** See [docs/TWILIO_SETUP.md](docs/TWILIO_SETUP.md) for the full setup walkthrough. Without `TWILIO_ACCOUNT_SID`, the backend logs SMS OTP codes to the console (same pattern as email).

> **Never commit `.env`** — it is listed in `.gitignore`.

**Google Cloud Console setup:** Create an OAuth 2.0 **Web application** client and add this authorized redirect URI:

```
http://localhost:5173/auth/google/callback
```

For production, add your deployed frontend URL.

### 4. Start the backend

**Windows (recommended):**

```powershell
cd backend
.\mvn.cmd clean compile
.\run.ps1
```

**macOS / Linux (Maven on PATH):**

```bash
cd backend
mvn spring-boot:run
```

- API: http://localhost:8080  
- Swagger UI: http://localhost:8080/swagger-ui.html

On first start, `MongoInitializer` creates collections with JSON Schema validators and indexes. If no `ADMIN` user exists and `ADMIN_EMAIL`/`ADMIN_PASSWORD` are set, an admin account is bootstrapped automatically.

### 5. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

- App: http://localhost:5173

---

## Environment profiles

| Profile | Use case |
|---------|----------|
| `dev` | Local development — in-memory cache, no Redis required |
| `prod` | Production — disables Swagger UI |

Set in `.env`:

```
SPRING_PROFILES_ACTIVE=dev
CACHE_TYPE=simple
```

---

## API overview

| Method | Endpoint | Access |
|--------|----------|--------|
| POST | `/api/auth/register` | Public — returns verification challenge; user created after `/verify-email` |
| POST | `/api/auth/login` | Public — may require email re-verification |
| POST | `/api/auth/verify-email` | Public — OTP or magic link token |
| POST | `/api/auth/resend-verification` | Public |
| POST | `/api/auth/forgot-password` | Public — sends reset email for password-based accounts |
| POST | `/api/auth/reset-password` | Public — OTP or magic link + new password |
| POST | `/api/auth/resend-password-reset` | Public |
| POST | `/api/auth/google` | Public |
| POST | `/api/auth/send-phone-otp` | Authenticated — send SMS OTP to registered mobile |
| POST | `/api/auth/resend-phone-otp` | Authenticated |
| POST | `/api/auth/verify-phone` | Authenticated — body `{ "code": "123456" }` |
| GET | `/api/profile/me` | Authenticated — includes `phoneVerified` |
| PUT | `/api/profile/me` | Authenticated |
| POST | `/api/ai/symptom-check` | Authenticated |
| POST | `/api/ai/health-analysis` | Authenticated |
| GET | `/api/doctors/nearby` | Public |
| POST | `/api/appointments` | Authenticated |
| GET | `/api/admin/users` | Admin |

---

## Running tests

```bash
cd backend
mvn test
```

Integration tests use Testcontainers with MongoDB 7. Docker must be running for `mvn test`.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `mvn` not found (Windows) | Use `backend\mvn.cmd` instead |
| Port 8080 in use | Stop the existing Java process or change server port |
| MongoDB connection failed | Verify `MONGODB_URI` in `.env` and cluster IP allowlist (Atlas) |
| Redis connection errors | Set `CACHE_TYPE=simple` and `SPRING_PROFILES_ACTIVE=dev` |
| AI returns fallback data | Check `OPENAI_API_KEY` is set and backend was restarted |
| Frontend can't reach API | Ensure backend is on port 8080; leave `VITE_API_URL` empty for dev proxy |
| Maven `PKIX path building failed` / `certificate_unknown` | Java cannot trust Maven Central HTTPS (common on corporate networks, VPN, or antivirus SSL inspection). See [Maven SSL fix](#maven-ssl--dependency-download-errors) below |
| `npm` errors in wrong folder | Run `npm install` only inside `frontend/` (not repo root or `backend/`) |

### Maven SSL / dependency download errors

If Maven fails with errors like:

```
PKIX path building failed: unable to find valid certification path to requested target
Plugin ... or one of its dependencies could not be resolved
```

the project `pom.xml` is fine — your **Java/Maven environment cannot verify HTTPS** to `repo.maven.apache.org`.

**Try these fixes (in order):**

1. **Use the project Maven wrapper from `backend/`:**
   ```powershell
   cd backend
   .\mvnw.cmd clean compile
   ```

2. **Bypass corporate proxy for Maven** (if you use a proxy):
   ```powershell
   set MAVEN_OPTS=-Djava.net.useSystemProxies=true
   .\mvn.cmd clean compile
   ```

3. **Antivirus / SSL inspection:** Temporarily disable HTTPS scanning (Kaspersky, Avast, corporate endpoint tools) or add an exception for `java.exe` and `repo.maven.apache.org`.

4. **Import your network's root certificate into Java** (corporate VPN/firewall):
   ```powershell
   # Find your Java home
   java -XshowSettings:properties -version 2>&1 | findstr "java.home"

   # Import cert (replace paths; run as Administrator)
   keytool -importcert -alias corporate-proxy -file C:\path\to\corp-root-ca.cer -keystore "%JAVA_HOME%\lib\security\cacerts" -storepass changeit
   ```
   Then restart the IDE and run `.\mvn.cmd clean compile` again.

5. **Use Java 21 LTS** (project target). Java 25 may work for compile but some tools/plugins can behave differently:
   ```powershell
   java -version   # should show 21.x for best compatibility
   ```

6. **Frontend dependencies** (separate from Maven):
   ```powershell
   cd frontend
   Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
   npm install
   npm run dev
   ```

`mvn compile` may succeed if dependencies are already cached in `~/.m2`, while `mvn test` or IDE "Resolve dependencies" fails when new artifacts must be downloaded.

---

## Production

```bash
SPRING_PROFILES_ACTIVE=prod mvn spring-boot:run
```

Build frontend for production:

```bash
cd frontend
npm run build
```

Serve `frontend/dist` behind a reverse proxy and point it at your API origin.

---

## License

MIT © Poojana Fernando — see [LICENSE](LICENSE).
