import { Controller, Get, Query, Request } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { StockMovementsService } from "./stock-movements.service";
import { QueryStockMovementsDto } from "./dto/query-stock-movements.dto";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { BranchScopeService } from "../../../common/branch-scope/branch-scope.service";
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
@RequireApp("items", "rms", "shop")
@ApiBearerAuth()
export class StockMovementsController {
  constructor(
    private readonly stockMovementsService: StockMovementsService,
    private readonly branchScopeService: BranchScopeService,
  ) {}

  @Get()
  @RequirePermissions("inventory.view")
  @ApiOperation({ summary: "List stock movements (paginated, filterable)" })
  async findAll(@Request() req: any, @Query() query: QueryStockMovementsDto) {
    // Branch-scoped users only see movements for their allowed branches; the
    // requested branch filter is intersected with that set in the service.
    const allowed = await this.branchScopeService.allowedBranchIds(req.user);
    const data = await this.stockMovementsService.findAll(query, allowed);
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
