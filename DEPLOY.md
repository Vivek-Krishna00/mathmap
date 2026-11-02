# Deploying MathMap

The app ships as **one container**: Express serves `/api` *and* the built React client,
with an SPA fallback for client routes. One origin means no CORS, no second URL to
configure, and one Cloud Run service to map a domain onto.

Verified locally end to end: image builds, container runs, login works, deep links
serve the SPA, `/api/*` keeps returning JSON 404s, and the browser reports no CSP
violations.

---

## Where the database lives

| Setup | Persists? | Use it when |
| --- | --- | --- |
| Cloud Run + **managed** Postgres (Cloud SQL / Neon / Supabase) | yes | Cloud Run, any environment |
| Cloud Run + Postgres **inside the container** | **no** | never |
| VPS + `docker compose` (app + Postgres + a named volume) | yes | self-hosting on one box |

**Do not bundle Postgres into the Cloud Run image.** Cloud Run gives each instance an
ephemeral filesystem and scales to zero when idle. A database inside the container
therefore:

- loses every row when the instance stops, restarts, or is redeployed;
- gives each of two instances its own separate database, so a user's data depends on
  which one answers the request;
- makes cold starts far slower, and re-seeding on boot would truncate on every start —
  destroying roadmap share tokens, which is the exact failure hit earlier in this project.

The filesystem is only durable when something keeps it: a **volume** on a host, or a
**managed** database. Not a stateless container.

---

## 1. What runs where

| Piece | Where |
| --- | --- |
| Express API | the container, `node src/index.js`, listens on `$PORT` (8080) |
| React client | built in the image, served by Express from `/assets` (immutable cache) |
| PostgreSQL | managed: Cloud SQL, Neon or Supabase |

The container is stateless. It writes nothing to disk and holds no session state,
so it can scale or restart freely.

---

## 2. Create the database

### Option A — Cloud SQL (GCP-native, paid)

```bash
gcloud sql instances create mathmap-db \
  --database-version=POSTGRES_16 --tier=db-f1-micro --region=asia-south1
gcloud sql databases create mathmap --instance=mathmap-db
gcloud sql users set-password postgres --instance=mathmap-db --password='CHOOSE-A-STRONG-ONE'
```

Connection string over the Unix socket that Cloud Run mounts:

```
postgresql://postgres:PASSWORD@/mathmap?host=/cloudsql/PROJECT:asia-south1:mathmap-db
```

Deploy must then include `--add-cloudsql-instances=PROJECT:asia-south1:mathmap-db`.

### Option B — Neon / Supabase (free tier, works after the trial)

```
postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require
```

Supabase caveat: the direct hostname is IPv6-only and Cloud Run egress is IPv4, so
use the **Supavisor pooler** (port `6543`), not the direct connection.

### Apply the schema

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/schema.sql
```

> `db/schema.sql` **drops and recreates** every application object. Never run it
> against a database that holds data you want to keep.
>
> `npm run db:migrate` also exists, but it attempts `CREATE DATABASE` through the
> `postgres` maintenance database, which many managed providers disallow. Creating
> the database in the provider's console and applying `schema.sql` is the portable route.

### Seed once (demo content)

```bash
docker run --rm \
  -e DATABASE_URL="$DATABASE_URL" \
  -e ALLOW_DEMO_SEED=true \
  mathmap:local node src/db/seed.js
```

> The seed **truncates** every table and is guarded: it refuses any non-local host
> unless `ALLOW_DEMO_SEED=true`. **Never** put it in the container's start command —
> it would wipe the database on every cold start and destroy every share token.

---

## 3. Deploy to Cloud Run

Values used throughout: service `mathmap`, region **`asia-south1`** (Mumbai), domain
**`vivekbuilds.tech`**. Domain mappings are regional, so the service and the mapping
must live in the same region.

```bash
export PROJECT_ID=your-project-id
export REGION=asia-south1
gcloud config set project "$PROJECT_ID"

# one-time: keep the JWT signing key out of the image and out of the console
openssl rand -hex 32 | gcloud secrets create mathmap-jwt --data-file=-

gcloud run deploy mathmap \
  --source . \
  --region "$REGION" \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi --cpu 1 \
  --min-instances 0 --max-instances 2 \
  --set-env-vars "NODE_ENV=production,TRUST_PROXY=1,CLIENT_ORIGIN=https://vivekbuilds.tech,https://www.vivekbuilds.tech" \
  --set-env-vars "DATABASE_URL=postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require" \
  --set-secrets JWT_SECRET=mathmap-jwt:latest
