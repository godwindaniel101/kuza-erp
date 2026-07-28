#!/usr/bin/env node
/**
 * Kuza MCP server — connect your Kuza ERP to Claude.
 *
 * Exposes a small set of READ-ONLY / analytics tools over the Model Context
 * Protocol so Claude (Desktop or claude.ai connectors) can answer questions
 * about a tenant's business. Every tool is backed by an existing Kuza read
 * endpoint and authenticates with a tenant-scoped JWT, so per-tenant isolation
 * is preserved by the backend (search_path is pinned to the token's schema).
 *
 * No tool mutates data. Write actions (run payroll, create PO, invite user,
 * etc.) are intentionally NOT exposed.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { KuzaClient, KuzaError } from './client.js';

const baseUrl = process.env.KUZA_API_URL || 'http://localhost:3000';
const client = new KuzaClient({
  baseUrl,
  apiToken: process.env.KUZA_API_TOKEN,
  token: process.env.KUZA_TOKEN,
  email: process.env.KUZA_EMAIL,
  password: process.env.KUZA_PASSWORD,
});

const server = new McpServer({ name: 'kuza', version: '0.1.0' });

/** Wrap a tool body so any failure is returned as a clean MCP error result. */
function tool(
  fn: () => Promise<unknown>,
): Promise<{ content: { type: 'text'; text: string }[]; isError?: boolean }> {
  return fn().then(
    (data) => ({ content: [{ type: 'text' as const, text: stringify(data) }] }),
    (err) => ({
      content: [
        {
          type: 'text' as const,
          text:
            err instanceof KuzaError && err.status === 401
              ? 'Not authorized. Check KUZA_API_TOKEN (it may have been revoked), or KUZA_TOKEN / KUZA_EMAIL+KUZA_PASSWORD. A pasted KUZA_TOKEN cannot be refreshed — issue a KUZA_API_TOKEN from Settings → API for a long-running connection.'
              : `Kuza request failed: ${err?.message ?? err}`,
        },
      ],
      isError: true,
    }),
  );
}

function stringify(data: unknown): string {
  if (typeof data === 'string') return data;
  return JSON.stringify(data, null, 2);
}

// 1) Free-form Q&A — the full Kuza Copilot, optionally scoped to a branch.
server.registerTool(
  'ask_kuza',
  {
    title: 'Ask Kuza',
    description:
      'Ask a plain-language question about the business (sales, cash, profit, ' +
      'stock, customers, staff, HR/payroll, branches). Optionally scope to one ' +
      'branch by id. Read-only. Returns the answer and, when relevant, a chart ' +
      'or table computed from real tenant data.',
    inputSchema: {
      question: z.string().min(3).describe('The business question to ask.'),
      branchId: z
        .string()
        .optional()
        .describe('Optional branch id to scope the answer to.'),
    },
  },
  ({ question, branchId }) => tool(() => client.askCopilot(question, branchId)),
);

// 2) Full business digest.
server.registerTool(
  'get_business_digest',
  {
    title: 'Business digest',
    description:
      'Get the full plain-language business digest: cash position, profit this ' +
      'month, top debtors, low stock, sales trend, overdue AR, top items, and ' +
      'employee count. Read-only.',
    inputSchema: {},
  },
  () => tool(() => client.getDigest()),
);

// 3) Sales summary (derived from the digest).
server.registerTool(
  'get_sales_summary',
  {
    title: 'Sales summary',
    description:
      'Get this-month-vs-last-month sales trend, best-selling items this month, ' +
      'and total overdue receivables. Read-only.',
    inputSchema: {},
  },
  () =>
    tool(async () => {
      const d = await client.getDigest();
      return {
        currency: d?.currency,
        salesTrend: d?.salesTrend,
        topItems: d?.topItems,
        overdue: d?.overdueTotal,
      };
    }),
);

// 4) Inventory status (derived from the digest).
server.registerTool(
  'get_inventory_status',
  {
    title: 'Inventory status',
    description:
      'Get items at or below their reorder point (low stock) plus overall ' +
      'inventory value/counts. Read-only.',
    inputSchema: {},
  },
  () =>
    tool(async () => {
      const d = await client.getDigest();
      return { currency: d?.currency, lowStock: d?.lowStock ?? [] };
    }),
);

// 5) Branch list.
server.registerTool(
  'get_branch_list',
  {
    title: 'Branch list',
    description:
      'List the branches for this business (id and name), for use as the ' +
      'branchId argument to ask_kuza. Read-only.',
    inputSchema: {},
  },
  () =>
    tool(async () => {
      const branches = await client.getBranches();
      const rows = Array.isArray(branches) ? branches : (branches?.items ?? []);
      return rows.map((b: any) => ({ id: b.id, name: b.name }));
    }),
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdout is reserved for the MCP protocol; log to stderr only.
  console.error(`Kuza MCP server started (API: ${baseUrl}).`);
}

main().catch((err) => {
  console.error('Fatal: failed to start Kuza MCP server:', err);
  process.exit(1);
});
