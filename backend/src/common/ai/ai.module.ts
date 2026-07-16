import { Global, Module } from '@nestjs/common';
import { LlmService } from './llm.service';

/**
 * Provider-agnostic AI gateway. Global so any module can inject LlmService
 * without re-importing. The active LLM provider is selected by env
 * (AI_PROVIDER) — no code change is needed to switch providers.
 */
@Global()
@Module({
  providers: [LlmService],
  exports: [LlmService],
})
export class AiModule {}
