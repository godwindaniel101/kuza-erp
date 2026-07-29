# Integrations framework

`src/modules/integrations` connects Kuza ERP to the outside world (payment
gateways, POS systems, banks) through a small ports-and-adapters framework,
and closes the loop with **auto-reconciliation**: a customer pays via
Paystack/Monnify → the provider calls our webhook → the payment is matched to
an invoice by reference → `InvoicesService.recordPayment` records it and the
accounting module auto-posts Dr Bank / Cr Accounts Receivable. No manual entry.

## How it works

```
Provider dashboard                     Kuza backend
──────────────────                     ─────────────────────────────────────────
                                       IntegrationConnection  (tenant schema)
  webhook URL  ────────────────────►     provider, type, status, label,
                                         config (jsonb, secrets redacted on read),
                                         webhookSecret (uuid, shown once)

  POST /api/integrations/webhooks/:connectionId       (public, no JWT)
        │
        ▼
  WebhookTenantGuard ── looks up LandlordWebhookRoute (landlord/public DB)
        │               connectionId → { tenantId, schemaName }
        ▼               sets request.tenant
  TenantTransactionInterceptor ── SET LOCAL search_path → tenant schema
        │
        ▼
  WebhooksService.handleWebhook
        ├─ adapter.parseWebhook(headers, rawBody, config)   ← signature check
        ├─ dedupe on (connectionId, reference, PROCESSED)   ← idempotent retries
        ├─ match reference → invoices.invoice_number
        ├─ InvoicesService.recordPayment → books auto-post
        └─ IntegrationEvent appended: PROCESSED | IGNORED | FAILED
```

Key pieces:

| Piece | Where | Role |
|---|---|---|
| `PaymentProviderPort` / `PosProviderPort` | `ports/` | Provider-agnostic contracts (`NormalizedPaymentEvent`, `VirtualAccountInfo`, `NormalizedSaleEvent`) |
| `PaystackAdapter`, `MonnifyAdapter` | `adapters/` | Translate provider APIs/webhooks into the port types |
| `IntegrationConnection` | tenant schema | One configured provider link per row; `config` jsonb holds credentials |
| `IntegrationEvent` | tenant schema | Append-only inbox of every delivery, with status + error, for debugging/replay |
| `LandlordWebhookRoute` | landlord (public) DB | Maps `connectionId → tenant`, so an unauthenticated webhook can find its tenant schema |
| `WebhookTenantGuard` | `guards/` | Establishes tenant context for public webhook routes |

### Why the landlord route table exists

Webhooks carry no JWT, and `IntegrationConnection` lives in a tenant schema
that is unreachable until a tenant context exists — a chicken-and-egg problem.
When a connection is created we therefore also write a tiny
`integration_webhook_routes` row on the **landlord** connection (registered in
`common/landlord/landlord.module.ts`, same pattern as billing's `Plan` /
`TenantSubscription`). The webhook guard reads that row, sets
`request.tenant`, and the existing global `TenantTransactionInterceptor` does
the rest — the webhook handler runs inside a pinned tenant transaction exactly
like an authenticated request.

### Event statuses

- `PROCESSED` — payment recorded against an invoice (books auto-posted).
- `IGNORED` — valid delivery we deliberately did nothing with: unhandled event
  type, no matching invoice, disabled connection, or a duplicate delivery.
- `FAILED` — we tried and could not (e.g. amount exceeds the invoice balance).
  The raw payload is kept for inspection. We still return HTTP 200 so the
  provider does not retry a payload that can never succeed.
- Invalid signatures are rejected with **401** and are NOT stored.

Inspect the inbox: `GET /api/integrations/events?connectionId=&status=&page=&limit=`.

## API surface (JWT + `settings.edit`, except the webhook)

| Method & path | Purpose |
|---|---|
| `POST /api/integrations/connections` | Create; returns `webhookPath` + `webhookSecret` **once** |
| `GET /api/integrations/connections` | List (secret-ish config values redacted) |
| `GET /api/integrations/connections/:id` | Get one (redacted) |
| `PATCH /api/integrations/connections/:id` | Update label/status/config (config merges per key; `null` clears a key) |
| `DELETE /api/integrations/connections/:id` | Delete connection + landlord webhook route |
| `POST /api/integrations/connections/:id/virtual-account` | `{ customerId }` → provider virtual account |
| `GET /api/integrations/events` | Paginated webhook inbox |
| `POST /api/integrations/webhooks/:connectionId` | **Public** provider webhook receiver |

Any key in `config` whose name matches `/secret|key|token/i` is replaced with
`"••• configured •••"` in every API response.

## Adding a provider

1. Create `adapters/<provider>.adapter.ts` implementing `PaymentProviderPort`
   (or `PosProviderPort` for POS pushes):
   - `parseWebhook(headers, rawBody, config, webhookSecret)` — verify the
     signature when credentials allow (throw `UnauthorizedException` on
     mismatch), map only *successful* payment events to
     `NormalizedPaymentEvent` (amount in **major units**), return `null` for
     everything else.
   - `createVirtualAccount(input, config)` — throw
     `BadRequestException('Provider API key not configured — add it in integration settings')`
     when credentials are missing; otherwise call the provider with `fetch`.
