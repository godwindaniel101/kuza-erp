import { Controller, Get, Param, UseGuards, Request, Post, Body, Patch, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions, PermissionsGuard } from '../../common/guards/permissions.guard';
import { UseGuards as UseGuardsDecorator } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';

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
    const users = await this.usersService.findAllByBusiness(req.user.businessId);
    return {
      success: true,
      data: users,
    };
  }

  @Post()
  @RequirePermissions('users.create')
  @ApiOperation({ summary: 'Create user via invitation (recommended)' })
  async create(@Request() req, @Body() body: { 
    name?: string; 
    email: string; 
    roleId?: string;
  }) {
    const result = await this.usersService.createWithInvitation(
      req.user.id, // invitedById 
      req.user.tenantId, // tenantId
      body
    );
    return {
      success: true,
      data: result,
    };
  }

  @Post('direct')
  @RequirePermissions('users.create')
  @ApiOperation({ summary: 'Create user directly (legacy - not recommended)' })
  async createDirect(@Request() req, @Body() body: { name: string; email: string; password: string }) {
    const user = await this.usersService.create(req.user.businessId, body);
    return {
      success: true,
      data: user,
    };
  }

  @Get(':id')
  @RequirePermissions('users.view')
  @ApiOperation({ summary: 'Get user by ID' })
  async findOne(@Param('id') id: string, @Request() req) {
    const user = await this.usersService.findOne(id, req.user.businessId);
    return {
      success: true,
      data: user,
    };
  }

  @Patch(':id')
  @RequirePermissions('users.edit')
  @ApiOperation({ summary: 'Update user (name, active status, role assignments)' })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateUserDto,
    @Request() req,
  ) {
    const user = await this.usersService.update(id, req.user.businessId, body);
    return {
      success: true,
      data: user,
    };
  }

  @Delete(':id')
  @RequirePermissions('users.delete')
  @ApiOperation({ summary: 'Delete user (tenant record only; cannot delete self)' })
  async remove(@Param('id') id: string, @Request() req) {
    const result = await this.usersService.remove(
      id,
      req.user.businessId,
      req.user.sub,
    );
    return {
      success: true,
      data: result,
    };
  }
}

