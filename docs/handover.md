# MathMap — handover

Context for whoever (or whatever) picks this up next. Read this before touching anything: it records
state that is not recoverable from the code, and traps that have already bitten once.

Last updated: after the Cloud Run deployment and the custom-domain cutover.

---

## 1. What this is

**MathMap** — a community-driven platform that generates a personalised mathematics learning roadmap.
A learner states a goal, the roadmap engine orders the concepts by prerequisite, and each concept
carries curated resources plus a problem bank. Progress, notes, review scheduling, placement and
sharing are all built.

It is an **academic major project**. Grading depends on a chat history (`docs/chat-history.md`) and a
live demo, so keep that document current and keep the deployment working.

---

## 2. Live

| | |
| --- | --- |
| Custom domain | **https://mathmap.vivekbuilds.tech** (Google-managed cert, valid to 31 Jan 2027) |
| Cloud Run URL | `https://mathmap-363993004850.asia-southeast1.run.app` |
| Service | `mathmap`, project `project-1fba041d-5a2a-46ea-a94`, region **`asia-southeast1`** |
| Runtime SA | `363993004850-compute@developer.gserviceaccount.com` |
| Limits | 512 Mi, 1 vCPU, `min-instances 0`, `max-instances 2`, unauthenticated |
| Secrets | `mathmap-jwt`, `mathmap-db-url` (both in Secret Manager) |

Region is Singapore deliberately: the Neon database is in `ap-southeast-1`, and a page issues several
queries, so the app sits beside the database rather than beside the user.

---

## 3. Stack, and the rule about it

Node + Express, PostgreSQL, React + Vite + Tailwind, plain CSS. **The stack is closed** — this was a
project constraint, and several attractive libraries were rejected for it:

| Rejected | Why | What was built instead |
| --- | --- | --- |
| Prisma | breaks the stack constraint; views, triggers and a GIN index would still need raw SQL | raw SQL in `server/src/services`, `db/schema.sql` |
| KaTeX | content has no LaTeX — it would have been a dependency for six matrix strings | `client/src/components/MathText.jsx` |
| React Flow | heavy, and a force layout loses prerequisite order | hand-rolled `ConceptGraph` / `GoalsGraph` SVG |
| AI in the core | the spec asks for a recommendation engine, not an LLM; determinism, testability and explainability matter more at a viva | deterministic scoring in `roadmapEngine.js` |

**The roadmap engine is the source of truth.** Anything that ever gets added must not emit edges,
ordering or DAG structure. Model output goes behind a flag and falls back to deterministic behaviour.

---

## 4. Repository map

```
db/schema.sql            15 tables, 3 views, 5 enums, 1 trigger, GIN-indexed tags
db/seed/                 branches, topics (66-topic DAG), resources, problems, users, tracks, placement
server/src/app.js        createApp() exported without listen() — serverless friendly
server/src/config.js     env loading, proxy trust, origins
server/src/db/pool.js    pg Pool + query/one/many/tx helpers
server/src/services/     roadmapEngine, graph, goals, learningPath, nextSteps, placement, contentService
server/src/routes/       17 route modules
server/src/tests/        50 tests (node:test)
client/src/components/   ConceptGraph, GoalsGraph, GraphList, ResourceCard, TopicNotes, MathText, …
client/src/pages/        19 pages
docs/                    api, architecture, schema, security-review, chat-history
```

---

## 5. Running it locally

```bash
npm run install:all                 # root + server + client
npm run dev                         # api :4000, web :5173
npm test                            # 50 tests
npm run build                       # client production build
```

**Read `.env` before you trust it.** It currently points `DATABASE_URL` at the **hosted Neon**
database, not a local Postgres, because `neon init` wrote there. So local development exercises
production data. `DATABASE_URL_UNPOOLED` holds the direct endpoint for schema and seed work.

---

## 6. Database

Neon project `floral-rain-12601565`, org `org-bitter-cake-13204860`, branch `production`, region
`aws-ap-southeast-1`, PostgreSQL **18.6**, database **`neondb`**.

Two endpoints, and using the wrong one bites:

| Variable | Host shape | Use for |
| --- | --- | --- |
| `DATABASE_URL` | `…-pooler.…` | the app (PgBouncer, transaction mode) |
| `DATABASE_URL_UNPOOLED` | no `-pooler` | `psql`, schema, seeding |

Seeded state: **6 branches, 66 topics, 124 resources** (120 approved + 4 pending), **61 problems**
(58 approved + 3 pending), **12 members, 737 votes, 3 roadmaps**.

### Two destructive commands, both real traps

```bash
psql "$DATABASE_URL_UNPOOLED" -v ON_ERROR_STOP=1 -f db/schema.sql   # DROPS and recreates everything
DATABASE_URL="$DATABASE_URL_UNPOOLED" ALLOW_DEMO_SEED=true npm run db:seed   # TRUNCATES every table
```

Both have already destroyed data once. `TRUNCATE` wiped roadmaps and share tokens, which is exactly
why **seeding must never appear in the container's start command**. The seed also refuses any non-local
host unless `ALLOW_DEMO_SEED=true`, keyed off the database *host* rather than `NODE_ENV`.

---

## 7. Deploying

Full runbook in `DEPLOY.md`. The short version:

