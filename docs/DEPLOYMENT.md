# ☁️ Deployment Guide

Two deployment modes are supported:

| Mode | Hosting | Backend | Data |
|---|---|---|---|
| **Static** (default via GitHub Actions) | GitHub Pages | ❌ none | localStorage only (offline-first) |
| **Full stack** (recommended) | Cloudflare Workers | ✅ Hono API | D1 (SQLite) + R2 (files) |

Live URLs referenced in the project:
- GitHub Pages: https://virak33.github.io/academic-workspace/
- Cloudflare Worker: `https://academic-workspace.virak-dev.workers.dev` (per `.env.example`)

---

## 1. Static deploy (GitHub Pages)

Handled automatically by `.github/workflows/deploy.yml` — on every push to `main` it runs `npm ci && npm run build` and publishes `dist/` via `actions/upload-pages-artifact`.

> ⚠️ In static mode there is no `/api` backend: the app serves everything from `localStorage`, and auth/push/R2 uploads are unavailable.

## 2. Full-stack deploy (Cloudflare)

### Prerequisites
- Node.js ≥ 18
- `npm install` done
- `npx wrangler login`

### 2.1 Create bindings (already configured in `wrangler.toml`)

```bash
npx wrangler d1 create schedule
# → paste database_id into wrangler.toml if you re-create

npx wrangler r2 bucket create academic-workspace-files
npx wrangler r2 bucket create academic-workspace-files-preview
```

`wrangler.toml` currently wires:
- D1 → binding `DB` (name `schedule`)
- R2 → binding `ACADEMIC_STORAGE` (bucket `academic-workspace-files`)
- Cron → `*/15 * * * *` (push notification scan)
- Static assets → `./dist` served by the Worker (`ASSETS` binding)

### 2.2 Apply database migrations

```bash
# Local (preview/offline dev DB)
npx wrangler d1 execute schedule --local --file=migrations/0001_initial_schema.sql
# ...repeat for 0002–0006

# Remote (production)
npx wrangler d1 migrations apply schedule --remote
```

Migrations present in `migrations/`:
| File | Purpose |
|---|---|
| `0001_initial_schema.sql` | Core tables (courses, events, tasks, papers, …) |
| `0002_seed_data.sql` | Seed academic dataset |
| `0003_multi_user_and_push.sql` | Users + push subscription tables |
| `0004_multiday_events.sql` | Multi-day event support |
| `0005_attendance_tracking.sql` | Attendance log tables |
| `0006_sprints_and_advanced_kanban.sql` | Sprints + advanced kanban fields |

### 2.3 Configure secrets

Local dev — put in `.dev.vars` (gitignored):
```
JWT_SECRET=<random-string>
VAPID_PUBLIC_KEY=<base64url>
VAPID_PRIVATE_KEY=<base64url>
VAPID_SUBJECT=mailto:you@example.com
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<secret>
```

Production (`secrets` are encrypted, not committed):
```bash
npx wrangler secret put JWT_SECRET
npx wrangler secret put VAPID_PUBLIC_KEY
npx wrangler secret put VAPID_PRIVATE_KEY
npx wrangler secret put VAPID_SUBJECT
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
```

Public vars (`[vars]` in `wrangler.toml`) intentionally include the **public** Google client ID and **public** VAPID key — safe to be served to browsers.

### 2.4 Google OAuth setup

In Google Cloud Console → Credentials → OAuth 2.0 Web Client:
1. **Authorized JavaScript origins:**
   - `http://localhost:3000`
   - `https://academic-workspace.virak-dev.workers.dev` (or your custom domain)
2. Copy the client ID into `wrangler.toml [vars] GOOGLE_CLIENT_ID` and `wrangler secret put GOOGLE_CLIENT_SECRET`.

> Dev server port is **3000** (see `vite.config.ts`), not 5173 — make sure the origin matches.

### 2.5 Build & deploy

```bash
npm run build          # tsc + vite build → dist/ (static frontend)
npx wrangler deploy    # Worker + assets + cron + bindings
```

Verify:
```bash
curl https://academic-workspace.virak-dev.workers.dev/api/health
# → {"status":"ok", ...}
```

### 2.6 Logs & debugging

```bash
npx wrangler tail                          # stream live logs
npx wrangler d1 execute schedule --remote --command "SELECT COUNT(*) FROM courses"
```

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `/api` 500s locally | Ensure `wrangler.toml` D1 `database_id` is valid; try `npx wrangler dev` |
| Google login fails on localhost | Add `http://localhost:3000` to authorized origins |
| Push notifications silent | `npx wrangler tail` during cron tick; verify VAPID secrets set |
| New feature missing in UI | Confirm new migration applied: `npx wrangler d1 migrations list schedule --remote` |
