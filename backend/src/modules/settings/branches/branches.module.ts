import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchesController } from './branches.controller';
import { BranchesService } from './branches.service';
import { Branch } from '../../../common/entities/branch.entity';
import { Order } from '../../rms/entities/order.entity';
import { BranchInventoryItem } from '../../ims/entities/branch-inventory-item.entity';
import { BulkUploadLog } from '../../ims/entities/bulk-upload-log.entity';
import { BranchUser } from '../../../common/entities/branch-user.entity';
import { User } from '../../../common/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Branch, Order, BranchInventoryItem, BulkUploadLog, BranchUser, User])],
  controllers: [BranchesController],
  providers: [BranchesService],
  exports: [BranchesService],
})
export class BranchesModule {}

