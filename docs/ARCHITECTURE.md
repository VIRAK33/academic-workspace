# 🏗️ Architecture

Academic Command Center is an **offline-first** React SPA with an optional **Cloudflare Worker** backend (D1 + R2) for multi-device sync, plus a **terminal CLI** that shares the same data model.

```
┌──────────────────────────────────────────────────────────────┐
│  Terminal CLI (bin/aw.ts — Commander)                        │
│  `today` · `task` · `event` · `paper` · `exp` · `mode`        │
│  Reads/writes local JSON state (.aw-local-state.json)        │
└──────────────────────────────────────────────────────────────┘
        ▲ shared types (src/types/index.ts)
┌──────────────────────────────────────────────────────────────┐
│  Browser SPA (src/client — React 18 + Vite + Tailwind 3)     │
│  8 views · 20+ modals · optimistic mutations                 │
│                                                              │
│  api.ts ── tries REST /api ──┬── succeeds → D1-backed data   │
│                              └── fails    → localStorage     │
└──────────────────────────────────────────────────────────────┘
        ▲ REST (JSON)
┌──────────────────────────────────────────────────────────────┐
│  Cloudflare Worker (src/server — Hono)                       │
│  ┌──────────┬──────────┬─────────────┬────────────────┐      │
│  │ auth.ts  │ push.ts  │ db.ts       │ defaultData.ts │      │
│  │ Google   │ Web Push │ D1 layer +  │ Seed/sample    │      │
│  │ JWT auth │ cron 15m │ localStorage│ data           │      │
│  └──────────┴──────────┴─────────────┴────────────────┘      │
│        │ D1 binding                │ R2 binding               │
│  ┌─────▼─────┐              ┌──────▼──────────────────┐       │
│  │ schedule  │              │ academic-workspace-files│       │
│  │ (SQLite)  │              │ (paper PDFs, uploads)   │       │
│  └───────────┘              └─────────────────────────┘       │
└──────────────────────────────────────────────────────────────┘
```

## Directory layout

```
Academic_workspace/
├── bin/
│   ├── aw.ts                 # CLI source (Commander, ledgers: tasks/papers/exp/mode)
│   ├── aw.js                 # npm-linked executable wrapper (aw / acad / phd)
│   └── phd.ts / phd.js       # Alias entry points
├── migrations/               # D1 SQL migrations (applied in order)
│   ├── 0001_initial_schema.sql
│   ├── 0002_seed_data.sql
│   ├── 0003_multi_user_and_push.sql
│   ├── 0004_multiday_events.sql
│   ├── 0005_attendance_tracking.sql
│   └── 0006_sprints_and_advanced_kanban.sql
├── src/
│   ├── client/
│   │   ├── api.ts            # REST client with localStorage fallback (offline-first)
│   │   ├── App.tsx           # Entry view router + modal coordinator + keyboard shortcuts
│   │   ├── main.tsx
│   │   ├── index.css         # Tailwind layers & custom utilities
│   │   ├── hooks/
│   │   │   ├── useWorkspace.ts     # Central workspace state + optimistic mutations
│   │   │   ├── useAuth.ts          # Google session state
│   │   │   └── useBodyScrollLock.ts
│   │   ├── utils/
│   │   │   ├── notificationScheduler.ts  # Client-side reminder scheduling
│   │   │   └── icsExport.ts              # Apple Calendar / .ics export
│   │   └── components/
│   │       ├── Header.tsx            # Semester picker, Tools menu, live clock
│   │       ├── Navigation.tsx        # Tabs with live counts + Customize Views
│   │       ├── MobileBottomNav.tsx
│   │       ├── common/               # ModalSheet, TimeInput, Twemoji
│   │       ├── modals/               # 20+ feature modals (Course, Task, Auth, ...)
│   │       └── views/                # Schedule timeline, 19-week matrix, tasks,
│   │                                 # kanban, papers, meetings, conferences, exp logs
│   ├── server/
│   │   ├── index.ts         # Hono router — all /api endpoints (see docs/API.md)
│   │   ├── auth.ts          # Google OAuth verification → signed JWT cookie
│   │   ├── push.ts          # Web Push sender + cron handler
│   │   ├── db.ts            # D1 queries; degrades to localStorage when no DB binding
│   │   └── defaultData.ts   # Sample/seed academic data
│   └── types/
│       └── index.ts         # Shared data models (used by CLI, server, client)
├── wrangler.toml            # Worker config: D1, R2, cron, public vars
└── vite.config.ts           # Dev middleware plugin runs the Hono app in-node
```

## Key design decisions

### 1. Offline-first with graceful degradation
`src/client/api.ts` attempts every mutation/GET against the REST API. If the request fails/timeout or the endpoint is unreachable, it persists to `localStorage` and serves from there. This is why:
- The GitHub Pages deployment (static build, no backend) works standalone.
- The same pages "sync" when served from the Worker with D1 bound.

### 2. Single-process dev server
`vite.config.ts` includes a custom plugin (`apiServerPlugin`) that intercepts `/api/*` requests in the dev server and executes the **same Hono app** (`src/server/index.ts`) in-process via `app.fetch()`. No separate backend process during development.

### 3. Per-user data scoping
After Google OAuth, the server issues a signed JWT (cookie) and injects `userId` per request via Hono context. Every data query is filtered by `userId`, so D1 is multi-tenant single-database.

### 4. Schema organization
D1 is a **relational** schema (courses, events, tasks, kanban, sprints, papers, conferences, experiments, meetings, attendance, push subscriptions). Migrations are plain SQL files in `migrations/` applied with `wrangler d1 migrations` or `wrangler d1 execute --file`.

### 5. Web push pipeline
- Client subscribes → `/api/notifications/subscribe` stores the subscription in D1.
- Cron trigger (`*/15 * * * *` in `wrangler.toml`) wakes the Worker; `src/server/push.ts` builds up coming class/deadline payloads and sends them with VAPID keys from secrets.
- Public VAPID key is exposed via `/api/notifications/vapid-public-key`.

## Keyboard shortcuts (SPA)

| Key | Action |
|---|---|
| `T` | New task |
| `[` / `]` | Previous / next day |
| `1`–`5` | Switch view tabs |
| `C` | Next/prev week context |
| `?` | Show keyboard shortcut help |

## Tech stack versions

| Package | Version |
|---|---|
| React | 18.3 |
| TypeScript | 5.7 |
| Vite | 6.x |
| Tailwind CSS | 3.4 |
| Hono | 4.6 |
| Commander | 12 (CLI) |
| Cloudflare Workers types | 2025-01-09 |
