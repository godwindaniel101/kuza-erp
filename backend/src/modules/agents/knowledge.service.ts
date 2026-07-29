import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentKnowledgeDoc } from './entities/agent-knowledge-doc.entity';
import {
  CreateKnowledgeDocDto,
  UpdateKnowledgeDocDto,
} from './dto/knowledge-doc.dto';

/**
 * Training material CRUD (FAQ / policy / catalog snapshot / freeform). Read at
 * runtime to ground the agent's answers; only humans write it here.
 */
@Injectable()
export class KnowledgeService {
  constructor(
    @InjectRepository(AgentKnowledgeDoc)
    private readonly docRepo: Repository<AgentKnowledgeDoc>,
  ) {}

  async findAll(agentId?: string): Promise<AgentKnowledgeDoc[]> {
    const where = agentId ? [{ agentId }, { agentId: null as any }] : {};
    return this.docRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<AgentKnowledgeDoc> {
    const doc = await this.docRepo.findOne({ where: { id } });
    if (!doc) throw new NotFoundException('Knowledge document not found');
    return doc;
  }

  async create(dto: CreateKnowledgeDocDto): Promise<AgentKnowledgeDoc> {
    const doc = this.docRepo.create({
      ...dto,
      type: dto.type ?? 'freeform',
      status: 'active',
    });
    return this.docRepo.save(doc);
  }

  async update(
    id: string,
    dto: UpdateKnowledgeDocDto,
  ): Promise<AgentKnowledgeDoc> {
    const doc = await this.findOne(id);
    Object.assign(doc, dto);
    return this.docRepo.save(doc);
  }

  async archive(id: string): Promise<AgentKnowledgeDoc> {
    const doc = await this.findOne(id);
    doc.status = 'archived';
    return this.docRepo.save(doc);
  }

  async remove(id: string): Promise<void> {
    const doc = await this.findOne(id);
    await this.docRepo.remove(doc);
  }
}
