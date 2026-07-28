#!/usr/bin/env bash
# Phase C end-to-end verification. Run from repo root:  bash scripts/verify-phase-c.sh
# Uses the restaurant tenant created during the session (pc-*@test.com / PC Diner).
set -uo pipefail
API=http://localhost:4001/api
EMAIL_FILE="/private/tmp/claude-501/-Users-danieliyenogun-Desktop-Software-P-kuza-erp/dfc6a5b5-088b-4a31-922a-aded3f5163b2/scratchpad/pc_email.txt"
EMAIL=$(cat "$EMAIL_FILE" 2>/dev/null || echo "")
if [ -z "$EMAIL" ]; then echo "No test email found; re-run onboarding first."; exit 1; fi
echo "Tenant: $EMAIL (PC Diner, restaurant)"

TOKEN=$(curl -s $API/auth/login -X POST -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"password123\"}" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).data.token))")
H="Authorization: Bearer $TOKEN"

pass(){ echo "  PASS: $1"; }; fail(){ echo "  FAIL: $1"; }

echo; echo "== Piece 1: shared stock core + exclusivity =="
code=$(curl -s -o /dev/null -w "%{http_code}" -H "$H" $API/ims/inventory)
[ "$code" = "200" ] && pass "restaurant reads /ims/inventory (shared stock core) → 200" || fail "expected 200, got $code"

r=$(curl -s -X PATCH -H "$H" -H 'Content-Type: application/json' -d '{"key":"items","enabled":true}' $API/billing/apps)
echo "$r" | grep -qi "separate business type\|can't run alongside" && pass "enabling Inventory on a restaurant is blocked (ims ⊕ rms)" || fail "exclusivity not enforced: $r"

echo; echo "== assist-host rule =="
r=$(curl -s -X PATCH -H "$H" -H 'Content-Type: application/json' -d '{"key":"ai","enabled":true}' $API/billing/apps)
echo "$r" | grep -qi '"success":true\|effective' && pass "AI Assist enables on top of a vertical" || echo "  NOTE: $r"

echo; echo "== Piece 3: pricing =="
curl -s -H "$H" $API/billing/pricing | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d).data;console.log('  currency:',j.currency,'| included:',j.includedBranches,'branch/',j.includedUsers,'users');console.log('  app prices:',j.apps.map(a=>a.key+':'+a.price).join(' '));})"
curl -s -X POST -H "$H" -H 'Content-Type: application/json' -d '{"apps":["rms","invoicing","books"],"branches":2,"users":5}' $API/billing/pricing/quote \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d).data;console.log('  quote lines:');j.lines.forEach(l=>console.log('    ',l.label,'=',l.amount,j.currency));console.log('  TOTAL:',j.total,j.currency);})"

echo; echo "== À-la-carte checkout (money-path wiring) =="
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "$H" -H 'Content-Type: application/json' -d '{"apps":["items","rms"]}' $API/billing/subscription/checkout-quote)
[ "$code" = "400" ] && pass "checkout rejects ims+rms together → 400 (exclusivity, no charge)" || fail "expected 400, got $code"
r=$(curl -s -X POST -H "$H" -H 'Content-Type: application/json' -d '{"apps":["rms","invoicing"],"branches":2,"users":5}' $API/billing/subscription/checkout-quote)
echo "$r" | grep -q "authorizationUrl" && pass "paid checkout returned a Paystack authorizationUrl (PAYSTACK_SECRET_KEY set)" || \
  { echo "$r" | grep -qi "not configured" && echo "  OK: no PAYSTACK key set → clear 'Payments are not configured' error (set a test key to get an authorizationUrl)" || echo "  NOTE: $r"; }

echo; echo "== MCP API token (issue → exchange → revoke) =="
PT=$(curl -s -X POST -H "$H" -H 'Content-Type: application/json' -d '{"label":"verify"}' $API/auth/api-token \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log(j.data?.token||j.data?.plaintext||j.data?.apiToken||'')})")
[ -n "$PT" ] && pass "issued API token (${PT:0:12}…)" || fail "no token returned"
JWT=$(curl -s -X POST -H 'Content-Type: application/json' -d "{\"token\":\"$PT\"}" $API/auth/api-token/exchange \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log(j.data?.token||j.token||'')})")
code=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $JWT" $API/auth/me)
[ "$code" = "200" ] && pass "exchanged token → JWT works on /auth/me → 200" || fail "exchange/JWT failed ($code)"
curl -s -o /dev/null -X DELETE -H "$H" $API/auth/api-token
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H 'Content-Type: application/json' -d "{\"token\":\"$PT\"}" $API/auth/api-token/exchange)
if [ "$code" = "401" ] || [ "$code" = "403" ]; then pass "revoked token no longer exchanges → $code"; else fail "revoked token still worked ($code)"; fi

echo; echo "== Admin pricing (optional — set SA_EMAIL/SA_PASS to run) =="
if [ -n "${SA_EMAIL:-}" ] && [ -n "${SA_PASS:-}" ]; then
  SAT=$(curl -s $API/auth/login -X POST -H 'Content-Type: application/json' -d "{\"email\":\"$SA_EMAIL\",\"password\":\"$SA_PASS\"}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).data.token))")
  curl -s -H "Authorization: Bearer $SAT" $API/admin/pricing | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log('  GET /admin/pricing →',j.success?'ok':'FAIL','| apps:',(j.data?.apps||[]).length)})"
else
  echo "  skipped (export SA_EMAIL / SA_PASS of the super-admin to test /admin/pricing)"
fi

echo; echo "== Piece 2: post-trial read-only lock =="
curl -s -o /dev/null -H "$H" $API/billing/subscription   # ensure a subscription row exists
docker compose exec -T postgres psql -U postgres -d erp_landlord -c \
  "UPDATE tenant_subscriptions SET status='TRIALING', trial_ends_at = now() - interval '1 day' WHERE tenant_id = (SELECT id FROM tenants WHERE slug='pc-diner');" >/dev/null 2>&1
echo "  (expired the trial)"
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "$H" -H 'Content-Type: application/json' -d '{}' $API/ims/categories)
[ "$code" = "403" ] && pass "a WRITE (POST /ims/categories) is blocked → 403 (trial ended)" || fail "expected 403, got $code"
code=$(curl -s -o /dev/null -w "%{http_code}" -H "$H" $API/ims/inventory)
[ "$code" = "200" ] && pass "a READ still works → 200 (read-only, not locked out)" || fail "expected 200, got $code"
code=$(curl -s -o /dev/null -w "%{http_code}" -H "$H" $API/billing/pricing)
[ "$code" = "200" ] && pass "billing/pricing still reachable → 200 (recovery path open)" || fail "expected 200, got $code"

echo; echo "== cleanup =="
docker compose exec -T postgres psql -U postgres -d erp_db -c "DROP SCHEMA IF EXISTS tenant_pc_diner CASCADE;" >/dev/null 2>&1
docker compose exec -T postgres psql -U postgres -d erp_landlord -c "DELETE FROM landlord_users WHERE email='$EMAIL'; DELETE FROM tenants WHERE slug='pc-diner';" >/dev/null 2>&1
echo "  removed test tenant"
echo; echo "Done."
