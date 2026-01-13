import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UomConversionsController } from './uom-conversions.controller';
import { UomConversionsService } from './uom-conversions.service';
import { UomConversion } from '../entities/uom-conversion.entity';
import { Uom } from '../entities/uom.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UomConversion, Uom])],
  controllers: [UomConversionsController],
  providers: [UomConversionsService],
  exports: [UomConversionsService],
})
export class UomConversionsModule {}
