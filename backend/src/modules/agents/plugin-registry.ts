/**
 * Kuza Agents — Plugin registry (code-level).
 *
 * "Plugins" are the connectors an agent is built from. Two kinds:
 *  - CHANNEL plugins  — where the agent talks (WhatsApp, Instagram, …);
 *  - CAPABILITY plugins — what the agent can do (read the catalog, answer from
 *    knowledge, draft an order, take a payment, arrange delivery).
 *
 * This registry is the single vocabulary shared by the runtime (which tools are
 * on the READ-ONLY allowlist), the API (`GET /agents/plugins`) and the frontend
 * Channels/Agents surfaces. Adding a plugin here needs no migration.
 *
 * ── MONEY-PATH SAFETY ─────────────────────────────────────────────────────
 * Every capability declares `moneyPath` and `requiresHumanApproval`. Phase 1
 * ships CONVERSE + READ live; anything that could move money or fulfil an order
 * is `status: 'stub'`, `moneyPath: true`, `requiresHumanApproval: true` — a
 * FRAMEWORK + GUARDED STUB, never autonomous execution. The runtime's allowlist
 * (READ_ONLY_TOOL_KEYS) is derived from this table, so a money-path tool can
 * never be invoked by the model.
 */

export type PluginKind = 'channel' | 'capability';

/** 'live' = wired and usable now; 'stub' = framework present, real integration pending. */
export type PluginStatus = 'live' | 'stub';

export interface PluginDefinition {
  key: string;
  kind: PluginKind;
  name: string;
  description: string;
  status: PluginStatus;
  /** Phase in the KUZA-AGENTS.md roadmap this plugin belongs to. */
  phase: 1 | 2 | 3 | 4 | 5;
  /** Capability only: does this tool touch money / order fulfilment? */
  moneyPath?: boolean;
  /**
   * Capability only: must a HUMAN approve before it executes? Always true for
   * money-path capabilities — the agent may only ever PROPOSE these.
   */
  requiresHumanApproval?: boolean;
  /** Icon hint for the UI (lucide-style name); purely cosmetic. */
  icon?: string;
}

// ── Channel plugins ─────────────────────────────────────────────────────────
export const CHANNEL_PLUGINS: readonly PluginDefinition[] = [
  {
    key: 'webchat',
    kind: 'channel',
    name: 'Web chat',
    description: 'An embeddable chat widget for the business website.',
    status: 'live',
    phase: 1,
    icon: 'message-circle',
  },
  {
    key: 'whatsapp',
    kind: 'channel',
    name: 'WhatsApp',
    description: 'WhatsApp Business Cloud API.',
    status: 'stub',
    phase: 1,
    icon: 'phone',
  },
  {
    key: 'instagram',
    kind: 'channel',
    name: 'Instagram',
    description: 'Instagram DMs via the Messenger Platform.',
    status: 'stub',
    phase: 5,
    icon: 'instagram',
  },
  {
    key: 'messenger',
    kind: 'channel',
    name: 'Messenger',
    description: 'Facebook Messenger via the Messenger Platform.',
    status: 'stub',
    phase: 5,
    icon: 'messenger',
  },
  {
    key: 'telegram',
    kind: 'channel',
    name: 'Telegram',
    description: 'A Telegram bot via the Bot API.',
    status: 'stub',
    phase: 5,
    icon: 'send',
  },
  {
    key: 'tiktok',
    kind: 'channel',
    name: 'TikTok',
    description: 'TikTok messaging / shop DMs.',
    status: 'stub',
    phase: 5,
    icon: 'music',
  },
];

// ── Capability plugins ──────────────────────────────────────────────────────
export const CAPABILITY_PLUGINS: readonly PluginDefinition[] = [
  {
    key: 'knowledge',
    kind: 'capability',
    name: 'Knowledge & FAQ',
    description: 'Answer from the business FAQ, policies and training docs. Read-only.',
    status: 'live',
    phase: 1,
    moneyPath: false,
    requiresHumanApproval: false,
    icon: 'book-open',
  },
  {
    key: 'catalog',
    kind: 'capability',
    name: 'Catalog lookup',
    description: 'Look up products, prices and stock to answer buyers. Read-only.',
    status: 'live',
    phase: 1,
    moneyPath: false,
    requiresHumanApproval: false,
    icon: 'package',
  },
  {
    key: 'orders',
    kind: 'capability',
    name: 'Order taking',
    description:
      'Draft an order from a chat. GUARDED STUB — a human must approve before ' +
      'any order is created (routes through orders.createPendingSale).',
    status: 'stub',
    phase: 2,
    moneyPath: true,
    requiresHumanApproval: true,
    icon: 'shopping-cart',
  },
  {
    key: 'payments',
    kind: 'capability',
    name: 'Payment confirmation',
    description:
      'Confirm a customer paid. GUARDED STUB — payments only ever activate via ' +
      'signature-verified webhooks, NEVER agent-initiated.',
    status: 'stub',
    phase: 2,
    moneyPath: true,
    requiresHumanApproval: true,
    icon: 'credit-card',
  },
  {
    key: 'delivery',
    kind: 'capability',
    name: 'Delivery dispatch',
    description:
      'Arrange delivery once an order is paid. GUARDED STUB — human approval ' +
      'required; no autonomous dispatch.',
    status: 'stub',
    phase: 3,
    moneyPath: true,
    requiresHumanApproval: true,
    icon: 'truck',
  },
];

export const ALL_PLUGINS: readonly PluginDefinition[] = [
  ...CHANNEL_PLUGINS,
  ...CAPABILITY_PLUGINS,
];

const PLUGINS_BY_KEY = new Map<string, PluginDefinition>(
  ALL_PLUGINS.map((p) => [`${p.kind}:${p.key}`, p]),
);

export function getChannelPlugin(key: string): PluginDefinition | undefined {
  return PLUGINS_BY_KEY.get(`channel:${key}`);
}

export function getCapabilityPlugin(key: string): PluginDefinition | undefined {
  return PLUGINS_BY_KEY.get(`capability:${key}`);
}

/**
 * The READ-ONLY tool allowlist the runtime may call. Derived from the registry:
 * a capability is on the allowlist ONLY when it is not a money-path tool. This
 * is the hard boundary — the model can never reach a money-path capability.
 */
export const READ_ONLY_CAPABILITY_KEYS: readonly string[] = CAPABILITY_PLUGINS
  .filter((p) => !p.moneyPath)
  .map((p) => p.key);

/** True if a capability is safe for the read-only runtime to invoke directly. */
export function isReadOnlyCapability(key: string): boolean {
  return READ_ONLY_CAPABILITY_KEYS.includes(key);
}

/** True if a capability moves money / fulfils orders (human-approval only). */
export function isMoneyPathCapability(key: string): boolean {
  return getCapabilityPlugin(key)?.moneyPath === true;
}
