# Deploying MathMap

The app ships as **one container**: Express serves `/api` *and* the built React client,
with an SPA fallback for client routes. One origin means no CORS, no second URL to
configure, and one Cloud Run service to map a domain onto.

Verified locally end to end: image builds, container runs, login works, deep links
serve the SPA, `/api/*` keeps returning JSON 404s, and the browser reports no CSP
violations.

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

```bash
# one-time: keep the JWT signing key out of the image and the console
openssl rand -hex 32 | gcloud secrets create mathmap-jwt --data-file=-

gcloud run deploy mathmap \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi --cpu 1 \
  --min-instances 0 --max-instances 2 \
  --add-cloudsql-instances=PROJECT:asia-south1:mathmap-db \
  --set-env-vars NODE_ENV=production,TRUST_PROXY=1,CLIENT_ORIGIN=https://app.example.com \
  --set-env-vars DATABASE_URL='postgresql://...' \
  --set-secrets JWT_SECRET=mathmap-jwt:latest
```

`--source .` builds the included `Dockerfile` with Cloud Build.

Environment variables that matter:

| Variable | Value | Why |
| --- | --- | --- |
| `NODE_ENV` | `production` | enables HSTS and generic 5xx bodies |
| `TRUST_PROXY` | `1` | Cloud Run terminates TLS; without this every client shares one rate-limit bucket |
| `CLIENT_ORIGIN` | `https://app.example.com` | CORS allow-list |
| `JWT_SECRET` | from Secret Manager | signed-in sessions break if it changes |
| `DATABASE_URL` | provider string | |
| `ALLOW_DEMO_SEED` | **unset** | off in production |

---

## 4. Custom domain

```bash
gcloud run domain-mappings create \
  --service mathmap --domain app.example.com --region asia-south1

# then read back the exact records Google wants
gcloud run domain-mappings describe \
  --service mathmap --domain app.example.com --region asia-south1
```

Roughly:

- **Subdomain** (`app.example.com`): `CNAME` → `ghs.googlehosted.com`
- **Apex** (`example.com`): the A/AAAA records the command prints

Google must verify domain ownership first (Search Console). The certificate is
provisioned automatically once DNS resolves — usually minutes, occasionally hours.

If the domain's DNS is on Cloudflare, set these records to **DNS only (grey cloud)**
until the certificate is issued. Proxying prevents Google from validating and the
mapping will sit unfinished.

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

## 6. Local rehearsal

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
