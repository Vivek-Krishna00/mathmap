# MathMap

**Community-driven personalized mathematics learning roadmap platform.**

Mathematics learning resources are scattered across dozens of platforms, so learners struggle to
discover good content and to follow a coherent path. MathMap fixes that: you tell it which branches
interest you, your current level and your goal, and it assembles a **personalized, prerequisite-aware
roadmap** filled with a diverse mix of community-curated resources — videos, articles, interactive
games and simulations, problem sets and real-world applications.

It also lets the community **contribute resources and problems**, **vote** on what is useful, and
**moderate** submissions, so the library keeps getting better.

> Academic major project · ADCMS problem statement PS #353 (community-driven maths roadmaps).

---

## Features

| Area | What it does |
| --- | --- |
| **Concept graph** | 66 concepts across 6 branches, connected by 67 prerequisite edges forming a DAG. |
| **Roadmap generator** | Rule-based, deterministic engine that scores topics, closes over prerequisites, topologically orders them, trims to your chosen length, and attaches a type-diverse resource set. |
| **Progress tracking** | Save roadmaps, mark topics *not started / in progress / completed*, see progress bars per roadmap and aggregated stats. |
| **Placement self-check** | 24 multiple-choice questions across the six branches infer the learner's level and interests, then prefill the roadmap wizard — so "current knowledge" is measured rather than self-declared. |
| **Sharing & export** | A revocable, read-only public link per roadmap, plus a print stylesheet so a roadmap can be saved as a PDF for a report. |
| **Notes & bookmarks** | Private per-topic notes and bookmarks, surfaced on the dashboard. |
| **Review queue** | Completed topics resurface on a widening schedule — 3, 7, 16, then 35 days — with a one-click "mark reviewed". |
| **Next steps & mastery** | "Up next" is derived from the prerequisite graph (only topics whose prerequisites are *all* completed); mastery is broken down per branch with a table alternative. |
| **Command palette** | ⌘K / Ctrl-K fuzzy search across every concept and page. |
| **Learning path overlay** | A "My progress" mode on the concept map: nodes coloured by your state, your completion order as numbered steps, prerequisites you crossed out of order drawn in red, and a single adherence figure. The accessible list view gains a matching column. |
| **Interactive concept map** | Hand-built SVG layered DAG with hover-to-trace, click-to-open, branch filters and zoom — keyboard navigable, with an equivalent list/table view. |
| **Problem bank** | Curated problems with difficulty, hints and revealable solutions, filterable by branch and level. |
| **Community contributions** | Submit resources and problems; everything enters a moderation queue. |
| **Voting** | Up/down vote resources; the viewer's own vote is preserved and drives ranking. |
| **Moderation** | Moderator/admin queue with approve/reject, rejection reasons and a full audit log. |
| **Administration** | Member list with role management, plus content browsing and deletion by status. |
| **Auth & roles** | JWT auth with four roles: `learner`, `contributor`, `moderator`, `admin`. |
| **Design** | Custom Tailwind design system, responsive, light + dark mode. |
| **Performance** | Route-level code splitting — each page is its own chunk (main bundle 286 → 204 KB). |

---

## Tech stack

Only the required stack is used:

- **Backend** — Node.js, Express, PostgreSQL (`pg`)
- **Frontend** — React (Vite), Tailwind CSS, React Router, hand-written SVG/vanilla JS
- **Auth** — JWT (HS256) and password hashing (scrypt), both implemented with Node's built-in `crypto`
  — no `jsonwebtoken` or `bcrypt` dependency.
- **Testing** — Node's built-in test runner (`node:test`)

Runtime dependencies are deliberately tiny: `express`, `pg`, `cors`, `dotenv` on the server;
`react`, `react-dom`, `react-router-dom` on the client.

---

## Repository layout

```
.
├── db/
│   ├── schema.sql            # tables, enums, indexes, trigger, views
│   └── seed/                 # 6 branches, 66 topics, 120 resources, 58 problems, demo users
├── server/
│   └── src/
│       ├── app.js            # express app assembly
│       ├── index.js          # http server + graceful shutdown
│       ├── config.js         # env loading
│       ├── db/               # pool, migrate, seed entrypoints
│       ├── lib/              # jwt, password, validation, errors, constants
│       ├── middleware/       # auth, error handler, rate limiter
│       ├── services/         # graph algorithms, roadmap engine, content queries
│       ├── routes/           # auth, branches, topics, graph, resources, problems,
│       │                     # roadmaps, moderation, admin, stats
│       └── tests/            # graph + engine unit tests, API smoke tests
├── client/
│   └── src/
│       ├── api/client.js     # fetch wrapper with bearer token + error normalisation
│       ├── context/          # auth + toast providers
│       ├── hooks/            # useFetch, useDebounced
│       ├── components/       # ui primitives, layout, cards, concept graph, timeline
│       ├── pages/            # 15 routes
│       └── lib/format.js     # labels, tones, formatters
└── docs/                     # architecture, schema, API reference
```

---

## Getting started

### Prerequisites

- **Node.js 18+** (developed on Node 26)
- **PostgreSQL 14+** running locally

