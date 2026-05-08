import { Module } from '@nestjs/common';

import { McpController } from './mcp.controller.js';
import { McpService } from './mcp.service.js';
import { ToolRegistry } from './tool.registry.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { KomerciaSessionService } from '../auth/komercia-session.service.js';
import { NodeTokenRefresher } from '../auth/node-token-refresher.service.js';
import { SessionsController } from '../auth/sessions.controller.js';
import { DownloadMediaArchiveTool } from '../tools/download-media-archive/download-media-archive.tool.js';
import { ExportCategoriesTool } from '../tools/export-categories/export-categories.tool.js';
import { ExportCustomersTool } from '../tools/export-customers/export-customers.tool.js';
import { ExportInventoryMovementsTool } from '../tools/export-inventory-movements/export-inventory-movements.tool.js';
import { ExportOrdersTool } from '../tools/export-orders/export-orders.tool.js';
import { ExportProductsTool } from '../tools/export-products/export-products.tool.js';
import { ExportThemeConfigTool } from '../tools/export-theme-config/export-theme-config.tool.js';
import { GetStoreInfoTool } from '../tools/get-store-info/get-store-info.tool.js';
import { ListPaymentGatewaysTool } from '../tools/list-payment-gateways/list-payment-gateways.tool.js';
import { SuggestAlternativePlatformsTool } from '../tools/suggest-alternative-platforms/suggest-alternative-platforms.tool.js';
import { ValidateKomerciaApisTool } from '../tools/validate-komercia-apis/validate-komercia-apis.tool.js';

@Module({
  controllers: [McpController, SessionsController],
  providers: [
    AuthGuard,
    KomerciaSessionService,
    NodeTokenRefresher,
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
  exports: [McpService, ToolRegistry, KomerciaSessionService, NodeTokenRefresher],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- NestJS modules are decorator-driven empty classes
export class McpModule {}
