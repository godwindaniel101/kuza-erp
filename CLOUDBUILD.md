# Deploy Kuza with Cloud Build triggers (per service)

This repo deploys four Cloud Run services. Each service has its own Cloud Build
trigger. Each trigger is scoped to one folder. A push rebuilds only the services
that changed.

| Service | Folder | Cloud Build config | Trigger scope (`includedFiles`) |
|---|---|---|---|
| kuza-backend | `backend/` | `backend/cloudbuild.yaml` | `backend/**` |
| kuza-user-portal | `user-portal/` | `user-portal/cloudbuild.yaml` | `user-portal/**` |
| kuza-admin-portal | `admin-portal/` | `admin-portal/cloudbuild.yaml` | `admin-portal/**` |
| kuza-website | `website/` | `website/cloudbuild.yaml` | `website/**` |

The backend config also runs the database migrations. It runs them before it
deploys the service. A failed migration stops the deploy.

> **Pick one deploy system.** This repo also holds a GitHub Actions workflow
> (`.github/workflows/deploy.yml`) that deploys the same services. Do not run
> both. Two systems deploy the same service twice and can race. Use Cloud Build
> (below) OR GitHub Actions, not both. To use Cloud Build, disable the Actions
> workflow first (delete the file, or set it to manual `workflow_dispatch` only).

---

## 1. One-time setup

1. Connect the GitHub repository to Cloud Build. Open **Cloud Build → Triggers →
   Connect repository** and connect `godwindaniel101/kuza-erp`.
2. Create the Artifact Registry repo and the two databases. See `DEPLOY.md`.
3. Create the secrets in Secret Manager. See `DEPLOY.md` for the list.
4. Give the Cloud Build service account these roles:
   - `roles/run.admin`
   - `roles/iam.serviceAccountUser`
   - `roles/cloudsql.client`
   - `roles/artifactregistry.writer`
   - `roles/secretmanager.secretAccessor`

```bash
PROJECT=your-project
NUM=$(gcloud projects describe $PROJECT --format='value(projectNumber)')
SA="$NUM@cloudbuild.gserviceaccount.com"
for R in run.admin iam.serviceAccountUser cloudsql.client artifactregistry.writer secretmanager.secretAccessor; do
  gcloud projects add-iam-policy-binding $PROJECT --member="serviceAccount:$SA" --role="roles/$R"
done
```

---

## 2. Create the four scoped triggers

Set your values first:

```bash
REGION=europe-west1
CLOUD_SQL_INSTANCE=PROJECT:REGION:INSTANCE            # from: gcloud sql instances describe ...
BACKEND_URL=https://kuza-backend-XXXX.europe-west1.run.app
FRONTEND_URL=https://kuza-user-portal-XXXX.europe-west1.run.app,https://kuza-admin-portal-XXXX.europe-west1.run.app
```

```bash
# backend — scoped to backend/**
gcloud builds triggers create github \
  --name=deploy-backend \
  --repo-owner=godwindaniel101 --repo-name=kuza-erp \
  --branch-pattern='^main$' \
  --included-files='backend/**' \
  --build-config=backend/cloudbuild.yaml \
  --region=$REGION \
  --substitutions=_CLOUD_SQL_INSTANCE=$CLOUD_SQL_INSTANCE,_FRONTEND_URL=$FRONTEND_URL

# user-portal — scoped to user-portal/**
gcloud builds triggers create github \
  --name=deploy-user-portal \
  --repo-owner=godwindaniel101 --repo-name=kuza-erp \
  --branch-pattern='^main$' \
  --included-files='user-portal/**' \
  --build-config=user-portal/cloudbuild.yaml \
  --region=$REGION \
  --substitutions=_NEXT_PUBLIC_API_URL=$BACKEND_URL

# admin-portal — scoped to admin-portal/**
gcloud builds triggers create github \
  --name=deploy-admin-portal \
  --repo-owner=godwindaniel101 --repo-name=kuza-erp \
  --branch-pattern='^main$' \
  --included-files='admin-portal/**' \
  --build-config=admin-portal/cloudbuild.yaml \
  --region=$REGION \
  --substitutions=_NEXT_PUBLIC_API_URL=$BACKEND_URL

# website — scoped to website/**
gcloud builds triggers create github \
  --name=deploy-website \
  --repo-owner=godwindaniel101 --repo-name=kuza-erp \
  --branch-pattern='^main$' \
  --included-files='website/**' \
  --build-config=website/cloudbuild.yaml \
  --region=$REGION
```

`--included-files` is the scope. The trigger fires only when a file in that
folder changes. This is the per-service scoping.

---

## 3. First deploy order

The portals bake `NEXT_PUBLIC_API_URL` at build time, and the backend needs the
portal origins for CORS. Deploy the backend first. Read its URL. Set the
`BACKEND_URL` and `FRONTEND_URL` values above. Then deploy the portals.

The landlord database needs its base tables once, on a fresh instance. See the
"landlord baseline" section in `DEPLOY.md` before the first backend deploy.

---

## 4. Correct settings for the backend service form

The default form values do not fit a NestJS backend. Set these:

| Field | Form default | Set to | Why |
|---|---|---|---|
| Memory | 128 MiB | **1 GiB** | Node + NestJS + `sharp` do not boot in 128 MiB. They run out of memory. |
| Max instances | 1 | **4** | One instance gives no headroom and no safe rolling deploy. |
| Min instances | 0 | **1** | A cold start can drop a provider payment webhook. Keep one instance warm. |
| Container port | 8080 | **8080** | Correct. The app reads `$PORT`. No change. |
| Billing | Request-based | **Request-based** | Correct. The app has no background jobs to keep warm. |
| Authentication | Allow public access | **Allow public access** | Correct. The API serves browsers and the portals. |
| Cloud SQL connections | — | **add your instance** | The backend and the migration job both need it. |

The `cloudbuild.yaml` files set these same values on every deploy. So the config
can not drift from a manual console edit. The portals and the website run fine at
512 MiB.
