import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InsightsController } from './insights.controller';
import { InsightsService } from './insights.service';
import { Invoice } from '../invoicing/entities/invoice.entity';
import { Business } from '../../common/entities/business.entity';
import { AiModule } from '../../common/ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([Invoice, Business]), AiModule],
  controllers: [InsightsController],
  providers: [InsightsService],
  exports: [InsightsService],
})
export class InsightsModule {}
