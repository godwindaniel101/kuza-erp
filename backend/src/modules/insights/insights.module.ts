import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InsightsController } from './insights.controller';
import { InsightsService } from './insights.service';
import { Invoice } from '../invoicing/entities/invoice.entity';
import { Business } from '../../common/entities/business.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Invoice, Business])],
  controllers: [InsightsController],
  providers: [InsightsService],
  exports: [InsightsService],
})
export class InsightsModule {}
