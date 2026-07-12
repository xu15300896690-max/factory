# Factory Inventory Management

A complete factory inventory management system with three components:

| Component | Purpose | Stack |
|---|---|---|
| **`server/`** | REST API + SQLite persistence | Node 20, Express, better-sqlite3, JWT (httpOnly cookies) |
| **`src/`** | **Admin web panel** (desktop) | React 18, Vite 6, TanStack Query, shadcn/ui |
| **`android-app/`** | **Operator mobile app** | Kotlin, Jetpack Compose, Hilt, CameraX + ML Kit barcode |

**Feature split**:
- **Android app** (operators): scan barcodes, submit inbound/outbound, view own history
- **Admin web panel** (admins): dashboard, inventory, audits approval, reports, settings, users

**Default accounts** (seeded):
- `admin` / `admin123` — full access, can approve audits and manage settings
- `operator` / `operator123` — submits audits only

---

## Architecture

```
LAN Server (xu@192.168.31.191)
└── docker compose
    ├── api   (Node + Express + SQLite, port 4000)
    └── web   (nginx, port 8080)
        └── serves static React build
            └── proxies /api/* → api:4000

Android devices on LAN
└── httpOnly cookie auth via OkHttp CookieJar
    └── GET /api/me, POST /api/audits, etc.
```

The Android app uses the same backend as the web admin. Authentication uses httpOnly cookies; OkHttp's CookieJar handles cookie persistence on Android.

---

## Local development

### 1. Backend

```bash
cd server
npm install
cp .env.example .env  # adjust JWT_SECRET
npm run dev           # tsx watch on http://localhost:4000
```

The DB auto-creates on first run, runs migrations, and seeds if empty.

To re-seed: `rm server/data/app.sqlite && npm run dev`.

### 2. Frontend (admin web)

```bash
npm install
npm run dev           # http://localhost:5173, /api proxied to localhost:4000
```

### 3. Android app

Open `android-app/` in Android Studio. Update `API_BASE_URL` in
`app/build.gradle.kts` if your server is not at `192.168.31.191:8080`.

For physical device testing on LAN, the URL in `buildConfigField` is already set
to `http://192.168.31.191:8080/api/`. For emulator, change to `http://10.0.2.2:4000/api/`.

---

## LAN deployment

```bash
./scripts/deploy.sh             # default → xu@192.168.31.191:/opt/factory-inventory
```

The script:
1. Builds frontend + backend
2. Bundles everything into a `deploy/` folder
3. Copies it to the server over SSH
4. Generates a random `JWT_SECRET` if `.env` doesn't exist
5. Runs `docker compose up -d --build`

After deployment, the app is available at **http://192.168.31.191:8080**.

### Manual deployment

```bash
# On the dev machine
npm run build
( cd server && npm run build )
tar czf factory-inventory.tar.gz \
    dist server/dist server/migrations server/package.json \
    Dockerfile.web Dockerfile.api docker-compose.yml nginx.conf .env.example

# Copy to server
scp factory-inventory.tar.gz xu@192.168.31.191:/tmp/
ssh xu@192.168.31.191 'mkdir -p /opt/factory-inventory && tar xzf /tmp/factory-inventory.tar.gz -C /opt/factory-inventory'

# On the server
ssh xu@192.168.31.191
cd /opt/factory-inventory
cp .env.example .env
# Edit .env — set JWT_SECRET to a strong random value
sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$(openssl rand -hex 32)|" .env
docker compose --env-file .env up -d --build
```

### Operations

```bash
# Check status
ssh xu@192.168.31.191 'docker compose -f /opt/factory-inventory/docker-compose.yml ps'

# Tail logs
ssh xu@192.168.31.191 'docker compose -f /opt/factory-inventory/docker-compose.yml logs -f --tail=200'

# Backup SQLite
ssh xu@192.168.31.191 'docker compose -f /opt/factory-inventory/docker-compose.yml exec api sh -c "cp /app/data/app.sqlite /app/data/backup-\$(date +%F).sqlite"'

# Stop
ssh xu@192.168.31.191 'cd /opt/factory-inventory && docker compose down'

# Reset DB (DEV ONLY)
ssh xu@192.168.31.191 'cd /opt/factory-inventory && docker compose down -v && docker compose up -d'
```

