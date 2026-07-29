import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from './entities/agent.entity';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { getCapabilityPlugin } from './plugin-registry';

/**
 * CRUD for agent personas. Tenant-scoped: every read/write goes through the
 * request-pinned tenant connection (the repository's manager), so rows never
 * cross tenants.
 */
@Injectable()
export class AgentsService {
  constructor(
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
  ) {}

  /**
   * Reject any capability key the owner tries to enable that is not a real
   * capability plugin. Money-path capabilities ARE allowed to be enabled here —
   * enabling them only unlocks the human-approval flow, never autonomous
   * execution (enforced in the runtime + on the approval endpoint).
   */
  private validateCapabilities(keys?: string[]): void {
    if (!keys) return;
    const unknown = keys.filter((k) => !getCapabilityPlugin(k));
    if (unknown.length) {
      throw new BadRequestException(
        `Unknown capability plugin(s): ${unknown.join(', ')}`,
      );
    }
  }

  async findAll(): Promise<Agent[]> {
    return this.agentRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Agent> {
    const agent = await this.agentRepo.findOne({ where: { id } });
    if (!agent) throw new NotFoundException('Agent not found');
    return agent;
  }

  async create(dto: CreateAgentDto): Promise<Agent> {
    this.validateCapabilities(dto.enabledCapabilities);
    const agent = this.agentRepo.create({
      ...dto,
      status: dto.status ?? 'active',
    });
    return this.agentRepo.save(agent);
  }

  async update(id: string, dto: UpdateAgentDto): Promise<Agent> {
    this.validateCapabilities(dto.enabledCapabilities);
    const agent = await this.findOne(id);
    Object.assign(agent, dto);
    return this.agentRepo.save(agent);
  }

  /** Pause/activate — a pause immediately stops the agent auto-replying. */
  async setStatus(id: string, status: 'active' | 'paused'): Promise<Agent> {
    const agent = await this.findOne(id);
    agent.status = status;
    return this.agentRepo.save(agent);
  }

  async remove(id: string): Promise<void> {
    const agent = await this.findOne(id);
    await this.agentRepo.remove(agent);
  }
}
