import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { RolesController } from './roles/roles.controller';
import { RolesService } from './roles/roles.service';
import { RolesModule } from './roles/roles.module';
import { InvitationsController } from './invitations/invitations.controller';
import { InvitationsService } from './invitations/invitations.service';
import { InvitationsModule } from './invitations/invitations.module';
import { BranchesController } from './branches/branches.controller';
import { BranchesService } from './branches/branches.service';
import { BranchesModule } from './branches/branches.module';
import { Business } from '../../common/entities/business.entity';
import { Permission } from '../../common/entities/permission.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Business, Permission]),
    RolesModule,
    InvitationsModule,
    BranchesModule,
  ],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}

