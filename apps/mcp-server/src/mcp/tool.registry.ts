import { Injectable } from '@nestjs/common';

import type { ITool } from './tool.interface.js';

@Injectable()
export class ToolRegistry {
  private readonly tools = new Map<string, ITool>();

  register(tool: ITool): void {
    this.tools.set(tool.definition.name, tool);
  }

  getAll(): ITool[] {
    return Array.from(this.tools.values());
  }

  find(name: string): ITool | undefined {
    return this.tools.get(name);
  }
}
