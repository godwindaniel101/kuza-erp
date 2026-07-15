import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { StockMovementsService } from "./stock-movements.service";
import { QueryStockMovementsDto } from "./dto/query-stock-movements.dto";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import {
  RequirePermissions,
  PermissionsGuard,
} from "../../../common/guards/permissions.guard";
import { FeatureGateGuard, RequireApp } from "../../billing/guards/feature-gate.guard";
import { UseGuards as UseGuardsDecorator } from "@nestjs/common";

/**
 * Read-only view over the immutable stock ledger. Deliberately exposes NO
 * create/update/delete endpoints — movements are only written internally by
 * the inflow/order/transfer/adjustment services.
 */
@ApiTags("IMS - Stock Movements")
@Controller("ims/stock-movements")
@UseGuardsDecorator(JwtAuthGuard, PermissionsGuard, FeatureGateGuard)
@RequireApp("items")
@ApiBearerAuth()
export class StockMovementsController {
  constructor(private readonly stockMovementsService: StockMovementsService) {}

  @Get()
  @RequirePermissions("inventory.view")
  @ApiOperation({ summary: "List stock movements (paginated, filterable)" })
  async findAll(@Query() query: QueryStockMovementsDto) {
    const data = await this.stockMovementsService.findAll(query);
    return { success: true, data };
  }

  @Get("reconciliation")
  @RequirePermissions("inventory.view")
  @ApiOperation({
    summary: "Reconcile currentStock against the ledger balance per item",
  })
  async reconciliation() {
    const data = await this.stockMovementsService.getReconciliation();
    return { success: true, data };
  }
}
