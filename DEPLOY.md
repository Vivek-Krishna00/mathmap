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

**Chosen setup: Neon free tier.** Cloud SQL is documented below for completeness but is
not used — it is the one piece with no free tier (~$8-10/month), so it would spend the
trial credit while Neon costs nothing permanent.

### Option A — Cloud SQL (GCP-native, paid — not used here)

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

### Option B — Neon (chosen)

Create the project in the Neon console. Two connection strings are offered, and the
difference matters:

| Endpoint | Hostname shape | Use for |
| --- | --- | --- |
| Pooled | `ep-xxx-xxxx-pooler.<region>.aws.neon.tech` | **the app on Cloud Run** |
| Direct | `ep-xxx-xxxx.<region>.aws.neon.tech` | `psql`, schema, seeding |

```
# app (Cloud Run) — note the -pooler suffix
postgresql://USER:PASSWORD@ep-xxx-xxxx-pooler.ap-southeast-1.aws.neon.tech/mathmap?sslmode=require

# workstation (schema + seed) — direct endpoint
postgresql://USER:PASSWORD@ep-xxx-xxxx.ap-southeast-1.aws.neon.tech/mathmap?sslmode=require
```

Why the pooler matters: Cloud Run scales instances up and down, and each instance
opens its own `pg` pool (`max: 10`). The pooler (PgBouncer, transaction mode) absorbs
that churn; the direct endpoint would exhaust Neon's connection limit as instances
multiply.

Compatible with this codebase — verified: there is no session-level SQL anywhere
(`SET`, `LISTEN`, `NOTIFY`, advisory locks, temp tables, `PREPARE`). The transaction
helper holds one client across `BEGIN`…`COMMIT`, which transaction pooling supports.

TLS — verified: the runtime image carries the CA bundle and completes a TLS 1.3
handshake with `authorized=true`, so `sslmode=require` validates the certificate
rather than silently skipping it.

**Region**: pick the Neon region nearest your Cloud Run region. If Mumbai
(`asia-south1`) is not offered, use Singapore (`ap-southeast-1`) — or run Cloud Run in
`asia-southeast1` so the app sits beside the database. Every query pays the round trip.

Neon suspends an idle project, so the first request after a quiet period is slower.
This is already handled: `pg` emits an error on the dropped idle client, the pool logs
it, and the next query transparently reconnects.

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

Values used throughout: service `mathmap`, region **`asia-southeast1`** (Singapore), domain
**`vivekbuilds.tech`**. Singapore rather than Mumbai because the Neon database lives in
`ap-southeast-1`: a page issues several queries, so the app should sit beside the database
rather than beside the user. Domain mappings are regional, so the service and the mapping
must live in the same region.

```bash
export PROJECT_ID=your-project-id
export REGION=asia-southeast1
gcloud config set project "$PROJECT_ID"

gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
  secretmanager.googleapis.com artifactregistry.googleapis.com

# one-time: keep the JWT signing key out of the image and out of the console
openssl rand -hex 32 | gcloud secrets create mathmap-jwt --data-file=-

# the database URL carries the Neon password, so it belongs in Secret Manager too
printf '%s' 'postgresql://USER:PASSWORD@ep-xxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require' \
  | gcloud secrets create mathmap-db-url --data-file=-

# the Cloud Run runtime service account must be able to read both secrets
PROJ_NUM=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")
for s in mathmap-jwt mathmap-db-url; do
  gcloud secrets add-iam-policy-binding "$s" \
    --member="serviceAccount:${PROJ_NUM}-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
done

# `--source .` builds with Cloud Build, and on some projects the Compute Engine
# default service account cannot read the uploaded source. Grant these first:
for role in roles/storage.objectViewer roles/artifactregistry.writer roles/logging.logWriter; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${PROJ_NUM}-compute@developer.gserviceaccount.com" --role="$role"
done
```

Environment variables go in a **file**, not `--set-env-vars`. A comma-separated value such as
`CLIENT_ORIGIN` is split into separate entries by gcloud's dict parser and the deploy fails
with `Bad syntax for dict arg`. Keep `cloudrun-env.yaml` beside the repo:

```yaml
NODE_ENV: production
TRUST_PROXY: "1"
CLIENT_ORIGIN: https://vivekbuilds.tech,https://www.vivekbuilds.tech
```

```bash
gcloud run deploy mathmap \
  --source . \
  --region "$REGION" \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi --cpu 1 \
  --min-instances 0 --max-instances 2 \
  --env-vars-file cloudrun-env.yaml \
  --set-secrets JWT_SECRET=mathmap-jwt:latest,DATABASE_URL=mathmap-db-url:latest
```

Cloud SQL is not used, so there is no `--add-cloudsql-instances` and no socket path. If you
ever switch, add that flag and change the URL to
`...@/neondb?host=/cloudsql/$PROJECT_ID:$REGION:mathmap-db`.

`--source .` builds the included `Dockerfile` with Cloud Build and prints the
`*.run.app` URL. Check that URL **before** touching DNS:

```bash
curl https://mathmap-<project-number>.<region>.run.app/api/health   # expect {"status":"ok","db":"up"}
```

Cloud SQL is not used, so there is no `--add-cloudsql-instances` and no socket path. If
you ever switch, add that flag and change the URL to
`...@/mathmap?host=/cloudsql/$PROJECT_ID:$REGION:mathmap-db`.

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
| `DATABASE_URL` | Secret Manager (Neon pooled URL) | carries the Neon password; never a plain env var on a shared project |
| `ALLOW_DEMO_SEED` | **unset** | the demo-account shortcut stays off in production |

