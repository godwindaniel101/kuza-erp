import { Controller, Get, Param, UseGuards, Request, Post, Body, Patch, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions, PermissionsGuard } from '../../common/guards/permissions.guard';
import { UseGuards as UseGuardsDecorator } from '@nestjs/common';

@ApiTags('Users')
@Controller('users')
@UseGuardsDecorator(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions('users.view')
  @ApiOperation({ summary: 'Get all users' })
  async findAll(@Request() req) {
    const users = await this.usersService.findAllByRestaurant(req.user.businessId);
    return {
      success: true,
      data: users,
    };
  }

  @Post()
  @RequirePermissions('users.create')
  @ApiOperation({ summary: 'Create user' })
  async create(@Request() req, @Body() body: { name: string; email: string; password: string }) {
    const user = await this.usersService.create(req.user.businessId, body);
    return {
      success: true,
      data: user,
    };
  }

  @Get(':id')
  @RequirePermissions('users.view')
  @ApiOperation({ summary: 'Get user by ID' })
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findOne(id);
    return {
      success: true,
      data: user,
    };
  }
}

