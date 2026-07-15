#!/usr/bin/env bash
# Kuza — one-command local dev (native Postgres, no Docker).
# Usage: ./dev.sh          start backend (:4001) + frontend (:4000)
#        ./dev.sh stop     stop both
#
# Uses the Homebrew PostgreSQL 14 service (brew services start postgresql@14)
# with databases erp_db + erp_landlord. The old docker-compose DB (port 4433)
# holds pre-2026-07-11 data; this setup replaced it after Docker Desktop
# proved unstable. Demo login: smoke-test-0711@example.com / smoketest123
set -euo pipefail
cd "$(dirname "$0")"

if [ "${1:-}" = "stop" ]; then
  lsof -ti :4001 | xargs kill 2>/dev/null || true
  pkill -f "next start" 2>/dev/null || true
  echo "stopped."
  exit 0
fi

# The Docker stack (docker compose up) and this native stack both use port
# 4001 — running both at once makes the loser look like "backend has no
# port". One stack at a time: starting native stops the Docker containers.
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^erp_backend$'; then
  echo "⚠ Docker stack is running — stopping erp_backend/erp_frontend first (one stack at a time)."
  docker stop erp_backend erp_frontend >/dev/null 2>&1 || true
fi

# 1. Postgres
if ! nc -z 127.0.0.1 5432 2>/dev/null; then
  echo "starting postgresql@14…"
  brew services start postgresql@14
  until nc -z 127.0.0.1 5432 2>/dev/null; do sleep 1; done
fi
for db in erp_db erp_landlord; do
  psql -h 127.0.0.1 -p 5432 -U "$USER" -lqt | cut -d'|' -f1 | grep -qw "$db" \
    || createdb -h 127.0.0.1 -p 5432 -U "$USER" "$db"
done

# 2. Backend (compiles once, then runs; logs to /tmp/kuza-backend.log)
lsof -ti :4001 | xargs kill 2>/dev/null || true
( cd backend && npx nest build > /dev/null && \
  NODE_ENV=development PORT=4001 \
  DB_HOST=127.0.0.1 DB_PORT=5432 DB_USERNAME="$USER" DB_PASSWORD= \
  DB_NAME=erp_db DB_LANDLORD_NAME=erp_landlord \
  JWT_SECRET=dev-only-secret-0123456789abcdef0123456789abcdef \
  JWT_EXPIRES_IN=7d FRONTEND_URL=http://localhost:4000 \
  nohup node dist/main.js > /tmp/kuza-backend.log 2>&1 & )
echo -n "backend starting"
until curl -s -o /dev/null http://localhost:4001/api/billing/plans 2>/dev/null; do
  echo -n "."; sleep 2
  if grep -q "ExceptionHandler" /tmp/kuza-backend.log 2>/dev/null; then
    echo; echo "BACKEND FAILED — tail of /tmp/kuza-backend.log:"; tail -20 /tmp/kuza-backend.log; exit 1
  fi
done
echo " up on :4001"

# 3. Frontend (production build if none, then serve)
pkill -f "next start" 2>/dev/null || true
( cd frontend && [ -f .next/BUILD_ID ] || npx next build; \
  nohup npx next start -p 4000 > /tmp/kuza-frontend.log 2>&1 & )
echo -n "frontend starting"
until curl -sf http://localhost:4000/login > /dev/null 2>&1; do echo -n "."; sleep 1; done
echo " up on :4000"

echo
echo "  App:        http://localhost:4000  (demo: smoke-test-0711@example.com / smoketest123)"
echo "  Public menu: http://localhost:4000/m/smoke-test-ltd-uwjb"
echo "  API:        http://localhost:4001/api"
echo "  Logs:       /tmp/kuza-backend.log · /tmp/kuza-frontend.log"
