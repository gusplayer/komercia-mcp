import type { MerchantContext } from '../auth/merchant-context.js';
import type { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export type { CallToolResult };

export interface ITool {
  readonly definition: Tool;
  execute(args: unknown, merchantContext: MerchantContext): Promise<CallToolResult>;
}
