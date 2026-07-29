#!/usr/bin/env bash
set -euo pipefail

# Cloud Run provides $PORT (usually 8080). Ollama's own default is 11434, which
# is used when this image runs locally without $PORT set. Ollama binds to the
# host:port in OLLAMA_HOST.
export OLLAMA_HOST="0.0.0.0:${PORT:-11434}"

echo "Kuza AI — starting Ollama on ${OLLAMA_HOST} (model: ${MODEL:-unset})"
exec ollama serve
