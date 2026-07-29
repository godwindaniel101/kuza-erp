import { api } from '@/lib/api';

// ── Types (mirror backend/src/modules/agents) ──────────────────────────────
export type AgentStatus = 'active' | 'paused';
export type ChannelType =
  | 'whatsapp'
  | 'instagram'
  | 'tiktok'
  | 'messenger'
  | 'telegram'
  | 'webchat';
export type ChannelStatus = 'connected' | 'disconnected' | 'pending' | 'error';
export type ConversationStatus = 'open' | 'needs_human' | 'human' | 'closed';

export interface Agent {
  id: string;
  name: string;
  avatarUrl?: string;
  tone?: string;
  voice?: string;
  languages?: string[];
  model?: string;
  temperature?: number;
  systemPromptExtras?: string;
  guardrails?: Record<string, any>;
  status: AgentStatus;
  enabledCapabilities?: string[];
  createdAt: string;
}

export interface ChannelConnection {
  id: string;
  type: ChannelType;
  displayName?: string;
  status: ChannelStatus;
  externalRef?: string;
  agentId?: string;
  config?: Record<string, any>;
  createdAt: string;
}

export interface Conversation {
  id: string;
  channel: ChannelType;
  customerExternalId: string;
  customerName?: string;
  agentId?: string;
  status: ConversationStatus;
  assignedHumanUserId?: string;
  lastMessageAt?: string;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  direction: 'inbound' | 'outbound';
  author: 'customer' | 'agent' | 'human';
  content: string;
  createdAt: string;
}

export interface AgentAction {
  id: string;
  agentId?: string;
  conversationId?: string;
  tool: string;
  moneyPath: boolean;
  status: 'ok' | 'blocked' | 'pending_approval' | 'error';
  reason?: string;
  createdAt: string;
}

export interface KnowledgeDoc {
  id: string;
  agentId?: string;
  title: string;
  type: 'faq' | 'policy' | 'catalog' | 'freeform';
  content?: string;
  sourceRef?: string;
  status: 'active' | 'archived';
  createdAt: string;
}

export interface Plugin {
  key: string;
  kind: 'channel' | 'capability';
  name: string;
  description: string;
  status: 'live' | 'stub';
  phase: number;
  moneyPath?: boolean;
  requiresHumanApproval?: boolean;
  icon?: string;
}

type Envelope<T> = { success: boolean; data: T };

const unwrap = <T>(res: any): T => (res?.data !== undefined ? res.data : res);

// ── Plugins ─────────────────────────────────────────────────────────────────
export async function fetchPlugins() {
  const res = await api.get<Envelope<{
    channels: Plugin[];
    capabilities: Plugin[];
    readOnlyCapabilityKeys: string[];
  }>>('/ai/plugins');
  return unwrap<{ channels: Plugin[]; capabilities: Plugin[]; readOnlyCapabilityKeys: string[] }>(res);
}

// ── Agents ────────────────────────────────────────────────────────────────
export async function fetchAgents() {
  return unwrap<Agent[]>(await api.get<Envelope<Agent[]>>('/ai/agents'));
}
export async function createAgent(body: Partial<Agent>) {
  return unwrap<Agent>(await api.post<Envelope<Agent>>('/ai/agents', body));
}
export async function updateAgent(id: string, body: Partial<Agent>) {
  return unwrap<Agent>(await api.patch<Envelope<Agent>>(`/ai/agents/${id}`, body));
}
export async function setAgentStatus(id: string, status: AgentStatus) {
  const action = status === 'active' ? 'activate' : 'pause';
  return unwrap<Agent>(await api.post<Envelope<Agent>>(`/ai/agents/${id}/${action}`, {}));
}
export async function deleteAgent(id: string) {
  return api.delete(`/ai/agents/${id}`);
}

// ── Channels ────────────────────────────────────────────────────────────────
export async function fetchChannels() {
  return unwrap<ChannelConnection[]>(await api.get<Envelope<ChannelConnection[]>>('/ai/channels'));
}
export async function createChannel(body: Partial<ChannelConnection>) {
  return unwrap<ChannelConnection>(await api.post<Envelope<ChannelConnection>>('/ai/channels', body));
}
export type ConnectResult =
  | { mode: 'oauth'; authorizeUrl: string }
  | { mode: 'token'; provider: 'telegram' }
  | { mode: 'connected'; connection: ChannelConnection; embedSnippet?: string };

export async function connectChannel(id: string) {
  return unwrap<ConnectResult>(await api.post<Envelope<ConnectResult>>(`/ai/channels/${id}/connect`, {}));
}
export async function connectTelegram(id: string, botToken: string) {
  return unwrap<ChannelConnection>(
    await api.post<Envelope<ChannelConnection>>(`/ai/channels/${id}/connect/telegram`, { botToken }),
  );
}
export async function disconnectChannel(id: string) {
  return unwrap<ChannelConnection>(await api.post<Envelope<ChannelConnection>>(`/ai/channels/${id}/disconnect`, {}));
}
export async function updateChannel(id: string, body: Partial<ChannelConnection>) {
  return unwrap<ChannelConnection>(await api.patch<Envelope<ChannelConnection>>(`/ai/channels/${id}`, body));
}

// ── Knowledge ───────────────────────────────────────────────────────────────
export async function fetchKnowledge(agentId?: string) {
  const q = agentId ? `?agentId=${agentId}` : '';
  return unwrap<KnowledgeDoc[]>(await api.get<Envelope<KnowledgeDoc[]>>(`/ai/knowledge${q}`));
}
export async function createKnowledge(body: Partial<KnowledgeDoc>) {
  return unwrap<KnowledgeDoc>(await api.post<Envelope<KnowledgeDoc>>('/ai/knowledge', body));
}
export async function deleteKnowledge(id: string) {
  return api.delete(`/ai/knowledge/${id}`);
}

// ── Conversations ───────────────────────────────────────────────────────────
export async function fetchConversations(status?: string) {
  const q = status ? `?status=${status}` : '';
  return unwrap<Conversation[]>(await api.get<Envelope<Conversation[]>>(`/ai/conversations${q}`));
}
export async function fetchMessages(id: string) {
  return unwrap<Message[]>(await api.get<Envelope<Message[]>>(`/ai/conversations/${id}/messages`));
}
export async function fetchPendingActions() {
  return unwrap<AgentAction[]>(await api.get<Envelope<AgentAction[]>>('/ai/conversations/pending-actions'));
}
export async function sendInbound(body: {
  message: string;
  agentId?: string;
  conversationId?: string;
  channel?: ChannelType;
  customerExternalId?: string;
}) {
  return unwrap<{ conversation: Conversation; reply: Message | null }>(
    await api.post<Envelope<any>>('/ai/conversations/inbound', body),
  );
}
export async function takeOverConversation(id: string) {
  return unwrap<Conversation>(await api.post<Envelope<Conversation>>(`/ai/conversations/${id}/takeover`, {}));
}
export async function humanReply(id: string, message: string) {
  return unwrap<Message>(await api.post<Envelope<Message>>(`/ai/conversations/${id}/reply`, { message }));
}
export async function approveAction(actionId: string) {
  return unwrap<AgentAction>(await api.post<Envelope<AgentAction>>(`/ai/conversations/actions/${actionId}/approve`, {}));
}
export async function rejectAction(actionId: string) {
  return unwrap<AgentAction>(await api.post<Envelope<AgentAction>>(`/ai/conversations/actions/${actionId}/reject`, {}));
}
