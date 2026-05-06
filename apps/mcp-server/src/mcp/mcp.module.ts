import { Module } from '@nestjs/common';
import { McpController } from './mcp.controller.js';
import { McpService } from './mcp.service.js';
import { ToolRegistry } from './tool.registry.js';
import { KomerciaSessionService } from '../auth/komercia-session.service.js';
import { GetStoreInfoTool } from '../tools/get-store-info/get-store-info.tool.js';
import { ValidateKomerciaApisTool } from '../tools/validate-komercia-apis/validate-komercia-apis.tool.js';
import { ExportProductsTool } from '../tools/export-products/export-products.tool.js';
import { ExportOrdersTool } from '../tools/export-orders/export-orders.tool.js';
import { ExportCustomersTool } from '../tools/export-customers/export-customers.tool.js';
import { ExportCategoriesTool } from '../tools/export-categories/export-categories.tool.js';
import { ExportInventoryMovementsTool } from '../tools/export-inventory-movements/export-inventory-movements.tool.js';
import { ExportThemeConfigTool } from '../tools/export-theme-config/export-theme-config.tool.js';
import { ListPaymentGatewaysTool } from '../tools/list-payment-gateways/list-payment-gateways.tool.js';
import { DownloadMediaArchiveTool } from '../tools/download-media-archive/download-media-archive.tool.js';
import { SuggestAlternativePlatformsTool } from '../tools/suggest-alternative-platforms/suggest-alternative-platforms.tool.js';

@Module({
  controllers: [McpController],
  providers: [
    KomerciaSessionService,
    ToolRegistry,
    McpService,
    GetStoreInfoTool,
    ValidateKomerciaApisTool,
    ExportProductsTool,
    ExportOrdersTool,
    ExportCustomersTool,
    ExportCategoriesTool,
    ExportInventoryMovementsTool,
    ExportThemeConfigTool,
    ListPaymentGatewaysTool,
    DownloadMediaArchiveTool,
    SuggestAlternativePlatformsTool,
  ],
  exports: [McpService, ToolRegistry, KomerciaSessionService],
})
export class McpModule {}
