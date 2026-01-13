import { Controller, Get, Post, Delete, Body, Param, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequirePermissions, PermissionsGuard } from '../../../common/guards/permissions.guard';
import { UseGuards as UseGuardsDecorator } from '@nestjs/common';

@ApiTags('IMS - Categories')
@Controller('ims/categories')
@UseGuardsDecorator(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @RequirePermissions('inventory.view')
  @ApiOperation({ summary: 'Get all categories' })
  async findAll(@Request() req) {
    const cats = await this.categoriesService.findAll(req.user.businessId);
    return { success: true, data: cats };
  }

  @Post()
  @RequirePermissions('inventory.create')
  @ApiOperation({ summary: 'Create category' })
  async create(@Request() req, @Body() body: { name: string }) {
    const cat = await this.categoriesService.create(req.user.businessId, body);
    return { success: true, data: cat };
  }

  @Get(':id/subcategories')
  @RequirePermissions('inventory.view')
  @ApiOperation({ summary: 'Get subcategories by category' })
  async findSubs(@Request() req, @Param('id') id: string) {
    const subs = await this.categoriesService.findSubcategories(req.user.businessId, id);
    return { success: true, data: subs };
  }

  @Post(':id/subcategories')
  @RequirePermissions('inventory.create')
  @ApiOperation({ summary: 'Create subcategory for category' })
  async createSub(@Request() req, @Param('id') id: string, @Body() body: { name: string }) {
    const sub = await this.categoriesService.createSubcategory(req.user.businessId, id, body);
    return { success: true, data: sub };
  }

  @Delete(':categoryId/subcategories/:subcategoryId')
  @RequirePermissions('inventory.delete')
  @ApiOperation({ summary: 'Delete subcategory' })
  async deleteSub(@Request() req, @Param('subcategoryId') subcategoryId: string) {
    await this.categoriesService.deleteSubcategory(req.user.businessId, subcategoryId);
    return { success: true, message: 'Subcategory deleted successfully' };
  }
}