```

On the **Cloud SQL** path only, add
`--add-cloudsql-instances=$PROJECT_ID:$REGION:mathmap-db` and switch `DATABASE_URL` to the
socket form (`...@/mathmap?host=/cloudsql/$PROJECT_ID:$REGION:mathmap-db`).

`--source .` builds the included `Dockerfile` with Cloud Build and prints the
`*.run.app` URL. Check that URL **before** touching DNS:

```bash
curl https://mathmap-HASH-REGION.a.run.app/api/health   # expect {"status":"ok","db":"up"}
```

Environment variables that matter:

| Variable | Value here | Why |
| --- | --- | --- |
| `NODE_ENV` | `production` | enables HSTS and generic 5xx bodies |
| `TRUST_PROXY` | `1` | Cloud Run terminates TLS; without this every client shares one rate-limit bucket |
| `CLIENT_ORIGIN` | `https://vivekbuilds.tech,https://www.vivekbuilds.tech` | CORS allow-list (comma-separated; verified both are echoed and unknown origins are not) |
| `JWT_SECRET` | Secret Manager | changing it signs everyone out |
| `DATABASE_URL` | provider string | |
| `ALLOW_DEMO_SEED` | **unset** | the demo-account shortcut stays off in production |

---

## 4. Custom domain — `vivekbuilds.tech`

### 4.1 Prove ownership (Search Console)

Cloud Run refuses to map a domain you have not verified. Sign in with the account
that owns the Cloud project.

1. Search Console → **Add property** → choose **Domain** (not "URL prefix").
2. Enter `vivekbuilds.tech`. Google shows a `google-site-verification=...` TXT value.
3. Add it at the DNS panel:

   | Type | Name | Value | TTL |
   | --- | --- | --- | --- |
   | TXT | `@` | `google-site-verification=...` | 300 |

4. Back in Search Console, press **Verify**.

### 4.2 Create the mappings

```bash
gcloud run domain-mappings create --service mathmap --domain vivekbuilds.tech --region "$REGION"
gcloud run domain-mappings create --service mathmap --domain www.vivekbuilds.tech --region "$REGION"

# the authoritative record list for your mapping
gcloud run domain-mappings describe \
  --service mathmap --domain vivekbuilds.tech --region "$REGION"
```

### 4.3 DNS records

**Apex — `vivekbuilds.tech`.** Google's documented addresses behind
`ghs.googlehosted.com`; confirm them against the `describe` output above before saving.

| Type | Name | Value | TTL |
| --- | --- | --- | --- |
| A | `@` | `216.239.32.21` | 300 |
| A | `@` | `216.239.34.21` | 300 |
| A | `@` | `216.239.36.21` | 300 |
| A | `@` | `216.239.38.21` | 300 |
| AAAA | `@` | `2001:4860:4802:32::15` | 300 |
| AAAA | `@` | `2001:4860:4802:34::15` | 300 |
| AAAA | `@` | `2001:4860:4802:36::15` | 300 |
| AAAA | `@` | `2001:4860:4802:38::15` | 300 |

**`www`** — a single record:

| Type | Name | Value | TTL |
| --- | --- | --- | --- |
| CNAME | `www` | `ghs.googlehosted.com` | 300 |

Use `@` (or a blank name) for the apex. If the panel demands a fully qualified name,
write `vivekbuilds.tech.` and `www.vivekbuilds.tech.` with the trailing dot.

### 4.4 Wait for the certificate

```bash
# has DNS propagated?
dig +short vivekbuilds.tech A
dig +short www.vivekbuilds.tech CNAME

# has Google issued the managed certificate?
gcloud run domain-mappings describe \
  --service mathmap --domain vivekbuilds.tech --region "$REGION" \
  --format='value(status.conditions)'
```

`CertificateProvisioned` turns `True` when DNS resolves and the certificate is issued —
usually minutes, documented up to 24 hours. Until then the domain serves an error; the
`*.run.app` URL keeps working throughout.

### 4.5 Notes for this provider