### What is deployed

| | |
| --- | --- |
| Service URL | `https://mathmap-363993004850.asia-southeast1.run.app` |
| Project | `project-1fba041d-5a2a-46ea-a94` |
| Region | `asia-southeast1` |
| Image | built from `Dockerfile` via Cloud Build → Artifact Registry `cloud-run-source-deploy` |
| Secrets | `mathmap-jwt`, `mathmap-db-url` |
| Custom domain | `mathmap.vivekbuilds.tech` — **mapping created**, `DomainRoutable: True`, awaiting DNS for the certificate |

Verified live: `/api/health` reports `db: up`, `/` and `/dashboard` serve the SPA,
`/api/unknown` stays a JSON 404, `/api/stats` returns the seeded 6/66/120/58/12/737, and a
browser session logs in and renders a topic page with no CSP violations. Round trip to
Singapore is ~120 ms from India.

---

## 4. Custom domain — `mathmap.vivekbuilds.tech`

A **subdomain**, deliberately. It needs one `CNAME` and nothing else: no A/AAAA records, no
apex-forwarding conflicts, and the root domain stays free for whatever else goes there.

### 4.1 Prove ownership (Search Console)

Cloud Run refuses to map a domain the account has not verified. This step is interactive — it
needs a browser and the Google account that owns the project:

```bash
gcloud domains verify vivekbuilds.tech     # opens Search Console
gcloud domains list-user-verified          # empty until verification completes
```

1. Search Console → **Add property** → choose **Domain** (not "URL prefix").
2. Enter **`vivekbuilds.tech`** — the root domain. A Domain property covers every subdomain,
   so `mathmap.` is authorised by the same TXT record.
3. Add the TXT record at your DNS host:

   | Type | Name | Value | TTL |
   | --- | --- | --- | --- |
   | TXT | `@` (or `vivekbuilds.tech`) | `google-site-verification=...` | 300 |

4. Back in Search Console, press **Verify**. Then `gcloud domains list-user-verified` should
   list it.

> Verifying the root domain once covers all subdomains. Verifying only
> `mathmap.vivekbuilds.tech` also works, but you would have to repeat it for every new host.

### 4.2 Create the mapping

Domain mappings for a fully managed Cloud Run service live under the **beta** command group,
which may need installing first:

```bash
gcloud components install beta --quiet

gcloud beta run domain-mappings create \
  --service mathmap --domain mathmap.vivekbuilds.tech --region "$REGION"

gcloud beta run domain-mappings list --region "$REGION"
gcloud beta run domain-mappings describe \
  --service mathmap --domain mathmap.vivekbuilds.tech --region "$REGION"
```

Until verification is done this fails with *"The provided domain does not appear to be
verified for the current account"* — that message means 4.1 is unfinished, not that the
command is wrong.

### 4.3 DNS record

One record. Confirm the target against the `describe` output before saving.

| Type | Name / Host | Value | TTL |
| --- | --- | --- | --- |
| CNAME | `mathmap` | `ghs.googlehosted.com` | 300 |

Some panels want the full name — then use `mathmap.vivekbuilds.tech.` with the trailing dot.
Leave the apex alone: no A, no AAAA, no forwarding.

### 4.4 Wait for the certificate

```bash
# has DNS propagated?
dig +short mathmap.vivekbuilds.tech CNAME     # expect ghs.googlehosted.com.

# has Google issued the managed certificate?
gcloud beta run domain-mappings describe \
  --service mathmap --domain mathmap.vivekbuilds.tech --region "$REGION" \
  --format='value(status.conditions)'
```

`CertificateProvisioned` turns `True` when DNS resolves and the certificate is issued —
usually minutes, documented up to 24 hours. Until then the subdomain serves an error; the
`*.run.app` URL keeps working throughout.

### 4.5 Notes for this setup

- **DNS is not at the registrar.** `dig +short NS vivekbuilds.tech` returns
  `ns1.dns.host … ns4.dns.host`, so records go in the **dns.host** panel, not get.tech. Adding
  them at the registrar does nothing.
- A `CNAME` cannot coexist with other records on the same name — do not also add an A record
  for `mathmap`.
- Do not enable "URL forwarding" or a "web redirect" on `mathmap`; it overrides the CNAME and
  the mapping never validates.
- Leave the TTL at 300 while setting up, then raise it once the site is live.
- `CLIENT_ORIGIN` on the service must be this origin — it already is
  (`https://mathmap.vivekbuilds.tech`).

---

## 5. Operational notes

- **Rate limiting is in memory**, so it is per instance. With `--max-instances 2` the
  effective limit doubles. Fine for a demo; a shared store would be needed for real.
- **`--min-instances 0`** means a cold start on the first request after idle. Set it to
  `1` for a viva or demo slot (costs money, removes the wait).
- **Cost**: with Neon the deployment has no recurring charge — Cloud Run's free tier is
  permanent and Neon's does not expire, so the ₹28,007 / 82-day credit stays untouched
  headroom. The only upgrade worth considering is `--min-instances 1` to remove cold starts.
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
- [ ] Neon project created; **region close to the Cloud Run region**
- [ ] `db/schema.sql` applied to the database (**it drops and recreates every object**)
- [ ] Seeded **once** from a workstation or one-off container, never from `CMD`
- [ ] App uses the **pooled** (`-pooler`) Neon hostname; schema/seed used the direct one
- [ ] `JWT_SECRET` **and** `DATABASE_URL` created in Secret Manager, both `--set-secrets`
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

