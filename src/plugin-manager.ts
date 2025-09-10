import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { MCPPlugin, PluginManager, PluginToolHandler } from './types/plugin.js';

export class PluginManagerImpl implements PluginManager {
  private plugins: Map<string, MCPPlugin> = new Map();
  private browserManager: any;

  constructor(browserManager: any) {
    this.browserManager = browserManager;
  }

  async loadPlugin(pluginPath: string): Promise<MCPPlugin> {
    try {
      const resolvedPath = resolve(pluginPath);
      const pluginModule = await import(resolvedPath);
      
      if (!pluginModule.default || typeof pluginModule.default !== 'object') {
        throw new Error(`Plugin at ${pluginPath} does not export a default object`);
      }

      const plugin: MCPPlugin = pluginModule.default;
      
      // Validate plugin structure
      this.validatePlugin(plugin);
      
      // Initialize plugin if it has an initialize method
      if (plugin.initialize) {
        await plugin.initialize(this.browserManager);
      }

      this.plugins.set(plugin.name, plugin);
      console.error(`Loaded plugin: ${plugin.name} v${plugin.version}`);
      
      return plugin;
    } catch (error) {
      throw new Error(`Failed to load plugin from ${pluginPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async loadAllPlugins(pluginsDir: string): Promise<MCPPlugin[]> {
    try {
      const resolvedDir = resolve(pluginsDir);
      
      // Check if plugins directory exists
      try {
        await fs.access(resolvedDir);
      } catch {
        console.error(`Plugins directory not found: ${resolvedDir}`);
        return [];
      }

      const entries = await fs.readdir(resolvedDir, { withFileTypes: true });
      const pluginFiles = entries
        .filter(entry => entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.ts')))
        .map(entry => join(resolvedDir, entry.name));

      const loadedPlugins: MCPPlugin[] = [];

      for (const pluginFile of pluginFiles) {
        try {
          const plugin = await this.loadPlugin(pluginFile);
          loadedPlugins.push(plugin);
        } catch (error) {
          console.error(`Failed to load plugin ${pluginFile}:`, error);
        }
      }

      return loadedPlugins;
    } catch (error) {
      throw new Error(`Failed to load plugins from ${pluginsDir}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  getPlugin(name: string): MCPPlugin | undefined {
    return this.plugins.get(name);
  }

  getAllPlugins(): MCPPlugin[] {
    return Array.from(this.plugins.values());
  }

  async executeTool(pluginName: string, toolName: string, args: Record<string, any>): Promise<{ content: Array<{ type: string; text: string }> }> {
    const plugin = this.getPlugin(pluginName);
    if (!plugin) {
      throw new Error(`Plugin '${pluginName}' not found`);
    }

    const handler = plugin.handlers[toolName];
    if (!handler) {
      throw new Error(`Tool '${toolName}' not found in plugin '${pluginName}'`);
    }

    try {
      return await handler(args);
    } catch (error) {
      throw new Error(`Failed to execute tool '${toolName}' from plugin '${pluginName}': ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async cleanup(): Promise<void> {
    for (const plugin of this.plugins.values()) {
      if (plugin.cleanup) {
        try {
          await plugin.cleanup();
        } catch (error) {
          console.error(`Error cleaning up plugin ${plugin.name}:`, error);
        }
      }
    }
    this.plugins.clear();
  }

  private validatePlugin(plugin: any): void {
    if (!plugin.name || typeof plugin.name !== 'string') {
      throw new Error('Plugin must have a valid name');
    }
    if (!plugin.version || typeof plugin.version !== 'string') {
      throw new Error('Plugin must have a valid version');
    }
    if (!plugin.description || typeof plugin.description !== 'string') {
      throw new Error('Plugin must have a valid description');
    }
    if (!Array.isArray(plugin.tools)) {
      throw new Error('Plugin must have a tools array');
    }
    if (!plugin.handlers || typeof plugin.handlers !== 'object') {
      throw new Error('Plugin must have a handlers object');
    }

    // Validate each tool
    for (const tool of plugin.tools) {
      if (!tool.name || typeof tool.name !== 'string') {
        throw new Error('Each tool must have a valid name');
      }
      if (!tool.description || typeof tool.description !== 'string') {
        throw new Error('Each tool must have a valid description');
      }
      if (!tool.inputSchema || typeof tool.inputSchema !== 'object') {
        throw new Error('Each tool must have a valid inputSchema');
      }
    }

    // Validate handlers match tools
    for (const tool of plugin.tools) {
      if (!plugin.handlers[tool.name] || typeof plugin.handlers[tool.name] !== 'function') {
        throw new Error(`Plugin must have a handler for tool '${tool.name}'`);
      }
    }
  }
}