- In the get.tech / namify panel the section is **DNS Management** (sometimes "Manage
  DNS" or "DNS Zone"). The records above go there.
- If the domain's nameservers have been delegated to another provider, the records must
  be created **where the nameservers point**, not at the registrar. Check:
  `dig +short NS vivekbuilds.tech`.
- Do **not** switch on any registrar-level "URL forwarding" or "web redirect" for the
  apex. It overrides the A records and the mapping will never validate.
- Leave TTL at 300 while setting up, then raise it once the site is live.

---

## 5. Operational notes

- **Rate limiting is in memory**, so it is per instance. With `--max-instances 2` the
  effective limit doubles. Fine for a demo; a shared store would be needed for real.
- **`--min-instances 0`** means a cold start on the first request after idle. Set it to
  `1` for a viva or demo slot (costs money, removes the wait).
- **Trial credit**: ₹28,007 over 82 days. Cloud Run has a permanent free tier; Cloud SQL
  does **not** (~$8-10/month for `db-f1-micro`). Neon/Supabase free Postgres keeps the
  whole deployment at zero cost once the trial ends.
- **Health check**: `GET /api/health` returns `{"status":"ok","db":"up"}` only when the
  database is reachable — useful as a Cloud Run readiness probe and for a quick smoke test.

## 6. Self-contained stack: app + Postgres on one box

`docker-compose.yml` runs both services with a named volume, so the database lives
inside Docker *and* survives restarts. This is the correct way to do what "pack the
database into the container" is aiming at — and it needs a host that keeps its disk,
such as a VPS. It is not a Cloud Run deployment.

```bash
cp .env.compose.example .env.compose
sed -i '' "s|^MATHMAP_DB_PASSWORD=.*|MATHMAP_DB_PASSWORD=$(openssl rand -hex 16)|" .env.compose
sed -i '' "s|^MATHMAP_JWT_SECRET=.*|MATHMAP_JWT_SECRET=$(openssl rand -hex 32)|" .env.compose

npm run stack:up                       # build + start app and db
docker compose --env-file .env.compose exec -T db psql -U mathmap -d mathmap -f - < db/schema.sql
docker compose --env-file .env.compose run --rm -e ALLOW_DEMO_SEED=true app node src/db/seed.js

npm run stack:down                     # stop (add -v to also delete the data volume)
```

The `MATHMAP_` prefix keeps these variables from silently picking up the development
values in the repository's `.env`. `.env.compose` is gitignored; only the `.example`
is tracked.

**Verified**: with the volume, a `down` + `up` cycle (both containers destroyed and
recreated) leaves the data intact — a marker row and all 66 topics, 124 resources and
12 users survived. Removing the volume with `down -v` and starting again gives
`relation "topic_notes" does not exist`: the volume is what carries the data, and that
is precisely what Cloud Run does not provide.

Trade-offs on a VPS: you own backups, patching and monitoring, and a single box is a
single point of failure. For a project submission that is a reasonable trade; for
anything real, the managed database is worth the money.

## 7. Local rehearsal

The exact sequence used to verify this guide, against a throwaway Postgres:

```bash
docker network create mathmap-net
docker run -d --name mathmap-db --network mathmap-net \
  -e POSTGRES_PASSWORD=pass -e POSTGRES_DB=mathmap postgres:16-alpine
docker exec -i mathmap-db psql -U postgres -d mathmap -f - < db/schema.sql

docker build -t mathmap:local .
docker run --rm --network mathmap-net \
  -e DATABASE_URL=postgres://postgres:pass@mathmap-db:5432/mathmap \
  -e ALLOW_DEMO_SEED=true mathmap:local node src/db/seed.js

docker run -d --name mathmap --network mathmap-net -p 8080:8080 \
  -e DATABASE_URL=postgres://postgres:pass@mathmap-db:5432/mathmap \
  -e JWT_SECRET=local-secret -e NODE_ENV=production -e TRUST_PROXY=1 \
  mathmap:local
```

---

## 8. Go-live checklist

Work through it in this order; each step has an observable check.

- [ ] `gcloud services enable run.googleapis.com cloudbuild.googleapis.com` (and
      `secretmanager.googleapis.com`, `sqladmin.googleapis.com` on the Cloud SQL path)
- [ ] Database created; `db/schema.sql` applied (**it drops and recreates every object**)
- [ ] Seeded **once** from a workstation or one-off container, never from `CMD`
- [ ] `JWT_SECRET` created in Secret Manager and referenced with `--set-secrets`
- [ ] Service deployed; `curl .../api/health` returns `{"status":"ok","db":"up"}`
- [ ] Login works on the `*.run.app` URL **before** DNS is touched
- [ ] Domain verified in Search Console (TXT record)
- [ ] Domain mappings created for apex and `www`
- [ ] A / AAAA / CNAME records added, matching `domain-mappings describe`
- [ ] `dig +short vivekbuilds.tech A` returns the four Google addresses
- [ ] `CertificateProvisioned` is `True`
- [ ] `https://vivekbuilds.tech` loads, login works, and a share link opens
      (share URLs are built from `window.location.origin`, so they pick up the domain
      with no configuration)
- [ ] `CLIENT_ORIGIN` covers both hosts — already set above
- [ ] Confirm the seed is **not** in any start command

Nothing here is automated on purpose: every step creates billable cloud resources or
changes public DNS, and both are worth a deliberate keystroke.

