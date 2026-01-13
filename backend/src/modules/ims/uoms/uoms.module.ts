import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UomsController } from './uoms.controller';
import { UomsService } from './uoms.service';
import { Uom } from '../entities/uom.entity';
import { UomConversionsModule } from '../uom-conversions/uom-conversions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Uom]),
    forwardRef(() => UomConversionsModule),
  ],
  controllers: [UomsController],
  providers: [UomsService],
  exports: [UomsService],
})
export class UomsModule {}

