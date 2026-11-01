# Security review — MathMap API

**Type:** authorised black-box + white-box review of a locally running instance.
**Scope:** the Express API (`/api/*`), authentication, authorisation, input handling, and the
client's rendering of untrusted content.
**Out of scope:** infrastructure hardening, TLS configuration, the hosting platform, physical access,
and denial-of-service at the network layer.
**Method:** a scripted harness (`53 checks`) driven against a live instance seeded with demo data,
using four accounts at different privilege levels — `learner`, `contributor`, `moderator`, `admin` —
plus unauthenticated requests. Findings were fixed and the harness was re-run to confirm each one closed.

**Result:** 53 checks — **51 defended, 2 accepted risks, 0 open vulnerabilities.**

---

## Summary

| # | Finding | Severity | Status |
| --- | --- | --- | --- |
| 1 | Unauthenticated 500 + Postgres error disclosure via negative pagination | Medium | **Fixed** — pagination clamped in `contentService` |
| 2 | Unauthenticated DoS on `POST /roadmaps/preview` (unlimited engine runs) | Medium | **Fixed** — 40/min per IP + 600/min global backstop |
| 3 | Demo accounts share a published password, one of them admin, with one-click admin login in the UI | Medium | **Fixed** — the seeder refuses any non-local database; login shortcuts are dev-only |
| 4 | Oversized integer path id → 500 leaking `value "…" is out of range for type integer` | Low | **Fixed** — `int()` validator now caps at the Postgres integer range → 400 |
| 5 | Missing security headers (CSP, X-Frame-Options, nosniff, HSTS, Referrer-Policy) | Low | **Fixed** — new `securityHeaders` middleware on `/api` |
| 6 | 5xx responses echoed raw upstream error messages | Low | **Fixed** — generic message in production, real cause logged server-side |
| 7 | Account enumeration: distinct `409` on register, and login timing oracle | Low | **Partly fixed** — login timing equalised; the `409` is an accepted trade-off for usable signup |
| 8 | Voting on non-approved resources, and self-voting on own submission | Low | **Fixed** — vote requires `status = 'approved'` and rejects the submitter |
| 9 | Long-lived JWT in `localStorage` with no server-side revocation or logout | Medium | **Accepted** — see Accepted risks |
| 10 | No account lockout after repeated failed logins | Low | **Accepted** — mitigated by the auth rate limiter |
| 11 | `trust proxy` unconfigured → behind a reverse proxy every client shares one rate-limit bucket | Low | **Fixed** — `TRUST_PROXY` env var, off by default |

---

## What held up

These were attacked directly and did not break.

### SQL injection — all payloads parameterised

```
GET /api/topics?search=' OR 1=1--
GET /api/topics?search='; DROP TABLE topics;--
GET /api/topics?search=%' UNION SELECT null--
GET /api/topics?search=1; SELECT pg_sleep(3)--
GET /api/topics?branch=' OR 1=1--
GET /api/topics?tag=' OR '1'='1
GET /api/topics/la-vectors' OR 1=1--
POST /api/auth/login  {"email":"' OR 1=1--","password":"x"}
```

All returned normal responses; `topics` still held its 66 rows afterwards. Every query uses bound
parameters. The two places that interpolate an identifier — `UPDATE ${cfg.table}` in moderation and
`DELETE FROM ${table}` in admin — take their value from a hard-coded whitelist, never from user input.

### Broken access control — RBAC and IDOR

| Attempt | Result |
| --- | --- |
| learner → `GET /admin/users` | `403` |
| learner → `GET /admin/content` | `403` |
| learner → `GET /moderation/queue` | `403` |
| learner → `POST /moderation/resource/1/approve` | `403` |
| moderator → `GET /admin/users` | `403` |
| read another user's roadmap | `403` |
| `PATCH` another user's roadmap item | `403` |
| `DELETE` another user's roadmap | `403` |
| admin demotes their own account | `400` |

Role checks live in middleware on the route, not in the UI, so hiding a button is never the control.

### JWT handling — forgery attempts rejected

| Attempt | Result |
| --- | --- |
| No `Authorization` header | `401` |
| Non-JWT garbage token | `401` |
| `alg: none` forgery with an admin payload | `401` |
| Valid learner token with a tampered payload claiming `role: admin` | `401` |
| Token with an empty signature | `401` |

The verifier ignores the header's `alg` entirely and always recomputes HMAC-SHA256 with its own key,
so `alg: none` and algorithm-confusion are structurally impossible. Signature comparison is
constant-time. **Role claims are also re-read from the database on every request**, so a role change
takes effect immediately rather than waiting for the token to expire.

### Mass assignment / privilege escalation by field injection

```
POST /api/resources  { ..., "status": "approved", "submitted_by": 1 }
POST /api/problems   { ..., "status": "approved" }
```
Both were stored as `pending`. `status` is hard-coded server-side and there is no route that lets a
client update it; a submission cannot promote itself past moderation.

### Stored XSS

An HTML payload was submitted as a resource title:

```html
<img src=x onerror=alert(1)>"><script>alert(2)</script>
```

It was stored verbatim (no silent mangling), so the risk moves to render time — and the moderator view
that displays pending submissions was loaded in a real browser:

