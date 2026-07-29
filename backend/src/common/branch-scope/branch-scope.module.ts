import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchUser } from '../entities/branch-user.entity';
import { BranchScopeService } from './branch-scope.service';

/**
 * Global so any module can inject BranchScopeService without re-registering the
 * BranchUser repository. Resolution runs in the request's tenant context.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([BranchUser])],
  providers: [BranchScopeService],
  exports: [BranchScopeService],
})
export class BranchScopeModule {}