2. Register the adapter as a provider in `integrations.module.ts` and add a
   case to `ConnectionsService.paymentAdapterFor`.
3. That's it — connections, webhook routing, dedup, invoice matching, event
   logging and reconciliation are all provider-agnostic.

## Paystack setup

1. Get keys: [dashboard.paystack.com](https://dashboard.paystack.com) →
   Settings → API Keys & Webhooks. Copy the **secret key** (`sk_test_...` for
   test mode).
2. Create the connection:

   ```bash
   curl -X POST http://localhost:4001/api/integrations/connections \
     -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
     -d '{"provider":"paystack","type":"PAYMENTS","label":"Paystack main","config":{"secretKey":"sk_test_xxx","preferredBank":"wema-bank"}}'
   ```

   Note the returned `webhookPath` (e.g. `/api/integrations/webhooks/<id>`).
3. Paste `https://<your-host>/api/integrations/webhooks/<connectionId>` into
   Paystack → Settings → API Keys & Webhooks → Webhook URL.
4. Paystack signs webhooks with **your secret key** (HMAC-SHA512 of the raw
   body, header `x-paystack-signature`). Verification is enforced as soon as
   `config.secretKey` is set.
5. Virtual accounts (`POST .../virtual-account`) use Paystack Dedicated
   Accounts: we create a Paystack customer, then
   `POST /dedicated_account { customer, preferred_bank }`. Requires an
   approved Paystack business for live mode.

## Monnify setup

1. Get credentials: [app.monnify.com](https://app.monnify.com) (or
   sandbox at app.monnify.com with test credentials) → Settings → API Keys:
   **API key** (`MK_...`), **secret key**, and your **contract code**.
2. Create the connection with
   `config: { "apiKey": "MK_...", "secretKey": "...", "contractCode": "...", "baseUrl": "https://sandbox.monnify.com" }`
   (omit `baseUrl` or set `https://api.monnify.com` for live).
3. Paste the webhook URL into Monnify → Settings → Webhooks (Transaction
   Completion). Monnify signs with your **secret key** (HMAC-SHA512 of the raw
   body, header `monnify-signature`).
4. Virtual accounts use Monnify Reserved Accounts:
   `POST /api/v1/auth/login` (Basic `apiKey:secretKey`) →
   `POST /api/v2/bank-transfer/reserved-accounts`.

## End-to-end test against a dev invoice (no provider account needed)

Leave `config.secretKey` unset on a dev connection — signature verification is
only enforced once a key is configured, so you can simulate deliveries by hand.

```bash
# 1. Create a customer + invoice, then SEND it (note the invoiceNumber, e.g. INV-2026-0001)
curl -s -X POST http://localhost:4001/api/invoices/$INVOICE_ID/send \
  -H "Authorization: Bearer $JWT"

# 2. Create a keyless paystack connection (see above) and grab its id → $CONN

# 3. Simulate Paystack charge.success paying that invoice.
#    The reference MUST equal the invoice number — that is the matching key.
curl -s -X POST http://localhost:4001/api/integrations/webhooks/$CONN \
  -H "Content-Type: application/json" \
  -d '{
    "event": "charge.success",
    "data": {
      "amount": 12000000,
      "currency": "NGN",
      "reference": "INV-2026-0001",
      "paid_at": "2026-07-11T09:30:00.000Z",
      "customer": { "first_name": "Chidi", "last_name": "Traders" }
    }
  }'
# → { "success": true, "data": { "eventId": "...", "status": "PROCESSED", "invoiceNumber": "INV-2026-0001" } }

# 4. Verify: invoice is PAID and the payment is on the books
curl -s http://localhost:4001/api/invoices/$INVOICE_ID -H "Authorization: Bearer $JWT"
curl -s "http://localhost:4001/api/integrations/events?connectionId=$CONN" -H "Authorization: Bearer $JWT"
```

Amounts: Paystack sends kobo (`12000000` = ₦120,000); Monnify sends naira.

## Known limitations

- **Raw body**: `main.ts` runs a global JSON body parser without raw-body
  capture, so signature verification falls back to `JSON.stringify(req.body)`.
  This matches the compact JSON Paystack/Monnify actually send, but for
  byte-exact verification set `rawBody: true` in `NestFactory.create` (the
  controller already prefers `req.rawBody` when present).
- Reconciliation matches `reference === invoice_number` (case-insensitive,
  exact). Customers must pay with the invoice number as their payment
  reference (which both providers support via payment pages/transfers).
- POS (`PosProviderPort`) is defined but no POS adapter ships yet; a
  `generic_pos` connection can be created and its deliveries will land in the
  event inbox as `IGNORED` until an adapter is registered.
