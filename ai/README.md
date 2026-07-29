# Kuza AI — self-hosted Llama (Ollama)

This folder builds and deploys a self-hosted Llama model. It runs **Ollama**,
which exposes an **OpenAI-compatible** API at `/v1/chat/completions`. The Kuza
backend talks to this endpoint when `AI_PROVIDER=ollama`.

| File | Purpose |
|---|---|
| `Dockerfile` | Ollama image with the model **baked in** at build time |
| `entrypoint.sh` | Binds Ollama to Cloud Run's `$PORT` |
| `cloudbuild.yaml` | Builds and deploys the `kuza-ai` Cloud Run service |

## How the backend connects

The backend posts to `${OLLAMA_BASE_URL}/chat/completions`. So point it at this
service with `/v1` on the end. Set these on the **backend** service:

```
AI_PROVIDER=ollama
OLLAMA_BASE_URL=https://<kuza-ai-url>/v1
OLLAMA_MODEL=llama3.2:3b
```

Use the model tag you built (see below). The tag must match.

## Deploy

Deploy once by hand:

```bash
gcloud builds submit --config ai/cloudbuild.yaml .
```

Or create a trigger scoped to `ai/**` (see `CLOUDBUILD.md`). The service is
`kuza-ai` in `europe-west1`. Change the model at build time:

```bash
# smaller/faster, or larger/better
gcloud builds submit --config ai/cloudbuild.yaml \
  --substitutions=_MODEL=llama3.2:1b .
```

## Choose the model

| Model | Size | Runs on | Quality |
|---|---|---|---|
| `llama3.2:1b` | ~1.3 GB | CPU | weak |
| `llama3.2:3b` (default) | ~2 GB | CPU (slow) | fair |
| `llama3.1:8b` | ~4.7 GB | **GPU** | good |

## CPU or GPU — read this

CPU inference on Cloud Run is **slow**. A 3b model answers in seconds per reply,
not milliseconds. This is fine for background tasks. It is poor for live chat.

For real use, deploy with a **GPU**. Cloud Run supports the NVIDIA L4. Add these
flags to the deploy step and use a region that offers the L4:

```
--gpu 1 --gpu-type nvidia-l4 --no-cpu-throttling \
--memory 16Gi --cpu 8 --max-instances 1
```

Check GPU availability first. Not every region has the L4. `europe-west1` may not
— use a supported region (for example `europe-west4`) if it does not.

A **GCE VM with a GPU** running Ollama is the other common option. It costs more,
but it holds the model in memory and answers fast.

## Cold starts

The model loads into memory on the first request after a scale-up. This takes
several seconds. Set `--min-instances 1` to keep one instance warm. This costs
money all the time. The default is `--min-instances 0` to save cost.

## Security — the service is private by default

`cloudbuild.yaml` deploys with `--no-allow-unauthenticated`. An open LLM endpoint
is a cost-abuse risk. Do not make it public.

To let the backend call it, do both steps:

1. Grant the backend's service account the invoker role:
   ```bash
   gcloud run services add-iam-policy-binding kuza-ai \
     --region europe-west1 \
     --member="serviceAccount:<BACKEND_SA>" \
     --role="roles/run.invoker"
   ```
2. The backend must send an ID token with each call. The current AI gateway
   (`backend/src/common/ai/llm.service.ts`) sends **no** auth header for the
   `ollama` provider. So it needs a small change to attach a Cloud Run ID token
   before this works. **This is a required follow-up** — it is not wired yet.

## Local use

Local development already runs Ollama through `docker-compose` (the `ai`
profile). You do not need this image locally:

```bash
docker compose --profile ai up -d ollama
docker exec erp_ollama ollama pull llama3.2:3b
```

You may point the local compose `ollama` service at this folder with
`build: { context: ./ai }` if you want the same baked image locally. This makes
the local build heavy, so it is optional.

## Honest note

Anthropic (`AI_PROVIDER=anthropic`) needs no infrastructure and answers fast. It
costs per token. Self-hosted Llama removes the per-token cost and keeps data in
your project, but you run and pay for the compute. Pick per your cost and data
rules. The backend switches by config, so you can change your mind later.
