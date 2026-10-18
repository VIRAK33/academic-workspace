# 🔌 API Reference

All endpoints live under `/api/` on the Cloudflare Worker (Hono app in `src/server/index.ts`).
Authentication uses an HttpOnly JWT cookie set after Google sign-in (`auth.ts`). Unauthenticated requests fall back to a `guest_user` scope for most data routes, so a static deployment can still exercise the API contract.

Base URL:
- **Local dev:** `http://localhost:3000/api/*` (Vite middleware proxies to the Hono app in-process)
- **Worker deploy:** `https://<your-worker>.workers.dev/api/*`

## System

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | `{ status, timestamp }` |
| GET | `/api/time` | Server UTC time and timezone helpers |

## Auth

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/google` | Exchange a Google ID token for a signed session JWT cookie |
| POST | `/api/auth/demo` | Create a demo/guest session without Google |
| GET | `/api/auth/me` | Current user profile from the session cookie |

Requires the Worker secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `JWT_SECRET`.

## Push notifications

| Method | Path | Description |
|---|---|---|
| GET | `/api/notifications/vapid-public-key` | Public VAPID key for the browser subscription flow |
| POST | `/api/notifications/subscribe` | Save a Web Push subscription for the current user |
| POST | `/api/notifications/unsubscribe` | Remove a subscription |
| POST | `/api/notifications/test` | Send a test push to the current user |

Cron trigger (`*/15 * * * *`) invokes `src/server/push.ts` to scan schedules and deadlines, then sends pushes to all subscribed users.

## Academic resources

Each resource supports the same shape below (`GET` list, `POST` upsert, `DELETE /:id`).
Payload schemas live in `src/types/index.ts`.

| Resource | Endpoints |
|---|---|
| Semesters | `GET /api/semesters` · `POST /api/semesters` · `DELETE /api/semesters/:id` |
| Time slots | `GET /api/timeslots` · `PUT /api/timeslots` |
| Courses | `GET /api/courses` · `POST /api/courses` · `DELETE /api/courses/:id` |
| Events/routines | `GET /api/events` · `POST /api/events` · `DELETE /api/events/:id` |
| Tasks | `GET /api/tasks` · `POST /api/tasks` · `DELETE /api/tasks/:id` |
| Kanban | `GET /api/kanban` · `POST /api/kanban` · `DELETE /api/kanban/:id` |
| Papers | `GET /api/papers` · `POST /api/papers` · `DELETE /api/papers/:id` |
| Conferences | `GET /api/conferences` · `POST /api/conferences` · `DELETE /api/conferences/:id` |
| Experiments | `GET /api/experiments` · `POST /api/experiments` |
| Meetings | `GET /api/meetings` · `POST /api/meetings` |
| Attendance | `GET /api/attendance` · `POST /api/attendance` · `DELETE /api/attendance/:id` |

## Sprints

| Method | Path | Description |
|---|---|---|
| GET | `/api/sprints` | List sprints |
| POST | `/api/sprints` | Create/replace a sprint |
| POST | `/api/sprints/clear-all` | Delete all sprints for the user |
| DELETE | `/api/sprints/:id` | Delete one sprint |

## Digest

| Method | Path | Description |
|---|---|---|
| GET | `/api/digest` | Weekly Markdown digest (completed tasks, experiments, meetings) for copying into an email |

## File storage (R2)

| Method | Path | Description |
|---|---|---|
| POST | `/api/storage/upload` | Upload a file (multi-part binary body) to the `ACADEMIC_STORAGE` R2 bucket |
| GET | `/api/storage/file` | Fetch a previously uploaded object by key |

## Workspace maintenance

| Method | Path | Description |
|---|---|---|
| POST | `/api/workspace/sample-data` | Re-seed the current user's workspace with sample academic data |
| POST | `/api/workspace/clear` | Wipe all workspace data for the current user |
| GET | `/api/backup` | Export full workspace as JSON |
| POST | `/api/backup/restore` | Restore from a JSON backup |

## Status codes

- `200` — success
- `400` — malformed payload
- `401/403` — invalid or missing session (auth-required routes only)
- `500` — D1/R2 or unexpected server errors
