# Architecture

## Overview

MathMap is a classic three-tier web application:

```
┌──────────────────────────┐        ┌───────────────────────────┐        ┌──────────────────┐
│  React SPA (Vite)        │  HTTP  │  Express API              │  SQL   │  PostgreSQL       │
│  Tailwind + React Router │ ─────▶ │  routes → services → db   │ ─────▶ │  schema + views   │
│  :5173 (proxies /api)    │        │  :4000                    │        │  :5432            │
└──────────────────────────┘        └───────────────────────────┘        └──────────────────┘
```

- The client never talks to Postgres directly; all access goes through the API.
- In development Vite proxies `/api` to `http://localhost:4000`, so the browser only needs one origin.
- In production the built client (`client/dist`) can be served by any static host while the API runs
  separately; set `VITE_API_URL` to point the client at the API if they are on different origins.

## Server modules

| Module | Responsibility |
| --- | --- |
| `config.js` | Loads `.env` from the repo root (falling back to `server/.env`) and exposes typed config. |
| `db/pool.js` | A single `pg.Pool` plus `query`/`one`/`many`/`tx` helpers. `tx` wraps a callback in BEGIN/COMMIT/ROLLBACK. |
| `db/migrate.js` | Creates the target database if missing (via the `postgres` maintenance DB) then applies `db/schema.sql`. |
| `lib/jwt.js` | Dependency-free HS256 sign/verify with `exp`/`iat` claims and constant-time signature comparison. |
| `lib/password.js` | `scrypt` hashing in the format `scrypt$N$r$p$salt$hash`, with timing-safe verification. |
| `lib/validate.js` | Hand-rolled validators that throw `HttpError(400)` with readable messages. |
| `lib/httpError.js` | `HttpError` plus `badRequest`/`unauthorized`/`forbidden`/`notFound`/`conflict` helpers. |
| `middleware/auth.js` | `authenticate` (required), `optionalAuth` (best-effort) and `requireRole(...roles)`. |
| `middleware/errorHandler.js` | 404 handler and the central error renderer (JSON, hides stacks in production). |
| `middleware/rateLimit.js` | Small in-memory fixed-window limiter used on auth routes. |
| `services/graph.js` | Pure graph algorithms: adjacency map, transitive closure, reverse closure, cycle detection, Kahn topological sort, layered layout. |
| `services/roadmapEngine.js` | The recommendation engine (scoring → closure → ordering → trimming → resource attachment). |
| `services/contentService.js` | All shared read queries: branches, topics, graph, resources, problems, stats, engine data. |
| `routes/*.routes.js` | Thin HTTP layer — validate input, call a service, shape the response. |

## Request lifecycle

```
express.json → cors → route → authenticate/optionalAuth → validate → service/db → JSON
                                                     ↘ throw HttpError → errorHandler → JSON error
```

Errors are thrown, never returned: any `HttpError` propagates to `errorHandler`, which renders
`{ error, details? }` with the right status code. Async handlers are wrapped in `asyncHandler` so
rejections are caught.

## Data flow: generating a roadmap

1. `POST /api/roadmaps/preview` (or `/api/roadmaps` to persist).
2. The route validates the body into `{ branchIds, level, goal, interestTags, length }`.
3. `contentService.loadEngineData()` fetches topics, prerequisite edges, approved resources (with net
   votes) and branches in four parallel queries.
4. `roadmapEngine.generateRoadmap(input, data)` returns the ordered roadmap.
5. For saving, the roadmap row and its ordered items are inserted in one transaction.

## Frontend structure

- `api/client.js` — a single `api(path, { method, body })` wrapper: injects the bearer token from
  `localStorage`, normalises errors into `Error` objects with a `status`, and always returns parsed JSON.
- `context/AuthContext.jsx` — holds the user, hydrates from `GET /auth/me` on load, and exposes
  `login`/`register`/`logout`/`can`/`isModerator`/`isAdmin`.
- `context/ToastContext.jsx` — transient notifications rendered by `<Toaster/>`.
- `hooks/useFetch.js` — `useFetch(fn, deps)` gives `{ data, loading, error, reload }`; `useDebounced`
  powers the search boxes.
- `components/ProtectedRoute.jsx` — redirects anonymous users to `/login` and enforces role lists.
- `components/ConceptGraph.jsx` — computes a layered DAG layout in the browser and renders it as SVG
  (no graph library); nodes are coloured by branch and edges highlight on hover.
- Design tokens live in `index.css` as CSS variables (`--c-canvas`, `--c-surface`, `--c-ink`, …) mapped
  to Tailwind colours, so dark mode is a single `.dark` class flip rather than per-component variants.
