# Healthqor Health ID

Digital Health Identity platform for Sri Lanka — encrypted health records, AI symptom triage & diet analysis, 3D profile viewer, e-Channeling, and admin tooling.

**Stack:** Spring Boot 3 · React 18 · MySQL 8 · Redis · OpenAI · Three.js

---

## Features

| Feature | Description |
|---------|-------------|
| **Health ID** | Unique ID generated on signup: `HID-{COUNTRY}-{YEAR}-{HASH}-{RANDOM}` |
| **Encrypted records** | AES-256 encryption for NIC, allergies, and sensitive fields |
| **Auth** | JWT (HttpOnly cookies), email/password, Google OAuth2 |
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

**Google Cloud Console setup:** Create an OAuth 2.0 **Web application** client and add this authorized redirect URI:

```
http://localhost:5173/auth/google/callback
```

For production, add your deployed frontend URL with the same path, e.g. `https://your-domain.com/auth/google/callback`.
| `FRONTEND_ORIGIN` | `http://localhost:5173` | CORS origin |
| `CACHE_TYPE` | `simple` | Use `simple` locally without Redis |
| `SPRING_PROFILES_ACTIVE` | `dev` | Dev profile disables Redis requirement |
| `VITE_API_URL` | *(empty)* | Leave empty — Vite proxies to backend |

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
| POST | `/api/auth/register` | Public |
| POST | `/api/auth/login` | Public |
| POST | `/api/auth/google` | Public |
| GET | `/api/profile/me` | Authenticated |
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

Integration tests use H2 in-memory with `create-drop` DDL.

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