---

## API summary

All endpoints prefixed with `/api`.

| Method | Path | Auth | Role |
|---|---|---|---|
| POST | `/auth/login` | — | — |
| POST | `/auth/logout` | ✓ | any |
| GET | `/auth/me` | ✓ | any |
| GET | `/items` | ✓ | any |
| GET | `/items/lookup?code=SKU_OR_BARCODE` | ✓ | any (used by Android scan) |
| GET/POST/PATCH/DELETE | `/items/:id` | ✓ | any / admin |
| GET/POST/PATCH/DELETE | `/warehouses`, `/categories`, `/personnel` | ✓ | any / admin |
| GET | `/audits` | ✓ | any |
| POST | `/audits` | ✓ | any (Android: `source=android`) |
| POST | `/audits/:id/approve`, `/:id/reject` | ✓ | admin |
| GET | `/dashboard/summary` | ✓ | any |
| GET | `/reports/flow\|categories\|turnover\|top-movers` | ✓ | any |
| GET | `/reports/export.csv?type=stock\|audits\|lowStock` | ✓ | any |
| GET/PATCH | `/settings` | ✓ | any / admin |
| GET/POST/PATCH/DELETE | `/users` | ✓ | admin |

**Auto-approval**: admin submitting inbound with quantity ≤ `AUTO_APPROVAL_LIMIT`
(default 50) is approved and applied instantly without admin review.

---

## Project layout

```
factory-inventory/
├── server/                  # Express + SQLite backend
│   ├── src/
│   │   ├── app.ts           # Express app + middleware
│   │   ├── config.ts        # env vars (zod-validated)
│   │   ├── db.ts            # SQLite + migration runner
│   │   ├── seed.ts          # idempotent seeder
│   │   ├── middleware/      # auth, rate-limit, validate, error
│   │   ├── routes/          # auth, items, audits, dashboard, reports, ...
│   │   ├── services/        # audit.ts (transactional approval)
│   │   └── types/domain.ts  # zod schemas + DTOs
│   ├── migrations/0001_init.sql
│   └── test/smoke.ts        # API end-to-end smoke test
├── src/                     # Admin Web Panel (React)
│   ├── main.tsx             # Router + QueryClient
│   ├── app/
│   │   ├── routes.tsx       # loaders (requireAuth, requireRole)
│   │   ├── lib/             # api, query-client, auth-store, format
│   │   ├── components/
│   │   │   ├── layout/      # AppShell (sidebar + topbar)
│   │   │   └── modals/      # ItemFormModal
│   │   └── pages/           # Login, Dashboard, Inventory, Audits, Reports, ...
│   └── styles/
├── android-app/             # Operator Android App (Kotlin Compose)
│   ├── app/src/main/java/com/factory/inventory/
│   │   ├── data/            # Models, SessionStore (DataStore)
│   │   ├── network/         # Retrofit ApiService
│   │   ├── scan/            # BarcodeAnalyzer (CameraX + ML Kit)
│   │   ├── ui/              # Login, Dashboard, Scan, Request, MyAudits
│   │   └── di/              # Hilt NetworkModule
│   └── app/build.gradle.kts
├── Dockerfile.api           # api container
├── Dockerfile.web           # web container
├── docker-compose.yml
├── nginx.conf               # static + /api reverse proxy
└── scripts/deploy.sh
```

---

## Smoke test

With the API running:

```bash
cd server
npm run smoke
```

Verifies: admin login, item CRUD, operator outbound → admin approve flow, role-based
authorization, CSV export.

---

## Security notes

- Passwords stored with bcrypt (cost 10)
- JWT signed with HS256, 7-day expiry, stored in httpOnly `Secure` (production) cookies
- Login rate-limited at 10 attempts / 15 min / IP
- CORS restricted to `WEB_ORIGIN` env var
- Audit approval is wrapped in `db.transaction()` (IMMEDIATE) for serializability —
  prevents oversell on concurrent outbound approvals
- For production over LAN, set `COOKIE_SECURE=true` and serve over HTTPS via reverse proxy

---

## License

Private / internal use.