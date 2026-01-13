import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { I18n, I18nContext } from 'nestjs-i18n';
import { MenusService } from './menus.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { AiDesignDto } from './dto/ai-design.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequirePermissions, PermissionsGuard } from '../../../common/guards/permissions.guard';
import { UseGuards as UseGuardsDecorator } from '@nestjs/common';

@ApiTags('RMS - Menus')
@Controller('rms/menus')
@UseGuardsDecorator(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class MenusController {
  constructor(private readonly menusService: MenusService) {}

  @Post()
  @RequirePermissions('menus.create')
  @ApiOperation({ summary: 'Create a new menu' })
  async create(@Request() req, @Body() createMenuDto: CreateMenuDto, @I18n() i18n: I18nContext) {
    const result = await this.menusService.create(req.user.businessId, createMenuDto);
    return {
      success: true,
      data: result.menu,
      menu_id: result.menu.id,
      created_items: result.createdItems,
      message: result.createdItems.length > 0
        ? i18n.t('menuCreatedWithItems', { args: { count: result.createdItems.length } }) || `Menu created with ${result.createdItems.length} item(s)!`
        : i18n.t('common.created'),
    };
  }

  @Get()
  @RequirePermissions('menus.view')
  @ApiOperation({ summary: 'Get all menus' })
  async findAll(@Request() req, @Query('lang') lang?: string) {
    const menus = await this.menusService.findAll(req.user.businessId);
    return {
      success: true,
      data: menus,
    };
  }

  @Post('ai/design')
  @RequirePermissions('menus.edit')
  @ApiOperation({ summary: 'Design menu template with AI' })
  async designWithAi(
    @Request() req,
    @Body() body: AiDesignDto,
    @I18n() i18n: I18nContext,
  ) {
    // For now, return a mock response. In production, this would call an AI service
    // TODO: Integrate with actual AI service
    try {
      // Mock AI design response
      const mockThemeSettings = {
        primaryColor: '#dc2626',
        fontFamily: 'Inter',
        layout: 'modern',
      };

      // Apply theme to menu if menu_id provided
      if (body.menu_id) {
        await this.menusService.update(body.menu_id, req.user.businessId, {
          themeSettings: mockThemeSettings,
        });
      }

      return {
        success: true,
        design_spec: {
          theme_settings: mockThemeSettings,
        },
        message: i18n.t('aiDesignApplied') || 'Menu design has been updated based on your request.',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Failed to generate design',
      };
    }
  }

  @Get(':id')
  @RequirePermissions('menus.view')
  @ApiOperation({ summary: 'Get menu by ID' })
  async findOne(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    const menu = await this.menusService.findOne(id, req.user.businessId);
    return {
      success: true,
      data: menu,
    };
  }

  @Patch(':id')
  @RequirePermissions('menus.edit')
  @ApiOperation({ summary: 'Update menu' })
  async update(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateMenuDto: UpdateMenuDto,
    @I18n() i18n: I18nContext,
  ) {
    const menu = await this.menusService.update(id, req.user.businessId, updateMenuDto);
    return {
      success: true,
      data: menu,
      message: i18n.t('common.updated'),
    };
  }

  @Delete(':id')
  @RequirePermissions('menus.delete')
  @ApiOperation({ summary: 'Delete menu' })
  async remove(@Request() req, @Param('id', ParseUUIDPipe) id: string, @I18n() i18n: I18nContext) {
    await this.menusService.remove(id, req.user.businessId);
    return {
      success: true,
      message: i18n.t('common.deleted'),
    };
  }
}