### 1. Install dependencies

```bash
npm run install:all          # installs root, server and client dependencies
```

> Some machines configure npm to skip dev dependencies. This project ships an `.npmrc`
> (`include=dev`) next to each package so Vite and Tailwind always install.

### 2. Configure environment

```bash
cp .env.example .env
```

Then edit `.env` if your Postgres needs it:

```ini
DATABASE_URL=postgres://localhost:5432/mathmap
JWT_SECRET=change-me-to-a-long-random-secret-string
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
```

### 3. Create the database, schema and seed data

```bash
npm run db:setup             # creates the database, applies db/schema.sql, then seeds it
```

The seeder is idempotent — re-run it any time with `npm run db:seed` to reset to a clean demo state.

### 4. Run it

```bash
npm run dev                  # API on :4000 and the React app on :5173
```

Open **http://localhost:5173**.

Prefer separate terminals? `npm run dev:server` and `npm run dev:client`.

---

## Demo accounts

All seeded users share the password **`mathmap123`**.

| Email | Role | Use it to |
| --- | --- | --- |
| `admin@mathmap.dev` | admin | manage roles, delete content, everything moderators can do |
| `moderator@mathmap.dev` | moderator | review the submission queue |
| `contributor@mathmap.dev` | contributor | see prior contributions on the dashboard |
| `priya@mathmap.dev` | learner | see 3 saved roadmaps with partial progress |

---

## How the roadmap engine works

`server/src/services/roadmapEngine.js` is the core of the product and is deliberately explainable —
the same input always produces the same roadmap.

1. **Candidates** — topics from the selected branches.
2. **Score** each topic:
   `3·tagOverlap + 2·branchMatch + 1.5·normalisedCommunityVotes − 2·|difficulty − targetLevel| + 1.5·goalKeywordBonus`.
3. **DAG closure** — take the top-scoring slice, then add every transitive prerequisite so the path is
   always learnable in order.
4. **Order** — Kahn topological sort with deterministic tie-breaks (score → difficulty → title).
5. **Trim** — remove the lowest-scoring *leaves* until the requested length is reached, which can never
   orphan a prerequisite.
6. **Attach resources** — for each topic, guarantee type diversity (one video, one article, one
   interactive, one practice item where available), then fill remaining slots by community votes.

The result is persisted as a `roadmaps` row plus ordered `roadmap_items`.

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run install:all` | install all dependencies |
| `npm run db:migrate` | create the database and apply `db/schema.sql` |
| `npm run db:seed` | reset and load the demo content library |
| `npm run db:setup` | migrate + seed |
| `npm run dev` | run API and web app together |
| `npm run build` | production build of the client |
| `npm test` | run the server test suite |

---

## Testing

```bash
npm test
```

Covers:

- **Graph algorithms** — adjacency, transitive closure, cycle detection, topological order, layering.
- **Roadmap engine** — prerequisite-respecting order, resource-type diversity, deterministic output,
  length control that never drops prerequisite roots, empty-input handling.
- **API** — health, catalog, graph, roadmap preview, auth round-trip, and role enforcement on the
  moderation queue.

---

## Documentation

- [`docs/architecture.md`](docs/architecture.md) — module map and data flow
- [`docs/schema.md`](docs/schema.md) — database reference
- [`docs/api.md`](docs/api.md) — HTTP API reference
- [`docs/chat-history.md`](docs/chat-history.md) — transcript of the build conversation
- [`docs/security-review.md`](docs/security-review.md) — pentest results and the fixes applied

---

## Security notes

- Passwords hashed with `scrypt` and a per-user random salt; verification is timing-safe, and a failed
  login for an unknown account performs the same work so it can't be used to enumerate users.
- JWTs signed with HMAC-SHA256 and verified with a constant-time comparison. The verifier ignores the
  token header's `alg`, so `alg: none` forgery is structurally impossible. Roles are re-read from the
  database on every request, so a permission change takes effect immediately.
- Every SQL query is parameterised (no string interpolation of user input).
- Role checks are enforced server-side via `requireRole`, not just hidden in the UI.
- Bearer tokens rather than cookies, so the API is not CSRF-able.
- Security headers (CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, HSTS) on all API responses.
- Rate limiting on auth (30/min), registration (10/min), roadmap generation (40/min) and a 600/min
  global backstop. Set `TRUST_PROXY=1` when running behind a reverse proxy.
- Errors never leak upstream messages: 5xx responses are generic in production.
- Submissions always enter `pending`; `status` cannot be set by a client.
- The demo seeder refuses to load demo accounts into a non-local database (override with
  `ALLOW_DEMO_SEED=true`, e.g. when seeding a hosted instance).

A full black-box review — 53 checks covering injection, access control, JWT forgery, XSS, mass
assignment and abuse of business logic — is written up in
[`docs/security-review.md`](docs/security-review.md).

Accessibility is verified with **axe-core** against WCAG 2.0 / 2.1 / 2.2 A + AA on every route:
**0 violations across all 14 routes**, with keyboard-reachable concept-map nodes, per-toast live
regions, programmatically linked form errors, a skip link and reduced-motion support.
