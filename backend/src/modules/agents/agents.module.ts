import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agent } from './entities/agent.entity';
import { ChannelConnection } from './entities/channel-connection.entity';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { AgentAction } from './entities/agent-action.entity';
import { AgentKnowledgeDoc } from './entities/agent-knowledge-doc.entity';
import { AgentsService } from './agents.service';
import { ChannelsService } from './channels.service';
import { ChannelOAuthService } from './channel-oauth.service';
import { KnowledgeService } from './knowledge.service';
import { ConversationsService } from './conversations.service';
import { AgentRuntimeService } from './agent-runtime.service';
import { AgentsController } from './agents.controller';
import { ChannelsController } from './channels.controller';
import { ChannelOAuthController } from './channel-oauth.controller';
import { KnowledgeController } from './knowledge.controller';
import { ConversationsController } from './conversations.controller';
import { PluginsController } from './plugins.controller';

/**
 * Kuza Agents — the foundation of Kuza's AI Operating System. See
 * docs/KUZA-AGENTS.md. FeatureGateGuard (from BillingModule) and LlmService
 * (from the @Global AiModule) resolve without importing them here; the AI
 * runtime is READ-ONLY and money-path capabilities are guarded stubs.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Agent,
      ChannelConnection,
      Conversation,
      Message,
      AgentAction,
      AgentKnowledgeDoc,
    ]),
  ],
  controllers: [
    AgentsController,
    ChannelsController,
    ChannelOAuthController,
    KnowledgeController,
    ConversationsController,
    PluginsController,
  ],
  providers: [
    AgentsService,
    ChannelsService,
    ChannelOAuthService,
    KnowledgeService,
    ConversationsService,
    AgentRuntimeService,
  ],
  exports: [AgentsService, AgentRuntimeService],
})
export class AgentsModule {}
