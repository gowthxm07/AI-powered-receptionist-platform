import { AITool, AIToolDefinition } from '../types/tool.types';

export class AIToolRegistry {
  private tools = new Map<string, AITool>();

  /**
   * Registers an AI tool into the active registry.
   */
  public register(tool: AITool): void {
    if (this.tools.has(tool.name)) {
      console.warn(`[AIToolRegistry] Overwriting existing tool registration: '${tool.name}'`);
    }
    this.tools.set(tool.name, tool);
  }

  /**
   * Retrieves a registered tool by exact name.
   */
  public getTool(name: string): AITool | undefined {
    return this.tools.get(name);
  }

  /**
   * Checks if a tool is registered.
   */
  public hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Returns schema definitions for all registered tools, formatted for model discovery / tool calling.
   */
  public getAvailableTools(): AIToolDefinition[] {
    return Array.from(this.tools.values()).map((tool) => tool.definition);
  }

  /**
   * Returns all registered tool instances.
   */
  public getAllTools(): AITool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Clears all registered tools (primarily used in testing).
   */
  public clear(): void {
    this.tools.clear();
  }
}

// Singleton global tool registry instance
export const toolRegistry = new AIToolRegistry();
