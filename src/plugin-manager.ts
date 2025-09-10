import { Tool } from '@modelcontextprotocol/sdk/types';
import { BrowserAutomationCore } from './core/browser-automation-core.js';
import fs from 'fs';
import path from 'path';

export interface MCPPlugin {
  name: string;
  version: string;
  description: string;
  tools: Tool[];
  handlers: {
    [toolName: string]: (args: any, browserCore: BrowserAutomationCore) => Promise<any>;
  };
}

export class PluginManager {
  private plugins: Map<string, MCPPlugin> = new Map();
  private browserCore: BrowserAutomationCore;

  constructor(browserCore: BrowserAutomationCore) {
    this.browserCore = browserCore;
  }

  async loadAllPlugins(): Promise<void> {
    const pluginsDir = path.join(process.cwd(), 'plugins');
    
    if (!fs.existsSync(pluginsDir)) {
      console.log('📁 Plugins directory not found, creating...');
      fs.mkdirSync(pluginsDir, { recursive: true });
      return;
    }

    const pluginFiles = fs.readdirSync(pluginsDir)
      .filter(file => file.endsWith('.js') || file.endsWith('.mjs'));

    console.log(`🔌 Found ${pluginFiles.length} plugin files`);

    for (const file of pluginFiles) {
      try {
        await this.loadPlugin(path.join(pluginsDir, file));
      } catch (error) {
        console.error(`❌ Failed to load plugin ${file}:`, error);
      }
    }

    console.log(`✅ Loaded ${this.plugins.size} plugins`);
  }

  private async loadPlugin(pluginPath: string): Promise<void> {
    try {
      const pluginModule = await import(pluginPath);
      const plugin = pluginModule.default || pluginModule;

      if (!plugin.name || !plugin.tools || !plugin.handlers) {
        throw new Error('Invalid plugin structure');
      }

      if (plugin.initialize && typeof plugin.initialize === 'function') {
        await plugin.initialize(this.browserCore);
      }

      this.plugins.set(plugin.name, plugin);
      console.log(`✅ Loaded plugin: ${plugin.name} v${plugin.version}`);
    } catch (error) {
      throw new Error(`Failed to load plugin from ${pluginPath}: ${error}`);
    }
  }

  getAllTools(): Tool[] {
    const tools: Tool[] = [];
    
    for (const plugin of this.plugins.values()) {
      tools.push(...plugin.tools);
    }
    
    return tools;
  }

  async executeTool(toolName: string, args: any): Promise<any> {
    for (const plugin of this.plugins.values()) {
      if (plugin.handlers[toolName]) {
        return await plugin.handlers[toolName](args, this.browserCore);
      }
    }
    
    throw new Error(`Tool ${toolName} not found in any plugin`);
  }

  getPluginNames(): string[] {
    return Array.from(this.plugins.keys());
  }

  getPlugin(name: string): MCPPlugin | undefined {
    return this.plugins.get(name);
  }
}
