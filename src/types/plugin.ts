export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface PluginToolHandler {
  (args: Record<string, any>): Promise<{ content: Array<{ type: string; text: string }> }>;
}

export interface MCPPlugin {
  name: string;
  version: string;
  description: string;
  tools: MCPTool[];
  handlers: Record<string, PluginToolHandler>;
  initialize?: (browserManager: any) => Promise<void>;
  cleanup?: () => Promise<void>;
}

export interface PluginManager {
  loadPlugin(pluginPath: string): Promise<MCPPlugin>;
  loadAllPlugins(pluginsDir: string): Promise<MCPPlugin[]>;
  getPlugin(name: string): MCPPlugin | undefined;
  getAllPlugins(): MCPPlugin[];
  executeTool(pluginName: string, toolName: string, args: Record<string, any>): Promise<{ content: Array<{ type: string; text: string }> }>;
}