```
injectedImgElements: 0
payloadVisibleAsText: true
page errors: none
```

React escapes text children by default, so the payload renders as visible literal text. No element was
created and no handler fired. Submission URLs are separately restricted to `http:`/`https:` —
`javascript:`, `data:` and `file:` payloads are all rejected with `400`.

### CSRF

Not applicable by construction: the API authenticates with a bearer token in the `Authorization`
header, not a cookie, so a cross-site form post carries no credentials. CORS is an exact-match origin
allowlist with no wildcard and no credentials.

---

## Accepted risks

### A1 — JWT stored in `localStorage`, 7-day expiry, no revocation (Medium)

**Why it is accepted:** a stolen token is valid until it expires and logout is client-side only, so
there is no way to kill a session server-side. This is the standard trade-off for a token-based SPA
with no session store.

**Why it is tolerable here:** the only viable theft vector is XSS, and the XSS review above found the
app escapes untrusted content. It is a real risk the moment any future feature renders raw HTML.

**If you want to close it:** move to an httpOnly, `SameSite=Lax` cookie (which then requires CSRF
tokens), add a `token_version` column bumped on logout/password change, and shorten the expiry with a
refresh flow.

### A2 — Account enumeration via `409` on register (Low)

`POST /auth/register` with a known email returns `409 "An account with that email already exists"`,
which reveals whether an address is registered. Returning an identical response to both cases is the
strict fix, but it makes signup UX worse (the user is left guessing why nothing happened). Mitigated by
the 10-requests-per-minute register limit. The **login timing oracle was fixed** — a missing account now
performs the same dummy scrypt work, and measured latency went from `25ms vs 2ms` to `24ms vs 24ms`.

### A3 — No account lockout (Low)

Repeated failed logins are throttled (30/min/IP) but never lock the account, so a slow distributed
credential-stuffing attempt is possible. Acceptable for this scope; a production system would add
exponential backoff or a lockout with an alert.

---

## Reproduction

The checks can be repeated with the API running (`npm run dev:server`). Representative commands:

```bash
# SQL injection attempt — returns normal results, not an error
curl -s "localhost:4000/api/topics?search='%20OR%201=1--"

# Pagination clamp — clamped, no 500
curl -s -o /dev/null -w '%{http_code}\n' "localhost:4000/api/resources?limit=-1"

# Oversized id — 400, no driver error
curl -s -o /dev/null -w '%{http_code}\n' localhost:4000/api/problems/99999999999999999999

# Security headers on API responses
curl -sD - -o /dev/null localhost:4000/api/stats | grep -i 'content-security\|x-frame\|nosniff'

# Preview throttle — first 40 pass, then 429
for i in $(seq 1 45); do
  curl -s -o /dev/null -w '%{http_code} ' -X POST localhost:4000/api/roadmaps/preview \
    -H 'Content-Type: application/json' -d '{"branchIds":[1],"level":"beginner","length":"short"}'
done; echo
```

---

## Changes made as a result

| File | Change |
| --- | --- |
| `server/src/services/contentService.js` | `pageParams()` clamps `LIMIT`/`OFFSET` to safe non-negative integers |
| `server/src/lib/validate.js` | `int()` now defaults to a max of the Postgres integer range |
| `server/src/middleware/securityHeaders.js` | **New.** CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, CORP, HSTS in production |
| `server/src/middleware/errorHandler.js` | 5xx returns a generic message; the real cause is logged, never returned |
| `server/src/app.js` | Security headers + global rate-limit backstop; `trust proxy` wired to config |
| `server/src/config.js` | `TRUST_PROXY` (off by default, so `X-Forwarded-For` cannot be spoofed) |
| `server/src/routes/auth.routes.js` | Dummy scrypt verification removes the login timing oracle |
| `server/src/routes/roadmaps.routes.js` | 40/min limiter on generation and preview |
| `server/src/routes/resources.routes.js` | Votes require an approved resource and reject self-voting |
| `db/seed/index.js` | Refuses to seed shared-password demo accounts into a non-local database; override with `ALLOW_DEMO_SEED=true` |
| `client/src/pages/Login.jsx` | Demo-credential shortcuts render only under `import.meta.env.DEV` |
| `.env.example` | Documents `TRUST_PROXY` |

All 21 application tests still pass and the client still builds after these changes.

---

## Residual recommendations

1. **Rotate `JWT_SECRET` before any real deployment**, and never commit `.env` (it is gitignored).
2. **Set `NODE_ENV=production`** — it controls both generic error responses and HSTS.
3. **Set `TRUST_PROXY=1`** when running behind nginx, Dokploy/Traefik or a PaaS load balancer.
4. **Never run `db:seed` against a production database.** The seeder now refuses any non-local host
   unless `ALLOW_DEMO_SEED=true` is set explicitly — note that overriding this is how you would seed a
   hosted instance like Neon, so only do it deliberately. The guard checks the database host rather
   than `NODE_ENV`, because a stray `NODE_ENV=production` in a developer shell must not block local
   work, while pointing `DATABASE_URL` at a hosted instance is the case that actually needs stopping.
5. Consider adding `helmet` and `express-rate-limit` if the dependency constraint is ever relaxed;
   the hand-rolled equivalents here are deliberately minimal.
