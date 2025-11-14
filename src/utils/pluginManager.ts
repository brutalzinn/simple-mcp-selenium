import { MCPPlugin } from '../types/plugin.js';
import { Logger } from './logger.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class PluginManager {
    private logger: Logger;
    private plugins: Map<string, MCPPlugin> = new Map();

    constructor(logger: Logger) {
        this.logger = logger;
    }

    async loadPlugin(pluginPath: string): Promise<MCPPlugin> {
        try {
            // Use file:// URL for Windows compatibility
            const absolutePath = path.isAbsolute(pluginPath)
                ? pluginPath
                : path.resolve(pluginPath);

            // Convert to file:// URL for dynamic import
            const pluginUrl = `file://${absolutePath}`;
            const pluginModule = await import(pluginUrl);
            const plugin = pluginModule.default || pluginModule;

            if (!plugin.name || !plugin.tools || !plugin.handlers) {
                throw new Error(`Invalid plugin structure: ${pluginPath}`);
            }

            // Initialize plugin if initialize method exists
            if (plugin.initialize) {
                await plugin.initialize(this);
            }

            this.plugins.set(plugin.name, plugin);
            this.logger.info('Plugin loaded', { name: plugin.name, path: pluginPath });

            return plugin;
        } catch (error) {
            this.logger.error('Failed to load plugin', { path: pluginPath, error: error instanceof Error ? error.message : String(error) });
            throw error;
        }
    }

    async loadAllPlugins(pluginsDir: string): Promise<MCPPlugin[]> {
        const plugins: MCPPlugin[] = [];

        if (!fs.existsSync(pluginsDir)) {
            this.logger.debug('Plugins directory does not exist', { path: pluginsDir });
            return plugins;
        }

        const files = fs.readdirSync(pluginsDir);

        for (const file of files) {
            if (file.endsWith('.js') || file.endsWith('.mjs')) {
                try {
                    const pluginPath = path.join(pluginsDir, file);
                    const plugin = await this.loadPlugin(pluginPath);
                    plugins.push(plugin);
                } catch (error) {
                    this.logger.error('Failed to load plugin file', { file, error: error instanceof Error ? error.message : String(error) });
                }
            }
        }

        return plugins;
    }

    getPlugin(name: string): MCPPlugin | undefined {
        return this.plugins.get(name);
    }

    getAllPlugins(): MCPPlugin[] {
        return Array.from(this.plugins.values());
    }

    async executeTool(pluginName: string, toolName: string, args: Record<string, any>, context?: any) {
        const plugin = this.plugins.get(pluginName);
        if (!plugin) {
            throw new Error(`Plugin not found: ${pluginName}`);
        }

        const handler = plugin.handlers[toolName];
        if (!handler) {
            throw new Error(`Tool not found: ${toolName} in plugin ${pluginName}`);
        }

        // Pass context to handler if it accepts it
        if (context && typeof handler === 'function') {
            // Check if handler expects context parameter
            const handlerWithContext = handler as (args: Record<string, any>, context?: any) => Promise<any>;
            return await handlerWithContext(args, context);
        }

        return await handler(args);
    }

    async cleanup() {
        for (const plugin of this.plugins.values()) {
            if (plugin.cleanup) {
                try {
                    await plugin.cleanup();
                } catch (error) {
                    this.logger.error('Plugin cleanup failed', { name: plugin.name, error: error instanceof Error ? error.message : String(error) });
                }
            }
        }
        this.plugins.clear();
    }
}

