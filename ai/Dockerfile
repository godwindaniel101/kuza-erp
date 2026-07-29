# ─────────────────────────────────────────────────────────────────────────
# Kuza AI — self-hosted Llama served by Ollama (OpenAI-compatible /v1 API).
#
# The model is BAKED INTO THE IMAGE at build time. Cloud Run has no persistent
# disk, so a runtime `ollama pull` would re-download the weights on every cold
# start. Baking them makes the container start with no download and no volume.
#
# Pick the model at build time:
#   --build-arg MODEL=llama3.2:1b   # smallest / fastest / cheapest (weak)
#   --build-arg MODEL=llama3.2:3b   # default — good balance on CPU
#   --build-arg MODEL=llama3.1:8b   # better quality, needs a GPU to be usable
# ─────────────────────────────────────────────────────────────────────────
FROM ollama/ollama:latest

ARG MODEL=llama3.2:3b
ENV MODEL=${MODEL}
# Keep the baked weights on the read-only image layer.
ENV OLLAMA_MODELS=/root/.ollama/models

# Start the server, wait until it answers, pull the model, then stop it.
# The weights land in OLLAMA_MODELS and are committed into this image layer.
RUN ollama serve & \
    pid=$! ; \
    for i in $(seq 1 30); do ollama list >/dev/null 2>&1 && break; sleep 1; done ; \
    ollama pull "${MODEL}" ; \
    kill "${pid}" 2>/dev/null || true

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Cloud Run injects $PORT (usually 8080); the entrypoint binds Ollama to it.
EXPOSE 8080
ENTRYPOINT ["/entrypoint.sh"]
