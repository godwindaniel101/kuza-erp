# Deploying Kuza to Cloud Run

Monorepo → three independently-deployed **Cloud Run** services, one **Cloud SQL** Postgres
instance (two databases), **Secret Manager** for credentials, **Artifact Registry** for images.
CI is `.github/workflows/deploy.yml` (push to `main` → path-filtered per service).

```
push main ──▶ changed?  backend/**      → build → migrate (Cloud Run Job) → deploy backend
                        user-portal/**  → build → deploy user-portal
                        admin-portal/** → build → deploy admin-portal
```

| Service | Dir | Port | Image | Notes |
|---|---|---|---|---|
| backend | `backend/` | `$PORT` (auto) | `backend/Dockerfile` (`node dist/main.js`) | needs Cloud SQL + secrets |
| user-portal | `user-portal/` | `$PORT` | `user-portal/Dockerfile` (Next standalone) | `NEXT_PUBLIC_API_URL` baked at build |
| admin-portal | `admin-portal/` | `$PORT` | `admin-portal/Dockerfile` (Next standalone) | super-admin console |

> Cloud Run injects `PORT` (default 8080) and each service already listens on `process.env.PORT`
> (backend) / Next `standalone` `server.js` — no code change needed.

---

## 1. One-time GCP setup

```bash
PROJECT=your-project ; REGION=europe-west1        # pick your region
gcloud config set project $PROJECT

# APIs
gcloud services enable run.googleapis.com sqladmin.googleapis.com \
  artifactregistry.googleapis.com secretmanager.googleapis.com iamcredentials.googleapis.com

# Artifact Registry (Docker) — repo name goes in the AR_REPO variable below
gcloud artifacts repositories create kuza --repository-format=docker --location=$REGION

# Cloud SQL Postgres + the TWO databases the app uses
gcloud sql instances create kuza-pg --database-version=POSTGRES_15 --tier=db-g1-small --region=$REGION
gcloud sql databases create erp_db       --instance=kuza-pg
gcloud sql databases create erp_landlord --instance=kuza-pg
# INSTANCE connection name (PROJECT:REGION:INSTANCE) → CLOUD_SQL_INSTANCE variable:
gcloud sql instances describe kuza-pg --format='value(connectionName)'
```

### Secret Manager
Create one secret per credential (the workflow maps these in with `--set-secrets`):
```bash
for s in DB_USERNAME DB_PASSWORD JWT_SECRET ANTHROPIC_API_KEY SUPER_ADMIN_EMAIL; do
  gcloud secrets create $s --replication-policy=automatic 2>/dev/null || true
done
# then add versions, e.g.:  printf 'strong-secret' | gcloud secrets versions add JWT_SECRET --data-file=-
```
`SUPER_ADMIN_EMAIL` must equal a landlord user's email — the backend promotes that user to
super-admin on boot (that's how you get into the **admin portal**).

### Workload Identity Federation (keyless CI auth)
Create a WIF pool + provider bound to this GitHub repo and a deploy service account with:
`roles/run.admin`, `roles/cloudsql.client`, `roles/artifactregistry.writer`,
`roles/iam.serviceAccountUser`, `roles/secretmanager.secretAccessor`.
Then set the two repo **Secrets**:
- `WIF_PROVIDER` = `projects/NUM/locations/global/workloadIdentityPools/POOL/providers/PROVIDER`
- `WIF_SERVICE_ACCOUNT` = `deployer@PROJECT.iam.gserviceaccount.com`

### Repo Variables (Settings → Variables)
`GCP_PROJECT_ID`, `GCP_REGION`, `AR_REPO` (= `kuza`), `CLOUD_SQL_INSTANCE` (`PROJECT:REGION:INSTANCE`),
`DB_NAME` (`erp_db`), `LANDLORD_DB_NAME` (`erp_landlord`), `AI_PROVIDER` (`anthropic` in prod —
Ollama isn't Cloud-Run-friendly), `FRONTEND_URL` (comma-sep portal origins for CORS),
`NEXT_PUBLIC_API_URL` (the backend's public URL).

> **Chicken-and-egg:** the portals bake `NEXT_PUBLIC_API_URL` at build and the backend needs the
> portal origins in `FRONTEND_URL` (CORS). Deploy `backend` first, read its URL
> (`gcloud run services describe backend --format='value(status.url)'`), set the variables, then
> deploy the portals — or put all three behind custom domains and set the values up front.

---

## 2. First deploy — the landlord baseline (IMPORTANT)

The **tenant/public** schema HAS a baseline migration, so `erp_db.public` builds itself and new
tenants clone from it. The **landlord** history has **no baseline** — its migrations are only
`ALTER`s that assume the base landlord tables exist. On a brand-new `erp_landlord` you must create
those base tables **once**, before the ALTER migrations can apply. Do exactly one of:

- **(recommended, one-off)** run the backend once against the empty instance with landlord
  synchronize on to create the base tables, e.g. a throwaway Cloud Run Job with
  `NODE_ENV=development` (or a local run pointed at the instance), then turn it off; **or**
- generate and commit a `src/migrations/landlord` baseline from a schema that already has the
  landlord tables.

After that, every deploy's migration job applies the landlord ALTERs + all tenant migrations
idempotently. Keep `DB_SYNCHRONIZE=false` in prod thereafter (the workflow sets it).

---

## 3. How migrations run on every deploy

The backend job runs **`node dist/scripts/run-migrations.js`** (a Cloud Run Job, `--wait`, before
the new revision serves traffic — so a failed migration blocks the deploy, never ships). The runner
(`backend/src/scripts/run-migrations.ts`) is **idempotent + non-destructive** and:

1. runs pending **landlord** migrations (`erp_landlord`),
2. ensures `uuid-ossp` + runs pending **tenant-template** migrations (`erp_db.public`),
3. iterates **every tenant schema** (`tenants.schema_name`), pins `search_path`, and runs pending
   migrations — **recording the baseline as already-applied** on existing cloned schemas so its
   `CREATE TABLE`s never re-run.

**Authoring a new migration** (tenant-side): change entities → generate against the snake-case
baseline data-source (`data-source.baseline.ts`), commit to `src/migrations/`. The next deploy
applies the delta to `public` **and every tenant schema**. Landlord changes → `src/migrations/landlord`.

Run it manually if needed: `npm run migrate:deploy` (needs a built `dist/` + DB env vars).

---

## 4. Caveats (verify before trusting in prod)

- **Untested against live infra.** The Dockerfiles, the CI workflow, and the migration runner were
  written but **not executed against a real Cloud SQL / Cloud Run** (local Docker was unavailable).
  Run the migration job against a **staging clone of prod** first.
- `admin-portal` was scaffolded from `user-portal`; its Docker build uses `npm ci`, so its
  `package-lock.json` must be in sync — run `npm install` in `admin-portal/` once and commit the lock.
- Card & mobile-money payment channels are stubbed; only bank-transfer (Monnify) is wired.
- Ollama is not deployed to Cloud Run — set `AI_PROVIDER=anthropic|openai` in prod.
- The marketing `website` service was removed from compose (the app dir was gutted); host a static
  marketing site on Firebase Hosting / Cloud Storage+CDN if you bring it back.