```bash
gcloud run deploy mathmap --source . --region asia-southeast1 \
  --project project-1fba041d-5a2a-46ea-a94 \
  --allow-unauthenticated --port 8080 --memory 512Mi --cpu 1 \
  --min-instances 0 --max-instances 2 \
  --env-vars-file cloudrun-env.yaml \
  --set-secrets JWT_SECRET=mathmap-jwt:latest,DATABASE_URL=mathmap-db-url:latest
```

Two things that cost time to discover:

- **`--set-env-vars` cannot carry a comma-separated value.** `CLIENT_ORIGIN=https://a,https://b` is
  split into separate dict entries and the deploy dies with `Bad syntax for dict arg`. Use
  `--env-vars-file`.
- **`--source` builds need IAM.** The Compute Engine default service account needs
  `storage.objectViewer`, `artifactregistry.writer` and `logging.logWriter`, or the build fails with
  `storage.objects.get denied` even when the account holds `roles/owner`.

Domain mappings for a fully managed service live under **`gcloud beta run domain-mappings`** (install
the `beta` component). DNS is hosted at **dns.host**, not at the registrar get.tech — the subdomain is
one record: `mathmap CNAME ghs.googlehosted.com.`

---

## 8. Verification bar

Nothing is "done" until these pass:

```bash
npm test                              # expect 50/50
npm run build                         # must compile
curl -s https://mathmap.vivekbuilds.tech/api/health   # {"status":"ok","db":"up"}
```

Plus an axe sweep, which has been the accessibility baseline from early on:

```bash
agent-browser a11y "https://mathmap.vivekbuilds.tech/" \
  --tags wcag2a,wcag2aa,wcag21a,wcag21aa --json
```

**0 violations is the current standard.** For comparison, geogebra.org reports 4 (six contrast
failures, a critical unlabelled control, two unnamed links, an unfocusable scroll region). Keep it.

---

## 9. Design decisions worth preserving

- **Palette**: deep azure brand, amber accent, cool paper. Purple gradients were removed on purpose —
  they read as AI-generated. One muted plum survives as a data colour for Number Theory.
- **Branch colours are markers, not text colours.** Labels always use readable ink; the coloured dot
  carries identity. This fixed contrast regressions systemically.
- **Motion is purposeful** and collapses under `prefers-reduced-motion`: route fade, count-up stats,
  progress fill, graph draw-in, scroll reveal.
- **Density is a feature.** The home page was 3713px with 29 cards and 505 words; it is now 2105px
  with 10 cards and 308 words, because a reviewer said it felt like information overload.
- **Accessibility is part of the product**: focusable graph nodes, a list/table alternative to the
  graph, `aria-live` toasts, linked form errors, skip link, print stylesheet.
- **`client/.env.production` sets `VITE_SHOW_DEMO_LOGINS=true`.** Vite only reads
  `.env.development` in dev mode, which is why the demo chips were absent from the deployed site.

---

## 10. Open items

1. **Rotate the Neon password.** It was echoed into a terminal during a verification command and is in
   that session's logs. The running service still authenticates with it.

   ```bash
   printf '%s' '<new-url>' | gcloud secrets versions add mathmap-db-url --data-file=-
   gcloud run services update mathmap --region asia-southeast1 \
     --update-secrets DATABASE_URL=mathmap-db-url:latest
   ```

2. **Turn off the demo logins after the viva.** `VITE_SHOW_DEMO_LOGINS=true` in a production build
   puts a one-click admin login on a public URL. Set it to `false` and redeploy.
3. **The `asd` GitHub repo is stale.** It holds a reconstructed 64-commit history
   (`github.com/Vivek-Krishna00/asd`) built from an earlier snapshot; the deployment work is not in it.
   Your local repo's real history is separate. Regenerating it means a force-push.
4. **Rate limiting is in memory**, so it is per instance. Fine for a demo, not for anything real.
5. **`min-instances 0`** means a cold start on the first request after idle. Pin one instance for a
   demo slot if the wait is unacceptable.
6. **There is one real signup in the database** (`vaibhav.s42250@gmail.com`, "BeniksonTales") from
   testing the live site. It is not seed data. Do not wipe it.

---

## 11. Already fixed, do not re-fix

- The smoke test used to register a user and leave it behind, which polluted whatever database
  `DATABASE_URL` pointed at (twice on Neon). It now deletes its own account in a `finally` block.
- `.env.local` was not being read by the server, so a `neon deploy` that wrote there would have been
  silently ignored. `server/src/config.js` now loads `.env`, `server/.env`, `.env.local` and
  `server/.env.local`, with `.local` taking precedence.
- Scroll-revealed content sat at `opacity: 0`, so printing or full-page capture came out blank. Print
  styles now force `.reveal` visible.

---

## 12. Reference

| Document | Contents |
| --- | --- |
| `docs/chat-history.md` | the full conversation, required for submission — **keep it updated every turn** |
| `DEPLOY.md` | deployment runbook, DNS, domain mapping, go-live checklist |
| `docs/api.md` | every endpoint |
| `docs/schema.md` | data model |
| `docs/architecture.md` | module layout and data flow |
| `docs/security-review.md` | pentest findings, fixes, and the risks knowingly accepted |

Accepted risks are documented in `docs/security-review.md`: JWTs in `localStorage` with a 7-day
expiry and no server-side revocation, and account enumeration via `409` on registration.
