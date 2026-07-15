import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from '../../common/entities/user.entity';
import { InvitationsModule } from '../settings/invitations/invitations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    InvitationsModule, // Add InvitationsModule for invitation flow
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
