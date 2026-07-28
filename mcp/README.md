# Kuza MCP Server

Connect your Kuza ERP to Claude. This is a [Model Context Protocol](https://modelcontextprotocol.io)
server that exposes Kuza's **read-only analytics** as tools, so you can ask
Claude (Claude Desktop or a claude.ai connector) questions about your business
and it answers from your real Kuza data.

It is **read-only**. No tool mutates data — there is deliberately no way to run
payroll, create a purchase order, invite a user, etc. through this server.

## Tools

| Tool | What it does |
| --- | --- |
| `ask_kuza(question, branchId?)` | Full Kuza Copilot Q&A over the whole business (sales, cash, profit, stock, customers, staff, HR/payroll, branches). Optionally scoped to one branch. Returns an answer plus, when useful, a chart/table of real figures. |
| `get_business_digest()` | Cash, profit this month, top debtors, low stock, sales trend, overdue AR, top items, employee count. |
| `get_sales_summary()` | This month vs last month sales, best sellers, overdue receivables. |
| `get_inventory_status()` | Items at/below reorder point + inventory value. |
| `get_branch_list()` | Branch ids + names (use as the `branchId` for `ask_kuza`). |

## Tenant isolation

You authenticate as a specific Kuza user with a **tenant-scoped JWT**. The Kuza
backend pins the database `search_path` to that token's tenant schema on every
request, so this server can only ever see the token owner's tenant — there is
no cross-tenant access. An API token (below) is never sent to Kuza's data
endpoints directly — it is exchanged for a normal tenant-scoped JWT, so the same
isolation applies.

## Setup

```bash
cd mcp
npm install
npm run build
```

Configure auth via env (see `.env.example`). Choose one (checked in this order):

- **`KUZA_API_TOKEN`** (recommended) — a stable, revocable per-user token you
  generate in Kuza under **Settings → API**. The server exchanges it (via
  `POST /api/auth/api-token/exchange`) for a short-lived JWT, caches it, and
  transparently re-exchanges when it expires — so a long-running connection
  keeps working with no restart. Revoke the token in the UI to cut off access.
- **`KUZA_TOKEN`** — paste a Kuza JWT. Used as-is; it **cannot be refreshed**,
  so a long session may need a restart when it lapses.
- **`KUZA_EMAIL` + `KUZA_PASSWORD`** — the server logs in once (via
  `POST /api/auth/login`) and caches the JWT (re-logs in on expiry).

Also set **`KUZA_API_URL`** (default `http://localhost:3000`; the API root is
`<KUZA_API_URL>/api`).

### Get an API token

In Kuza: **Settings → API → Generate token**. Copy it immediately — it is shown
only once. It is stored hashed on the server and can be revoked or rotated at
any time from the same page.

## Run

```bash
KUZA_API_URL=http://localhost:3000 KUZA_API_TOKEN=kuza_… npm start
```

## Connect to Claude Desktop

Edit your Claude Desktop config:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

Add a `kuza` server (use the absolute path to the built `dist/index.js`):

```json
{
  "mcpServers": {
    "kuza": {
      "command": "node",
      "args": ["/absolute/path/to/kuza-erp/mcp/dist/index.js"],
      "env": {
        "KUZA_API_URL": "http://localhost:3000",
        "KUZA_API_TOKEN": "kuza_your_generated_token"
      }
    }
  }
}
```

Restart Claude Desktop. You should see the Kuza tools available; try asking
_"Use Kuza to tell me my best-selling product this month."_

## Connect to claude.ai (custom connector)

claude.ai connectors speak MCP over a remote (HTTP/SSE) transport rather than
stdio. This server ships the stdio transport (for Claude Desktop / local use).
To expose it to claude.ai, front it with an MCP stdio→HTTP bridge (e.g.
`mcp-remote`) or add a `StreamableHTTPServerTransport` and host it behind HTTPS,
then add its URL under claude.ai → Settings → Connectors. The tool definitions
above are transport-agnostic and unchanged.

## Develop

```bash
npm run dev        # tsc --watch
npm run typecheck  # tsc --noEmit
```
