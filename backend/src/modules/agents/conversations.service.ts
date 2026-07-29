import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { AgentAction } from './entities/agent-action.entity';
import { AgentRuntimeService } from './agent-runtime.service';
import { InboundMessageDto, HumanReplyDto } from './dto/runtime.dto';

/**
 * The conversations inbox: threads, messages, human takeover, and the money-path
 * approval queue. Tenant-scoped throughout.
 */
@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation)
    private readonly convoRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(AgentAction)
    private readonly actionRepo: Repository<AgentAction>,
    private readonly runtime: AgentRuntimeService,
  ) {}

  async findAll(status?: string): Promise<Conversation[]> {
    const where = status ? { status: status as any } : {};
    return this.convoRepo.find({
      where,
      order: { lastMessageAt: 'DESC', createdAt: 'DESC' },
      take: 100,
    });
  }

  async findOne(id: string): Promise<Conversation> {
    const convo = await this.convoRepo.findOne({ where: { id } });
    if (!convo) throw new NotFoundException('Conversation not found');
    return convo;
  }

  async messages(id: string): Promise<Message[]> {
    await this.findOne(id);
    return this.messageRepo.find({
      where: { conversationId: id },
      order: { createdAt: 'ASC' },
    });
  }

  /** Audit trail for a conversation (every tool call the agent made). */
  async actions(id: string): Promise<AgentAction[]> {
    await this.findOne(id);
    return this.actionRepo.find({
      where: { conversationId: id },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Handle one inbound customer message end-to-end (used by the test/preview
   * surface and, later, the channel webhooks). Persists the inbound message,
   * runs the READ-ONLY runtime, persists the agent reply, and updates status.
   * The message body is UNTRUSTED — it is stored and passed to the runtime as
   * data only.
   */
  async handleInbound(
    dto: InboundMessageDto,
  ): Promise<{ conversation: Conversation; reply: Message | null }> {
    let convo: Conversation;
    if (dto.conversationId) {
      convo = await this.findOne(dto.conversationId);
    } else {
      convo = this.convoRepo.create({
        channel: dto.channel ?? 'webchat',
        customerExternalId: dto.customerExternalId ?? 'preview',
        agentId: dto.agentId ?? null,
        status: 'open',
      });
      convo = await this.convoRepo.save(convo);
    }

    const agentId = convo.agentId ?? dto.agentId;
    if (!agentId) {
      throw new BadRequestException(
        'No agent is assigned to this conversation.',
      );
    }

    // Persist the untrusted inbound message.
    await this.messageRepo.save(
      this.messageRepo.create({
        conversationId: convo.id,
        direction: 'inbound',
        author: 'customer',
        content: dto.message,
      }),
    );

    // A human has taken over → the agent stays silent.
    if (convo.status === 'human') {
      convo.lastMessageAt = new Date();
      await this.convoRepo.save(convo);
      return { conversation: convo, reply: null };
    }

    const result = await this.runtime.respond(agentId, dto.message, {}, convo.id);

    let reply: Message | null = null;
    if (result.reply) {
      reply = await this.messageRepo.save(
        this.messageRepo.create({
          conversationId: convo.id,
          direction: 'outbound',
          author: 'agent',
          content: result.reply,
          meta: { actionIds: result.actionIds },
        }),
      );
    }

    convo.lastMessageAt = new Date();
    if (result.escalated) convo.status = 'needs_human';
    await this.convoRepo.save(convo);

    return { conversation: convo, reply };
  }

  /** A human operator claims a conversation (agent stops auto-replying). */
  async takeOver(id: string, userId?: string): Promise<Conversation> {
    const convo = await this.findOne(id);
    convo.status = 'human';
    convo.assignedHumanUserId = userId ?? convo.assignedHumanUserId;
    return this.convoRepo.save(convo);
  }

  /** Hand a conversation back to the agent. */
  async release(id: string): Promise<Conversation> {
    const convo = await this.findOne(id);
    convo.status = 'open';
    convo.assignedHumanUserId = null;
    return this.convoRepo.save(convo);
  }

  /** A human operator posts a reply on a conversation they've taken over. */
  async humanReply(
    id: string,
    dto: HumanReplyDto,
    userId?: string,
  ): Promise<Message> {
    const convo = await this.findOne(id);
    if (convo.status !== 'human') {
      // Auto-claim on first human reply so the agent doesn't talk over the human.
      convo.status = 'human';
      convo.assignedHumanUserId = userId ?? null;
    }
    convo.lastMessageAt = new Date();
    await this.convoRepo.save(convo);

    return this.messageRepo.save(
      this.messageRepo.create({
        conversationId: id,
        direction: 'outbound',
        author: 'human',
        content: dto.message,
        meta: { userId },
      }),
    );
  }

  async close(id: string): Promise<Conversation> {
    const convo = await this.findOne(id);
    convo.status = 'closed';
    return this.convoRepo.save(convo);
  }

  // ── Money-path approval queue (GUARDED STUB) ───────────────────────────────

  /** Every action awaiting a human decision, across all conversations. */
  async pendingActions(): Promise<AgentAction[]> {
    return this.actionRepo.find({
      where: { status: 'pending_approval' },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  /**
   * A human APPROVES a pending money-path action. GUARDED STUB: this records the
   * human decision on the audit row but does NOT itself move money or fulfil an
   * order — that wiring lands in Phase 2.
   *
   * TODO(human-review): money-path — on approval, route to
   * orders.createPendingSale (a PENDING sale, never auto-paid); payment must
   * still activate only via a signature-verified webhook, never here.
   */
  async approveAction(
    actionId: string,
    userId?: string,
  ): Promise<AgentAction> {
    const action = await this.actionRepo.findOne({ where: { id: actionId } });
    if (!action) throw new NotFoundException('Action not found');
    if (action.status !== 'pending_approval') {
      throw new BadRequestException('Action is not awaiting approval.');
    }
    action.reviewedByUserId = userId ?? null;
    action.reviewedAt = new Date();
    action.output = {
      ...(action.output ?? {}),
      approved: true,
      note: 'Approved by human. Order/payment execution is a Phase-2 guarded stub.',
    };
    // Deliberately NOT flipping to a "done" state that implies money moved —
    // it stays as an approved, human-reviewed record until the commerce phase
    // wires the actual (idempotent) createPendingSale call.
    action.status = 'ok';
    return this.actionRepo.save(action);
  }

  /** A human REJECTS a pending money-path action. */
  async rejectAction(actionId: string, userId?: string): Promise<AgentAction> {
    const action = await this.actionRepo.findOne({ where: { id: actionId } });
    if (!action) throw new NotFoundException('Action not found');
    if (action.status !== 'pending_approval') {
      throw new BadRequestException('Action is not awaiting approval.');
    }
    action.reviewedByUserId = userId ?? null;
    action.reviewedAt = new Date();
    action.status = 'blocked';
    action.output = { ...(action.output ?? {}), approved: false };
    return this.actionRepo.save(action);
  }
}
