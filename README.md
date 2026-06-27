# Healthqor Health ID

Digital Health Identity platform for Sri Lanka — encrypted health records, AI symptom triage & diet analysis, 3D profile viewer, e-Channeling, and admin tooling.

**Stack:** Spring Boot 3 · React 18 · MySQL 8 · Redis · OpenAI · Three.js

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
| MySQL | 8 |
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

### 2. Create the database

```sql
CREATE DATABASE healthid_db;
CREATE USER 'healthid_user'@'localhost' IDENTIFIED BY 'your_strong_password';
GRANT ALL PRIVILEGES ON healthid_db.* TO 'healthid_user'@'localhost';
FLUSH PRIVILEGES;
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set these **required** values:

| Variable | Description |
|----------|-------------|
| `DB_USER` | MySQL username |
| `DB_PASSWORD` | MySQL password |
| `HEALTHID_ENCRYPTION_KEY` | 64-char hex string (32 bytes) — `openssl rand -hex 32` |
| `JWT_SECRET` | Long random string for signing tokens |
| `OPENAI_API_KEY` | OpenAI API key for AI features |

**Optional:**

| Variable | Default | Description |
|----------|---------|-------------|
| `GOOGLE_CLIENT_ID` | — | Google OAuth client ID (Web application) |
| `GOOGLE_CLIENT_SECRET` | — | Google OAuth client secret |
| `VITE_GOOGLE_CLIENT_ID` | — | Same client ID as `GOOGLE_CLIENT_ID` (loaded from root `.env` by Vite) |
| `GITHUB_CLIENT_ID` | — | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | — | GitHub OAuth App client secret |
| `VITE_GITHUB_CLIENT_ID` | — | Same client ID as `GITHUB_CLIENT_ID` |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | CORS origin |
| `CACHE_TYPE` | `simple` | Use `simple` locally without Redis |
| `SPRING_PROFILES_ACTIVE` | `dev` | Dev profile disables Redis requirement |
| `DB_USE_H2` | `false` | Set `true` to use embedded H2 file DB (no MySQL required) |
| `VITE_API_URL` | *(empty)* | Leave empty — Vite proxies to backend |

**Google Cloud Console setup:** Create an OAuth 2.0 **Web application** client and add this authorized redirect URI:

```
http://localhost:5173/auth/google/callback
```

**GitHub OAuth App setup:** Go to GitHub → Settings → Developer settings → OAuth Apps → New OAuth App. Set the **Authorization callback URL** to:

```
http://localhost:5173/auth/github/callback
```

For production, add your deployed frontend URLs for both providers.

> **Never commit `.env`** — it is listed in `.gitignore`.

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

Flyway runs migrations automatically on first start.

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
| `h2` | Local H2 file database (`DB_USE_H2=true` in `.env`) — auto-seeds demo users |
| `prod` | Production — `Secure` cookies, Swagger disabled |

Set in `.env`:

```
SPRING_PROFILES_ACTIVE=dev
CACHE_TYPE=simple
DB_USE_H2=true
```

When `DB_USE_H2=true`, `backend/run.ps1` activates the `h2` profile automatically. Delete `backend/data/` to reset the local H2 database after schema changes.

### IntelliJ IDEA

1. **File → Open** → select the `backend` folder (Maven project).
2. Copy `.env.example` to the repo root `.env` and fill required values.
3. **Run → Edit Configurations** → add Spring Boot → main class `com.healthid.HealthIdApplication`.
4. Set **Active profiles**: `h2` (or `dev` with MySQL).
5. Optionally add **Environment variables** from `.env`, or run via `backend/run.ps1` which loads them.
6. Run `HealthIdApplication`; API at http://localhost:8080.
7. Open `frontend` in a terminal: `npm install && npm run dev`.

### Demo seed accounts (H2 / dev profile)

When `app.seed.enabled=true` (default on `h2` profile), these accounts are created on first startup:

| Email | Password | Role |
|-------|----------|------|
| `admin@healthid.test` | `Password123!` | ADMIN |
| `patient@healthid.test` | `Password123!` | CITIZEN |
| `doctor@healthid.test` | `Password123!` | DOCTOR (verified) |
| `doctor2@healthid.test` | `Password123!` | DOCTOR (pending) |

### Security model (assignment)

| Topic | Implementation |
|-------|----------------|
| Authentication | Email/password + Google + GitHub OAuth |
| Session | JWT stored in **HttpOnly cookies** (`healthid_access_token`, `healthid_refresh_token`) |
| CSRF | `CookieCsrfTokenRepository` — SPA sends `X-XSRF-TOKEN` header on mutating requests |
| Logout | `POST /api/auth/logout` clears auth cookies |
| Production cookies | `app.cookie.secure=true`, `SameSite=Lax` via `prod` profile |
| Validation | Bean Validation on DTOs; field errors returned as `{ errors: { field: message } }` |

---

## API overview

| Method | Endpoint | Access |
|--------|----------|--------|
| POST | `/api/auth/register` | Public |
| POST | `/api/auth/login` | Public |
| POST | `/api/auth/logout` | Authenticated (clears cookies) |
| POST | `/api/auth/google` | Public |
| POST | `/api/auth/github` | Public |
| GET | `/api/profile/me` | Authenticated |
| PUT | `/api/profile/me` | Authenticated |
| POST | `/api/ai/symptom-check` | Authenticated |
| POST | `/api/ai/health-analysis` | Authenticated |
| GET | `/api/doctors/nearby` | Public |
| POST | `/api/appointments` | Authenticated |
| GET | `/api/appointments/mine` | Authenticated |
| GET | `/api/appointments/{id}` | Authenticated (owner) |
| PUT | `/api/appointments/{id}` | Authenticated (owner) |
| DELETE | `/api/appointments/{id}` | Authenticated (owner, cancel) |
| GET | `/api/admin/users` | Admin (paginated) |
| GET | `/api/admin/audit-logs` | Admin (paginated) |

---

## Assignment checklist

| Requirement | Where |
|-------------|-------|
| Register / login | `AuthController`, `LoginPage`, `SignupPage` |
| Logout | `POST /api/auth/logout`, `AuthContext.logout` |
| CSRF protection | `SecurityConfig`, `frontend/src/api/client.js` |
| Cookie session | `CookieHelper`, `JwtFilter`, `AuthService` |
| Full CRUD (appointments) | `ChannelingController`, `EChannelingPage` |
| Pagination + sort | `AdminController`, `AdminPage` |
| Validation | `UpdateProfileRequest`, `GlobalExceptionHandler` |
| Seed data | `DataSeeder`, `V4__seed_and_oauth_indexes.sql` |
| Integration tests | `backend/src/test/java/com/healthid/integration/` |
| Postman collection | `docs/postman/HealthID.postman_collection.json` |

### Postman

1. Import `docs/postman/HealthID.postman_collection.json` and `docs/postman/HealthID-local.postman_environment.json`.
2. Enable **cookie jar** in Postman settings.
3. Run **Login** first, then copy `XSRF-TOKEN` cookie value to the `xsrfToken` environment variable for mutating requests.
4. Run the Appointments folder for full CRUD.

---

## Running tests

```bash
cd backend
mvn test
# Windows without Maven on PATH:
.\mvnw.cmd test
```

Integration tests use H2 in-memory with `create-drop` DDL. Eight tests cover auth/logout, profile validation, appointment CRUD, and admin access control.

---

## PostgreSQL migration

Update `backend/src/main/resources/application.properties` and the JDBC driver in `pom.xml`:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/healthid_db
spring.datasource.driver-class-name=org.postgresql.Driver
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect
```

Repository interfaces require no code changes.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `mvn` not found (Windows) | Use `backend\mvn.cmd` instead |
| Port 8080 in use | Stop the existing Java process or change server port |
| MySQL access denied | Verify `DB_USER` / `DB_PASSWORD` in `.env` |
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
