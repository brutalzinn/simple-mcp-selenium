import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { Builder, By, Capabilities, WebDriver, WebElement } from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome';
import { Session } from 'selenium-webdriver';
import { ServiceBuilder } from 'selenium-webdriver/chrome.js';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { Logger } from './utils/logger.js';
import { ChromeDriverManager } from './utils/chromeDriverManager.js';
import { BrowserSession, Scenario, ScenarioStep } from './common/types.js';
import { openBrowserTool } from './tools/browser/openBrowser.js';
import { navigateToTool } from './tools/browser/navigateTo.js';
import { clickElementTool } from './tools/browser/clickElement.js';
import { typeTextTool } from './tools/browser/typeText.js';
import { takeScreenshotTool } from './tools/browser/takeScreenshot.js';
import { executeScriptTool } from './tools/browser/executeScript.js';
import { closeBrowserTool } from './tools/browser/closeBrowser.js';
import { debugPageStateTool } from './tools/browser/debugPageState.js';
import { getPageDebugInfoTool } from './tools/browser/getPageDebugInfo.js';
import { getInteractiveElementsTool } from './tools/browser/getInteractiveElements.js';
import { PluginManager } from './utils/pluginManager.js';
import { MCPPlugin } from './types/plugin.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class SimpleMCPServer {
  private logger: Logger;
  private server: Server;
  private browserSessions: Map<string, BrowserSession> = new Map();
  private chromeDriverManager: ChromeDriverManager;
  private activeRecordings: Map<string, { sessionId: string; steps: ScenarioStep[]; startTime: Date; } | null> = new Map();
  private scenarios: Map<string, Scenario> = new Map();
  private scenarioStoragePath: string;
  private pluginManager: PluginManager;
  private pluginsPath: string;

  constructor() {
    this.logger = new Logger();
    this.server = new Server({
      name: 'simple-browser-mcp-server',
      version: '1.0.0',
      description: 'Simple MCP Server for browser automation using direct Chrome with auto ChromeDriver compatibility',
    });
    this.scenarioStoragePath = path.join(__dirname, '..', 'scenarios');
    if (!fs.existsSync(this.scenarioStoragePath)) {
      fs.mkdirSync(this.scenarioStoragePath, { recursive: true });
    }
    this.pluginsPath = path.join(__dirname, '..', 'plugins');
    this.pluginManager = new PluginManager(this.logger);
    this.chromeDriverManager = new ChromeDriverManager(this.logger);
    this.setupToolHandlers();
    this.loadExistingScenarios();
    this.loadPlugins();
  }

  private async loadPlugins() {
    try {
      const plugins = await this.pluginManager.loadAllPlugins(this.pluginsPath);
      if (plugins.length > 0) {
        this.logger.info(`Loaded ${plugins.length} plugin(s)`, { plugins: plugins.map(p => p.name) });
        // Register plugin tools will be done in setupToolHandlers
      }
    } catch (error) {
      this.logger.error('Failed to load plugins', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: any[] = [
        {
          name: 'open_browser',
          description: 'Open a browser window',
          inputSchema: {
            type: 'object',
            properties: {
              browserId: {
                type: 'string',
                description: 'Unique identifier for the browser session',
              },
              headless: {
                type: 'boolean',
                description: 'Run without window (default: false)',
                default: false,
              },
              url: {
                type: 'string',
                description: 'Optional URL to navigate to immediately after opening browser',
              },
            },
            required: ['browserId'],
          },
        },
        {
          name: 'navigate_to',
          description: 'Go to a URL',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'Session ID of the browser to control',
              },
              url: {
                type: 'string',
                description: 'URL to navigate to',
              },
            },
            required: ['sessionId', 'url'],
          },
        },
        {
          name: 'click_element',
          description: 'Click an element',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'Session ID of the browser to control',
              },
              selector: {
                type: 'string',
                description: 'CSS selector for the element to click',
              },
            },
            required: ['sessionId', 'selector'],
          },
        },
        {
          name: 'type_text',
          description: 'Type text into an input',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'Session ID of the browser to control',
              },
              selector: {
                type: 'string',
                description: 'CSS selector for the element to type into',
              },
              text: {
                type: 'string',
                description: 'Text to type',
              },
            },
            required: ['sessionId', 'selector', 'text'],
          },
        },
        {
          name: 'take_screenshot',
          description: 'Capture screenshot',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'Session ID of the browser to control',
              },
              filename: {
                type: 'string',
                description: 'Filename for the screenshot',
              },
            },
            required: ['sessionId'],
          },
        },
        {
          name: 'execute_script',
          description: 'Run JavaScript in browser',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'Session ID of the browser to control',
              },
              script: {
                type: 'string',
                description: 'JavaScript code to execute',
              },
            },
            required: ['sessionId', 'script'],
          },
        },
        {
          name: 'close_browser',
          description: 'Close browser',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'Session ID of the browser to close',
              },
            },
            required: ['sessionId'],
          },
        },
        {
          name: 'debug_page',
          description: 'Get page debug info (console logs, errors)',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'Session ID of the browser to control',
              },
            },
            required: ['sessionId'],
          },
        },
        {
          name: 'start_recording',
          description: 'Start recording browser interactions for later playback',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'Session ID of the browser to control',
              },
              recordingName: {
                type: 'string',
                description: 'Name for the recording',
              },
            },
            required: ['sessionId', 'recordingName'],
          },
        },
        {
          name: 'stop_recording',
          description: 'Stop recording and save the recorded interactions',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'Session ID of the browser to control',
              },
            },
            required: ['sessionId'],
          },
        },
        {
          name: 'play_recording',
          description: 'Play back a previously recorded interaction sequence with optional parameter substitution',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'Session ID of the browser to control',
              },
              recordingName: {
                type: 'string',
                description: 'Name of the recording to play',
              },
              parameters: {
                type: 'object',
                description: 'Parameters to substitute in the recording (e.g., username, password, email)',
              },
            },
            required: ['sessionId', 'recordingName'],
          },
        },
        {
          name: 'get_recordings',
          description: 'Get all available recordings (read-only)',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'get_page_debug_info',
          description: 'Get page info (elements, console, performance)',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'Session ID of the browser to control',
              },
              includeConsole: {
                type: 'boolean',
                description: 'Include console logs',
                default: true,
              },
              includeElements: {
                type: 'boolean',
                description: 'Include page elements',
                default: true,
              },
              elementLimit: {
                type: 'number',
                description: 'Maximum number of elements to return',
                default: 50,
              },
              logLimit: {
                type: 'number',
                description: 'Maximum number of console logs to return (0 for all logs)',
                default: 20,
              },
            },
            required: ['sessionId'],
          },
        },
        {
          name: 'get_interactive_elements',
          description: 'List clickable elements (buttons, inputs, links)',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'Session ID of the browser to control',
              },
              elementLimit: {
                type: 'number',
                description: 'Maximum number of interactive elements to return',
                default: 50,
              },
            },
            required: ['sessionId'],
          },
        },
        {
          name: 'record_scenario',
          description: 'Start recording browser actions',
          inputSchema: {
            type: 'object',
            properties: {
              scenarioName: {
                type: 'string',
                description: 'Unique name for the scenario',
              },
              sessionId: {
                type: 'string',
                description: 'Session ID of the browser to record',
              },
              description: {
                type: 'string',
                description: 'Optional description of the scenario',
              },
            },
            required: ['scenarioName', 'sessionId'],
          },
        },
        {
          name: 'stop_recording_scenario',
          description: 'Stop recording and save',
          inputSchema: {
            type: 'object',
            properties: {
              scenarioName: {
                type: 'string',
                description: 'Name of the scenario to stop recording',
              },
              saveScenario: {
                type: 'boolean',
                description: 'Whether to save the scenario to file',
                default: true,
              },
            },
            required: ['scenarioName'],
          },
        },
        {
          name: 'replay_scenario',
          description: 'Replay recorded actions',
          inputSchema: {
            type: 'object',
            properties: {
              scenarioName: {
                type: 'string',
                description: 'Name of the scenario to execute',
              },
              sessionId: {
                type: 'string',
                description: 'Session ID to use (creates new if not provided)',
              },
              fastMode: {
                type: 'boolean',
                description: 'Execute steps without delays',
                default: false,
              },
              stopOnError: {
                type: 'boolean',
                description: 'Stop execution on first error',
                default: false,
              },
              skipScreenshots: {
                type: 'boolean',
                description: 'Skip taking screenshots during replay',
                default: true,
              },
              takeScreenshots: {
                type: 'boolean',
                description: 'Take screenshots at each step',
                default: false,
              },
              variables: {
                type: 'object',
                description: 'Variables to substitute in the scenario',
              },
            },
            required: ['scenarioName'],
          },
        },
        {
          name: 'list_scenarios',
          description: 'List saved scenarios',
          inputSchema: {
            type: 'object',
            properties: {
              filter: {
                type: 'string',
                description: 'Filter scenarios by name or description',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of scenarios to return',
                default: 50,
              },
            },
          },
        },
        {
          name: 'update_scenario',
          description: 'Update scenario',
          inputSchema: {
            type: 'object',
            properties: {
              scenarioName: {
                type: 'string',
                description: 'Name of the scenario to update',
              },
              newName: {
                type: 'string',
                description: 'New name for the scenario (optional)',
              },
              description: {
                type: 'string',
                description: 'New description for the scenario (optional)',
              },
              steps: {
                type: 'array',
                items: { type: 'object' },
                description: 'New steps for the scenario (optional)',
              },
              variables: {
                type: 'object',
                description: 'New variables for the scenario (optional)',
              },
            },
            required: ['scenarioName'],
          },
        },
        {
          name: 'delete_scenario',
          description: 'Delete scenario',
          inputSchema: {
            type: 'object',
            properties: {
              scenarioName: {
                type: 'string',
                description: 'Name of the scenario to delete',
              },
              confirm: {
                type: 'boolean',
                description: 'Confirm deletion',
                default: false,
              },
            },
            required: ['scenarioName'],
          },
        },
        {
          name: 'list_elements',
          description: 'List page elements',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'Session ID of the browser',
              },
              filter: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['button', 'input', 'link', 'form', 'select', 'any'],
                  },
                  tagName: { type: 'string' },
                  visibleOnly: { type: 'boolean', default: true },
                  containsText: { type: 'string' },
                  hasAttribute: {
                    type: 'object',
                    properties: { name: { type: 'string' }, value: { type: 'string' } },
                  },
                  cssSelector: { type: 'string' },
                },
              },
              limit: { type: 'number', default: 50 },
              includeHidden: { type: 'boolean', default: false },
            },
            required: ['sessionId'],
          },
        },
        {
          name: 'check_element_exists',
          description: 'Check if element exists',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: { type: 'string' },
              selector: { type: 'string' },
              by: {
                type: 'string',
                enum: ['css', 'xpath', 'id', 'name', 'className', 'tagName', 'text'],
                default: 'css',
              },
            },
            required: ['sessionId', 'selector'],
          },
        },
        {
          name: 'find_by_description',
          description: 'Find element by description',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: { type: 'string' },
              description: { type: 'string' },
              context: { type: 'string' },
              preferredSelector: {
                type: 'string',
                enum: ['css', 'xpath', 'all'],
                default: 'all',
              },
              limit: { type: 'number', default: 10 },
            },
            required: ['sessionId', 'description'],
          },
        },
        {
          name: 'fill_form',
          description: 'Fill form fields',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: { type: 'string' },
              fields: {
                type: 'object',
                additionalProperties: {
                  type: 'object',
                  properties: { selector: { type: 'string' }, value: { type: 'string' } },
                },
              },
              submitAfter: { type: 'boolean', default: false },
              submitSelector: { type: 'string' },
            },
            required: ['sessionId', 'fields'],
          },
        },
        {
          name: 'select_option',
          description: 'Select dropdown option',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: { type: 'string' },
              selector: { type: 'string' },
              option: {
                type: 'object',
                properties: {
                  by: { type: 'string', enum: ['text', 'value', 'index'] },
                  text: { type: 'string' },
                  value: { type: 'string' },
                  index: { type: 'number' },
                },
              },
              timeout: { type: 'number', default: 10000 },
            },
            required: ['sessionId', 'selector', 'option'],
          },
        },
        {
          name: 'wait_for_page_change',
          description: 'Wait for page to change',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: { type: 'string' },
              fromUrl: { type: 'string' },
              toUrlPattern: { type: 'string' },
              timeout: { type: 'number', default: 10000 },
              takeScreenshot: { type: 'boolean', default: false },
            },
            required: ['sessionId'],
          },
        },
      ];

      // Add plugin tools
      const plugins = this.pluginManager.getAllPlugins();
      for (const plugin of plugins) {
        for (const tool of plugin.tools) {
          tools.push({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
          });
        }
      }

      return { tools };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        let result;

        switch (name) {
          case 'open_browser':
            result = await openBrowserTool(args, this.browserSessions, this.chromeDriverManager, this.logger, this.setBadge.bind(this));
            break;

          case 'navigate_to':
            result = await navigateToTool(args, this.getSession.bind(this), this.activeRecordings, this.logger);
            break;

          case 'click_element':
            result = await clickElementTool(args, this.getSession.bind(this), this.findElementBySelector.bind(this), this.activeRecordings, this.logger);
            break;

          case 'type_text':
            result = await typeTextTool(args, this.getSession.bind(this), this.findElementBySelector.bind(this), this.activeRecordings, this.logger);
            break;

          case 'take_screenshot':
            result = await takeScreenshotTool(args, this.getSession.bind(this), this.activeRecordings, this.logger, this.scenarioStoragePath);
            break;

          case 'execute_script':
            result = await executeScriptTool(args, this.getSession.bind(this), this.activeRecordings, this.logger);
            break;

          case 'close_browser':
            result = await closeBrowserTool(args, this.getSession.bind(this), this.browserSessions, this.logger);
            break;

          case 'debug_page':
            result = await debugPageStateTool(args, this.getSession.bind(this), this.logger);
            break;

          case 'start_recording':
            result = { success: false, message: 'Deprecated. Use record_scenario instead.' };
            break;

          case 'stop_recording':
            result = { success: false, message: 'Deprecated. Use stop_recording_scenario instead.' };
            break;

          case 'play_recording':
            result = { success: false, message: 'Deprecated. Use replay_scenario instead.' };
            break;

          case 'get_recordings':
            result = { success: false, message: 'Deprecated. Use list_scenarios instead.' };
            break;

          case 'get_page_debug_info':
            result = await getPageDebugInfoTool(args, this.getSession.bind(this), (args: any) => getInteractiveElementsTool(args, this.getSession.bind(this), this.logger), this.logger);
            break;

          case 'get_interactive_elements':
            result = await getInteractiveElementsTool(args, this.getSession.bind(this), this.logger);
            break;

          case 'record_scenario':
            result = await this.recordScenario(args);
            break;

          case 'stop_recording_scenario':
            result = await this.stopRecordingScenario(args);
            break;

          case 'replay_scenario':
            result = await this.replayScenario(args);
            break;

          case 'list_scenarios':
            result = await this.listScenarios(args);
            break;

          case 'update_scenario':
            result = await this.updateScenario(args);
            break;

          case 'delete_scenario':
            result = await this.deleteScenario(args);
            break;

          case 'list_elements':
            result = await this.listElements(args);
            break;

          case 'check_element_exists':
            result = await this.checkElementExists(args);
            break;

          case 'find_by_description':
            result = await this.findByDescription(args);
            break;

          case 'fill_form':
            result = await this.fillForm(args);
            break;

          case 'select_option':
            result = await this.selectOption(args);
            break;

          case 'wait_for_page_change':
            result = await this.waitForPageChange(args);
            break;

          default:
            // Check if it's a plugin tool
            const pluginTool = this.findPluginTool(name);
            if (pluginTool) {
              try {
                result = await this.pluginManager.executeTool(pluginTool.pluginName, pluginTool.toolName, args || {});
              } catch (error) {
                result = {
                  success: false,
                  message: `Plugin tool error: ${error instanceof Error ? error.message : String(error)}`,
                };
              }
            } else {
              result = {
                success: false,
                message: `Unknown tool: ${name}`,
              };
            }
        }

        return {
          content: [
            {
              type: 'text',
              text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    });
  }

  private async findElementBySelector(driver: WebDriver, selector: string, by: string = 'css', timeout: number = 10000): Promise<WebElement> {
    // This is kept for compatibility but should use executeScript instead
    // Using Selenium's findElement only when absolutely necessary (for WebElement return type)
    const { By, until } = await import('selenium-webdriver');
    let byMethod;
    switch (by.toLowerCase()) {
      case 'css': byMethod = By.css; break;
      case 'xpath': byMethod = By.xpath; break;
      case 'id': byMethod = By.id; break;
      case 'name': byMethod = By.name; break;
      case 'classname': byMethod = By.className; break;
      case 'tagname': byMethod = By.tagName; break;
      case 'text': byMethod = By.xpath; selector = `//*[contains(text(), '${selector}')]`; break;
      default: byMethod = By.css;
    }
    return driver.wait(until.elementLocated(byMethod(selector)), timeout);
  }

  private async getSession(sessionId: string): Promise<BrowserSession | null> {
    for (const session of this.browserSessions.values()) {
      if (session.sessionId === sessionId && session.isActive) {
        session.lastUsed = new Date();
        return session;
      }
    }
    return null;
  }

  private async setBadge(args: any) {
    const { sessionId, badge } = args;
    const session = await this.getSession(sessionId);

    if (!session) {
      return {
        success: false,
        message: `Session '${sessionId}' not found`,
      };
    }

    try {
      if (badge && badge.trim()) {
        // Set or update badge
        await session.driver.executeScript(`
          localStorage.setItem('mcp-debug-badge', '${badge.trim()}');
        `);
        await this.injectBadge(session.driver);

        this.logger.info('Badge set successfully', { sessionId, badge: badge.trim() });

        return {
          success: true,
          message: `Badge set to: "${badge.trim()}"`,
          data: { badge: badge.trim() },
        };
      } else {
        // Remove badge
        await session.driver.executeScript(`
          localStorage.removeItem('mcp-debug-badge');
          const existingBadge = document.getElementById('mcp-debug-badge');
          if (existingBadge) {
            existingBadge.remove();
          }
        `);

        this.logger.info('Badge removed successfully', { sessionId });

        return {
          success: true,
          message: 'Badge removed',
          data: { badge: null },
        };
      }
    } catch (error) {
      this.logger.error('Set badge failed', { sessionId, error: error instanceof Error ? error.message : String(error) });
      return {
        success: false,
        message: `Failed to set badge: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private async injectBadge(driver: WebDriver) {
    const result = await driver.executeScript(`
      try {
        console.log('Starting badge injection...');
        
        // Get badge text with fallback
        let badgeText = 'RIDER'; // Default fallback
        try {
          badgeText = localStorage.getItem('mcp-debug-badge') || 'RIDER';
          console.log('Badge text from localStorage:', badgeText);
        } catch (e) {
          console.log('localStorage not available, using fallback');
          badgeText = 'RIDER';
        }
        
        if (!badgeText) {
          console.log('No badge text found, skipping injection');
          return { success: false, reason: 'No badge text' };
        }

        // Remove existing badge if any
        const existingBadge = document.getElementById('mcp-debug-badge');
        if (existingBadge) {
          existingBadge.remove();
          console.log('Removed existing badge');
        }

        // Create debug badge
        const badge = document.createElement('div');
        badge.id = 'mcp-debug-badge';
        badge.textContent = badgeText;
        badge.style.cssText = \`
          position: fixed;
          top: 0;
          right: 0;
          background: #ff4444;
          color: white;
          padding: 4px 20px;
          font-family: 'Courier New', monospace;
          font-size: 9px;
          font-weight: bold;
          z-index: 999999;
          box-shadow: 0 1px 4px rgba(0,0,0,0.3);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          user-select: none;
          pointer-events: none;
          transform: rotate(45deg) translate(15px, -3px);
          transform-origin: center;
          border: 1px solid #cc0000;
          min-width: 60px;
          text-align: center;
          animation: pulse 2s infinite;
        \`;
        
        console.log('Created badge element with text:', badgeText);
        
        // Add pulse animation
        if (!document.getElementById('mcp-badge-styles')) {
          const style = document.createElement('style');
          style.id = 'mcp-badge-styles';
          style.textContent = \`
            @keyframes pulse {
              0% { opacity: 1; }
              50% { opacity: 0.7; }
              100% { opacity: 1; }
            }
          \`;
          document.head.appendChild(style);
          console.log('Added pulse animation styles');
        }
        
        // Add to body
        if (document.body) {
          document.body.appendChild(badge);
          console.log('Badge added to body successfully');
        } else {
          console.log('Body not ready, waiting for DOMContentLoaded');
          // Wait for body to be ready
          document.addEventListener('DOMContentLoaded', function() {
            if (document.body) {
              document.body.appendChild(badge);
              console.log('Badge added to body after DOMContentLoaded');
            }
          });
        }
        
        // Try to re-store badge text
        try {
          localStorage.setItem('mcp-debug-badge', badgeText);
          console.log('Badge text stored in localStorage');
        } catch (e) {
          console.log('Could not store in localStorage');
        }
        
        return { success: true, badgeText: badgeText };
      } catch (e) {
        console.error('Badge injection error:', e);
        return { success: false, error: e.message };
      }
    `);

    this.logger.info('Badge injection result', { result });
    return result;
  }

  private async executeScript(args: any) {
    const { sessionId, script, args: scriptArgs = [] } = args;
    const session = await this.getSession(sessionId);
    if (!session) return { success: false, message: `Session '${sessionId}' not found` };
    try {
      if (this.activeRecordings.has(session.sessionId)) {
        const recording = this.activeRecordings.get(session.sessionId);
        recording?.steps.push({ action: 'execute_script', script, args: scriptArgs, timestamp: Date.now() });
      }
      const result = await session.driver.executeScript(script, ...scriptArgs);
      this.logger.info('Script executed', { sessionId, script: script ? script.substring(0, 100) + '...' : '[EMPTY SCRIPT]' });
      return { success: true, message: 'Script executed successfully', data: { result } };
    } catch (error) {
      this.logger.error('Failed to execute script', { sessionId, error: error instanceof Error ? error.message : String(error) });
      return { success: false, message: `Failed to execute script: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  private async listElements(args: any) {
    const { sessionId, filter = {}, limit = 50, includeHidden = false } = args;
    const session = await this.getSession(sessionId);
    if (!session) return { success: false, message: `Session '${sessionId}' not found` };

    try {
      const data = await session.driver.executeScript(`
      const filter = arguments[0];
      const limit = arguments[1];
      const includeHidden = arguments[2];

      function isVisible(el) {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
      }

      function getUniqueSelector(el) {
        if (el.id) return '#' + CSS.escape(el.id);
        const parts = [];
        while (el && el.nodeType === 1 && el !== document.body) {
          let part = el.nodeName.toLowerCase();
          if (el.className) {
            const cls = [...el.classList].slice(0,2).map(c => '.' + CSS.escape(c)).join('');
            part += cls;
          }
          const siblings = Array.from(el.parentNode ? el.parentNode.children : []).filter(e => e.nodeName === el.nodeName);
          if (siblings.length > 1) {
            const index = siblings.indexOf(el) + 1;
            part += ':nth-of-type(' + index + ')';
          }
          parts.unshift(part);
          el = el.parentElement;
        }
        return parts.join(' > ');
      }

      function collectElements() {
        let selector = '*';
        switch (filter.type) {
          case 'button': selector = 'button, [role="button"], input[type="button"], input[type="submit"]'; break;
          case 'input': selector = 'input, textarea'; break;
          case 'link': selector = 'a[href]'; break;
          case 'form': selector = 'form'; break;
          case 'select': selector = 'select'; break;
          default: selector = '*';
        }
        let nodes = Array.from(document.querySelectorAll(selector));
        if (filter.cssSelector) nodes = nodes.filter(n => n.matches(filter.cssSelector));
        if (filter.tagName) nodes = nodes.filter(n => n.tagName.toLowerCase() === filter.tagName.toLowerCase());
        if (filter.containsText) {
          const q = filter.containsText.toLowerCase();
          nodes = nodes.filter(n => (n.innerText || n.textContent || '').toLowerCase().includes(q));
        }
        if (!includeHidden && (filter.visibleOnly ?? true)) nodes = nodes.filter(isVisible);

        const results = [];
        for (let i=0; i<Math.min(nodes.length, limit); i++) {
          const el = nodes[i];
          const rect = el.getBoundingClientRect();
          const attrs = {};
          for (const a of Array.from(el.attributes)) attrs[a.name] = a.value;
          results.push({
            index: i,
            selector: getUniqueSelector(el),
            tagName: el.tagName.toLowerCase(),
            text: (el.textContent || '').trim().slice(0,200),
            attributes: {
              id: el.id || '',
              class: el.className || '',
              name: el.getAttribute('name') || '',
              type: el.getAttribute('type') || '',
              placeholder: el.getAttribute('placeholder') || '',
              value: (el.value !== undefined) ? el.value : '',
              href: (el.href !== undefined) ? el.href : '',
              'aria-label': el.getAttribute('aria-label') || '',
              'data-testid': el.getAttribute('data-testid') || ''
            },
            isVisible: isVisible(el),
            isEnabled: (el.disabled !== undefined) ? !el.disabled : true,
            isSelected: (el.selected !== undefined) ? !!el.selected : false,
            location: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
            parent: el.parentElement ? getUniqueSelector(el.parentElement) : '',
            visibleText: (el.innerText !== undefined) ? el.innerText : (el.textContent || '')
          });
        }
        return { count: Math.min(nodes.length, limit), elements: results };
      }

      return collectElements();
    `, filter, limit, includeHidden);

      const result = data as any;
      return { success: true, message: `Found ${result.count} elements`, data: result };
    } catch (error) {
      return { success: false, message: `Failed to list elements: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  private async checkElementExists(args: any) {
    const { sessionId, selector, by = 'css' } = args;
    const session = await this.getSession(sessionId);
    if (!session) return { success: false, message: `Session '${sessionId}' not found` };
    try {
      const info: any = await session.driver.executeScript(`
        const selector = arguments[0];
        const by = arguments[1];
        
        function findElement(sel, byMethod) {
          if (byMethod === 'id') {
            return document.getElementById(sel);
          } else if (byMethod === 'name') {
            return document.querySelector('[name="' + sel + '"]');
          } else if (byMethod === 'className') {
            return document.getElementsByClassName(sel)[0];
          } else if (byMethod === 'tagName') {
            return document.getElementsByTagName(sel)[0];
          } else if (byMethod === 'xpath') {
            const result = document.evaluate(sel, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            return result.singleNodeValue;
          } else {
            return document.querySelector(sel);
          }
        }
        
        const el = findElement(selector, by);
        if (!el) {
          return { exists: false };
        }
        
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        const attrs = {};
        for (const a of Array.from(el.attributes)) attrs[a.name] = a.value;
        
        function getUniqueSelector(elem){
          if (elem.id) return '#' + CSS.escape(elem.id);
          const parts = [];
          let current = elem;
          while (current && current.nodeType === 1 && current !== document.body) {
            let part = current.nodeName.toLowerCase();
            const siblings = Array.from(current.parentNode ? current.parentNode.children : []).filter(e => e.nodeName === current.nodeName);
            if (siblings.length > 1) {
              const index = siblings.indexOf(current) + 1;
              part += ':nth-of-type(' + index + ')';
            }
            parts.unshift(part);
            current = current.parentElement;
          }
          return parts.join(' > ');
        }
        
        return {
          exists: true,
          tagName: el.tagName.toLowerCase(),
          text: (el.textContent || '').trim().slice(0,200),
          selector: getUniqueSelector(el),
          attributes: attrs,
          isVisible: rect.width>0 && rect.height>0 && style.visibility!=='hidden' && style.display!=='none',
          isEnabled: (el.disabled !== undefined) ? !el.disabled : true,
          isClickable: (el.disabled !== undefined) ? !el.disabled && style.pointerEvents !== 'none' : true
        };
    `, selector, by);

      const tag = (info.tagName || '').toLowerCase();
      let recommended: 'click' | 'type' | 'wait' | 'none' = 'none';
      if (['button', 'a', 'input'].includes(tag)) recommended = tag === 'input' ? 'type' : 'click';

      return {
        success: true,
        message: 'Element status checked',
        data: { exists: true, ...info, recommendedAction: recommended, reason: info.isClickable ? '' : 'Element not clickable' }
      };
    } catch (error) {
      return { success: true, message: 'Element not found', data: { exists: false, isVisible: false, isEnabled: false, isClickable: false, recommendedAction: 'wait', reason: 'Not present' } };
    }
  }

  private async findByDescription(args: any) {
    const { sessionId, description, context = '', preferredSelector = 'all', limit = 10 } = args;
    const session = await this.getSession(sessionId);
    if (!session) return { success: false, message: `Session '${sessionId}' not found` };
    try {
      const data = await session.driver.executeScript(`
      const desc = arguments[0].toLowerCase();
      const contextSel = arguments[1];
      const limit = arguments[2];
      const root = contextSel ? document.querySelector(contextSel) : document;
      const candidates = Array.from(root.querySelectorAll('button, [role="button"], a[href], input, textarea, select'));
      const vw = window.innerWidth, vh = window.innerHeight;
      function getSel(el){
        if (el.id) return '#' + CSS.escape(el.id);
        const parts = [];
        while (el && el.nodeType===1 && el!==document.body){
          let part = el.nodeName.toLowerCase();
          const siblings = Array.from(el.parentNode ? el.parentNode.children: []).filter(e=>e.nodeName===el.nodeName);
          if (siblings.length>1){ const idx = siblings.indexOf(el)+1; part += ':nth-of-type('+idx+')'; }
          parts.unshift(part); el = el.parentElement;
        }
        return parts.join(' > ');
      }
      function score(el){
        const rect = el.getBoundingClientRect();
        const text = ((el.innerText || el.textContent || '') + ' ' + (el.getAttribute('aria-label')||'') + ' ' + (el.getAttribute('placeholder')||'') + ' ' + (el.getAttribute('name')||'')).toLowerCase();
        let s = 0;
        for (const token of desc.split(/\s+/)) if (token && text.includes(token)) s += 2;
        // Heuristic: top-right
        if (desc.includes('top right') || desc.includes('top-right')) { if (rect.x > vw*0.6 && rect.y < vh*0.4) s += 3; }
        if (desc.includes('login') && /login|sign in|entrar/.test(text)) s += 2;
        return s;
      }
      const ranked = candidates
        .map(el => ({ el, score: score(el) }))
        .filter(r => r.score > 0)
        .sort((a,b)=>b.score-a.score)
        .slice(0, limit)
        .map((r)=>{
          const el = r.el; const rect = el.getBoundingClientRect();
          const attrs = {}; for (const a of Array.from(el.attributes)) attrs[a.name]=a.value;
          return {
            selector: getSel(el),
            cssSelector: getSel(el),
            xpath: '',
            confidence: r.score >= 6 ? 'high' : (r.score>=3 ? 'medium':'low'),
            tagName: el.tagName.toLowerCase(),
            text: (el.innerText || el.textContent || '').trim().slice(0,200),
            attributes: attrs,
            whyMatch: 'Heuristic text/location match',
            location: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
          };
        });
      return { description: desc, matches: ranked, recommended: ranked[0]?.cssSelector || '' };
    `, description, context, limit);

      return { success: true, message: 'Matches found', data };
    } catch (error) {
      return { success: false, message: `Failed to find by description: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  private async fillForm(args: any) {
    const { sessionId, fields, submitAfter = false, submitSelector } = args;
    const session = await this.getSession(sessionId);
    if (!session) return { success: false, message: `Session '${sessionId}' not found` };
    let filled = 0; const errors: any[] = [];
    for (const [name, cfg] of Object.entries(fields || {})) {
      try {
        const result = await session.driver.executeScript(`
          const selector = arguments[0];
          const value = arguments[1];
          
          const el = document.querySelector(selector);
          if (!el) {
            return { success: false, message: 'Element not found' };
          }
          
          el.scrollIntoView({ block: 'center', behavior: 'instant' });
          el.focus();
          el.value = '';
          
          const inputEvent = new Event('input', { bubbles: true });
          const changeEvent = new Event('change', { bubbles: true });
          
          el.value = value;
          el.dispatchEvent(inputEvent);
          el.dispatchEvent(changeEvent);
          
          return { success: true };
        `, (cfg as any).selector, (cfg as any).value ?? '');
        if (result && (result as any).success) filled++;
      } catch (e: any) {
        errors.push({ field: name, selector: (cfg as any).selector, error: e?.message || String(e) });
      }
    }

    if (submitAfter) {
      try {
        const result = await session.driver.executeScript(`
          const selector = arguments[0];
          
          let btn;
          if (selector) {
            btn = document.querySelector(selector);
          } else {
            btn = document.querySelector('button[type="submit"], input[type="submit"]');
          }
          
          if (!btn) {
            return { success: false, message: 'Submit button not found' };
          }
          
          btn.scrollIntoView({ block: 'center', behavior: 'instant' });
          btn.click();
          return { success: true };
        `, submitSelector);
      } catch (e) {
        errors.push({ field: '_submit', selector: submitSelector || 'auto', error: e instanceof Error ? e.message : String(e) });
      }
    }

    return {
      success: errors.length === 0,
      message: `Form filled: ${filled} fields${errors.length ? `, ${errors.length} errors` : ''}`,
      data: { filledFields: filled, skippedFields: 0, errors }
    };
  }

  private async selectOption(args: any) {
    const { sessionId, selector, option, timeout = 10000 } = args;
    const session = await this.getSession(sessionId);
    if (!session) return { success: false, message: `Session '${sessionId}' not found` };
    try {
      const result = await session.driver.executeScript(`
        const selector = arguments[0];
        const option = arguments[1];
        
        const selectEl = document.querySelector(selector);
        if (!selectEl || selectEl.tagName.toLowerCase() !== 'select') {
          return { success: false, message: 'Select element not found' };
        }
        
        const opts = Array.from(selectEl.options);
        let chosen = null;
        let index = -1;
        
        if (option.by === 'index') {
          index = option.index !== undefined ? option.index : 0;
          chosen = opts[index] || null;
        } else if (option.by === 'value') {
          for (let i = 0; i < opts.length; i++) {
            if (opts[i].value === option.value) {
              chosen = opts[i];
              index = i;
              break;
            }
          }
        } else {
          const target = (option.text || '').toLowerCase();
          for (let i = 0; i < opts.length; i++) {
            const text = (opts[i].text || '').toLowerCase();
            if (text.includes(target)) {
              chosen = opts[i];
              index = i;
              break;
            }
          }
        }
        
        if (!chosen) {
          return { success: false, message: 'Option not found' };
        }
        
        selectEl.selectedIndex = index;
        const changeEvent = new Event('change', { bubbles: true });
        selectEl.dispatchEvent(changeEvent);
        
        return {
          success: true,
          selectedOption: {
            text: chosen.text,
            value: chosen.value,
            index: index
          }
        };
      `, selector, option);

      const data = result as any;
      if (!data.success) {
        return { success: false, message: data.message || 'Failed to select option' };
      }

      return { success: true, message: 'Option selected', data: { selectedOption: data.selectedOption } };
    } catch (error) {
      return { success: false, message: `Failed to select option: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  private async waitForPageChange(args: any) {
    const { sessionId, fromUrl, toUrlPattern, timeout = 10000, takeScreenshot = false } = args;
    const session = await this.getSession(sessionId);
    if (!session) return { success: false, message: `Session '${sessionId}' not found` };
    try {
      const oldUrl = fromUrl || await session.driver.getCurrentUrl();
      let newUrl = oldUrl;
      const pattern = toUrlPattern ? new RegExp(toUrlPattern) : null;
      await session.driver.wait(async () => {
        newUrl = await session.driver.getCurrentUrl();
        if (pattern) return pattern.test(newUrl);
        return newUrl !== oldUrl;
      }, timeout);

      const title = await session.driver.getTitle();
      let screenshot: string | undefined;
      if (takeScreenshot) screenshot = await session.driver.takeScreenshot();

      return { success: true, message: 'Page changed', data: { oldUrl, newUrl, title, screenshot } };
    } catch (error) {
      return { success: false, message: `Timeout waiting for page change: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  private async recordScenario(args: any) {
    const { sessionId, scenarioName, description } = args;
    const session = await this.getSession(sessionId);
    if (!session) return { success: false, message: `Session '${sessionId}' not found` };

    if (this.activeRecordings.has(sessionId)) {
      return { success: false, message: `Recording already in progress for session '${sessionId}'` };
    }

    const scenarioId = `scenario-${Date.now()}`;
    this.activeRecordings.set(sessionId, {
      sessionId,
      steps: [],
      startTime: new Date(),
    });

    const newScenario: Scenario = {
      scenarioId,
      name: scenarioName,
      sessionId: sessionId, // Store the session ID with the scenario
      description,
      steps: [],
      metadata: {
        totalSteps: 0,
        duration: 0,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        variablesUsed: [],
      },
    };
    this.scenarios.set(scenarioId, newScenario);

    this.logger.info('Scenario recording started', { sessionId, scenarioName, scenarioId });
    return { success: true, message: `Recording started for scenario '${scenarioName}'`, data: { scenarioId, scenarioName } };
  }

  private async stopRecordingScenario(args: any) {
    const { scenarioName, saveScenario = true } = args;
    // Find the scenario by name
    const scenarioEntry = Array.from(this.scenarios.entries()).find(([, s]) => s.name === scenarioName);

    if (!scenarioEntry) {
      return { success: false, message: `Scenario '${scenarioName}' not found.` };
    }

    const [scenarioId, scenario] = scenarioEntry;
    const activeRecording = this.activeRecordings.get(scenario.sessionId);

    if (!activeRecording) {
      return { success: false, message: `No active recording found for scenario '${scenarioName}'.` };
    }

    scenario.steps = activeRecording.steps;
    scenario.metadata.totalSteps = activeRecording.steps.length;
    scenario.metadata.duration = (new Date().getTime() - activeRecording.startTime.getTime()) / 1000;
    scenario.metadata.lastModified = new Date().toISOString();

    if (saveScenario) {
      await this.saveScenario(scenario);
    }

    this.activeRecordings.delete(activeRecording.sessionId);
    this.logger.info('Scenario recording stopped', { scenarioName, scenarioId, totalSteps: scenario.metadata.totalSteps });
    return { success: true, message: `Recording stopped for scenario '${scenarioName}'`, data: { scenarioId, scenarioName, totalSteps: scenario.metadata.totalSteps, duration: scenario.metadata.duration } };
  }

  private async replayScenario(args: any) {
    const { scenarioName, sessionId: userSessionId, fastMode = false, stopOnError = false, skipScreenshots = true, takeScreenshots = false, variables = {} } = args;
    const scenario = this.scenarios.get(scenarioName) || Array.from(this.scenarios.values()).find(s => s.name === scenarioName);

    if (!scenario) {
      return { success: false, message: `Scenario '${scenarioName}' not found` };
    }

    let session = userSessionId ? await this.getSession(userSessionId) : null;
    if (!session) {
      // If no session provided or found, create a new one
      const newBrowserId = `replay-${scenario.scenarioId}-${Date.now()}`;
      const openBrowserResult = await openBrowserTool({ browserId: newBrowserId, headless: true }, this.browserSessions, this.chromeDriverManager, this.logger, this.setBadge.bind(this));
      if (!openBrowserResult.success || !openBrowserResult.data?.sessionId) {
        return { success: false, message: `Failed to open browser for replay: ${openBrowserResult.message}` };
      }
      session = await this.getSession(openBrowserResult.data.sessionId);
    }

    if (!session) return { success: false, message: `Failed to acquire or create session for replay.` };

    const executedSteps: any[] = [];
    const failedSteps: any[] = [];
    const screenshots: string[] = [];
    let currentUrl = '';
    const startTime = Date.now();

    const substitute = (value: string | undefined | null) => {
      let substitutedValue = value === undefined || value === null ? '' : value;
      for (const [key, val] of Object.entries(scenario.variables || {})) {
        substitutedValue = substitutedValue.replace(new RegExp(`{{${key}}}`, 'g'), String(val));
      }
      for (const [key, val] of Object.entries(variables)) {
        substitutedValue = substitutedValue.replace(new RegExp(`{{${key}}}`, 'g'), String(val));
      }
      return substitutedValue;
    };

    for (const [index, step] of scenario.steps.entries()) {
      try {
        if (!fastMode && index > 0) {
          await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay
        }

        let stepResult: any = { success: false, message: '' };
        let resolvedSelector = step.selector ? substitute(step.selector) : undefined;
        let resolvedValue = step.value ? substitute(step.value) : undefined;
        let resolvedUrl = step.url ? substitute(step.url) : undefined;
        let resolvedScript = step.script ? substitute(step.script) : undefined;
        let resolvedArgs = step.args ? step.args.map(arg => substitute(arg)) : undefined;

        switch (step.action) {
          case 'navigate':
            if (resolvedUrl) {
              stepResult = await navigateToTool({ sessionId: session.sessionId, url: resolvedUrl }, this.getSession.bind(this), this.activeRecordings, this.logger);
            }
            break;
          case 'click':
            if (resolvedSelector) {
              stepResult = await clickElementTool({ sessionId: session.sessionId, selector: resolvedSelector, by: step.by }, this.getSession.bind(this), this.findElementBySelector.bind(this), this.activeRecordings, this.logger);
            }
            break;
          case 'type':
            if (resolvedSelector && resolvedValue !== undefined) {
              stepResult = await typeTextTool({ sessionId: session.sessionId, selector: resolvedSelector, text: resolvedValue, by: step.by }, this.getSession.bind(this), this.findElementBySelector.bind(this), this.activeRecordings, this.logger);
            }
            break;
          case 'wait':
            // Implement wait logic, e.g., wait for a certain element or URL pattern
            this.logger.warn('Wait action not fully implemented in replay. Skipping.', { step });
            stepResult = { success: true, message: 'Wait action skipped (not fully implemented)' };
            break;
          case 'wait_for_page_change':
            stepResult = await this.waitForPageChange({ sessionId: session.sessionId, toUrlPattern: step.pattern, timeout: step.timeout });
            break;
          case 'screenshot':
            if (takeScreenshots && !skipScreenshots) {
              const screenshotFilename = `replay_step_${index + 1}_${Date.now()}.png`;
              stepResult = await takeScreenshotTool({ sessionId: session.sessionId, filename: screenshotFilename }, this.getSession.bind(this), this.activeRecordings, this.logger, this.scenarioStoragePath);
              if (stepResult.success && stepResult.data?.image) {
                screenshots.push(stepResult.data.image);
              }
            } else {
              stepResult = { success: true, message: 'Screenshot skipped' };
            }
            break;
          case 'fill_form':
            if (step.fields) {
              const resolvedFields: Record<string, { selector: string; value: string }> = {};
              for (const fieldName in step.fields) {
                const field = step.fields[fieldName];
                resolvedFields[fieldName] = { selector: substitute(field.selector), value: substitute(field.value) };
              }
              stepResult = await this.fillForm({ sessionId: session.sessionId, fields: resolvedFields, submitAfter: (step as any).submitAfter, submitSelector: (step as any).submitSelector });
            }
            break;
          case 'select_option':
            if (resolvedSelector && step.option) {
              const resolvedOption = { ...step.option };
              if (resolvedOption.text) resolvedOption.text = substitute(resolvedOption.text);
              if (resolvedOption.value) resolvedOption.value = substitute(resolvedOption.value);
              stepResult = await this.selectOption({ sessionId: session.sessionId, selector: resolvedSelector, option: resolvedOption, timeout: step.timeout });
            }
            break;
          case 'execute_script':
            if (resolvedScript) {
              stepResult = await this.executeScript({ sessionId: session.sessionId, script: resolvedScript, args: resolvedArgs });
            }
            break;
          default:
            this.logger.warn('Unknown scenario step action', { action: step.action });
            stepResult = { success: false, message: `Unknown action: ${step.action}` };
        }

        if (!stepResult.success) {
          failedSteps.push({ step: index + 1, action: step.action, error: stepResult.message });
          if (stopOnError) throw new Error(`Replay stopped on error at step ${index + 1}: ${stepResult.message}`);
        }
        executedSteps.push({ step: index + 1, action: step.action, success: stepResult.success, message: stepResult.message });
        currentUrl = await session.driver.getCurrentUrl(); // Update current URL after each step
      } catch (error: any) {
        failedSteps.push({ step: index + 1, action: step.action, error: error.message });
        if (stopOnError) throw new Error(`Replay stopped unexpectedly at step ${index + 1}: ${error.message}`);
      }
    }

    const duration = (Date.now() - startTime) / 1000;
    this.logger.info('Scenario replay finished', { scenarioName, totalSteps: scenario.steps.length, executedSteps: executedSteps.length - failedSteps.length, failedSteps: failedSteps.length, duration });

    if (session && !userSessionId) {
      // If a new session was created for replay, close it
      await closeBrowserTool({ sessionId: session.sessionId }, this.getSession.bind(this), this.browserSessions, this.logger);
    }

    return {
      success: failedSteps.length === 0,
      message: failedSteps.length === 0 ? 'Scenario replayed successfully' : `Scenario replayed with ${failedSteps.length} errors`,
      data: {
        scenarioName,
        totalSteps: scenario.steps.length,
        executedSteps: executedSteps.length - failedSteps.length,
        failedSteps: failedSteps.length,
        duration,
        finalUrl: currentUrl,
        errors: failedSteps,
        screenshots: screenshots,
      },
    };
  }

  private async listScenarios(args: any) {
    const { filter, limit = 50 } = args;
    let scenarios = Array.from(this.scenarios.values());

    if (filter) {
      const lowerCaseFilter = filter.toLowerCase();
      scenarios = scenarios.filter(s =>
        s.name.toLowerCase().includes(lowerCaseFilter) ||
        s.description?.toLowerCase().includes(lowerCaseFilter)
      );
    }

    const sortedScenarios = scenarios.sort((a, b) => new Date(b.metadata.lastModified).getTime() - new Date(a.metadata.lastModified).getTime());
    const limitedScenarios = sortedScenarios.slice(0, limit);

    return {
      success: true,
      message: `Found ${limitedScenarios.length} scenarios`,
      data: {
        scenarios: limitedScenarios.map(s => ({
          scenarioId: s.scenarioId,
          name: s.name,
          description: s.description,
          totalSteps: s.metadata.totalSteps,
          duration: s.metadata.duration,
          createdAt: s.metadata.createdAt,
          lastModified: s.metadata.lastModified,
          lastUsed: s.metadata.lastUsed,
        })),
      },
    };
  }

  private async updateScenario(args: any) {
    const { scenarioName, newName, description, steps, variables } = args;
    let scenario = this.scenarios.get(scenarioName) || Array.from(this.scenarios.values()).find(s => s.name === scenarioName);

    if (!scenario) {
      return { success: false, message: `Scenario '${scenarioName}' not found.` };
    }

    if (newName) scenario.name = newName;
    if (description) scenario.description = description;
    if (steps) {
      scenario.steps = steps;
      scenario.metadata.totalSteps = steps.length;
    }
    if (variables) scenario.variables = { ...scenario.variables, ...variables };

    scenario.metadata.lastModified = new Date().toISOString();
    await this.saveScenario(scenario);

    return {
      success: true,
      message: `Scenario '${scenarioName}' updated successfully`,
      data: { scenarioId: scenario.scenarioId, updated: { steps: steps ? steps.length : 0, variables: variables ? Object.keys(variables) : [] } },
    };
  }

  private async deleteScenario(args: any) {
    const { scenarioName, confirm = false } = args;
    const scenarioEntry = Array.from(this.scenarios.entries()).find(([, s]) => s.name === scenarioName);

    if (!scenarioEntry) {
      return { success: false, message: `Scenario '${scenarioName}' not found.` };
    }
    const [scenarioId, scenario] = scenarioEntry;

    if (!confirm) {
      return { success: false, message: `Confirmation required to delete scenario '${scenarioName}'. Set 'confirm: true' in arguments.` };
    }

    try {
      const filePath = path.join(this.scenarioStoragePath, `${scenarioId}.json`);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
      this.scenarios.delete(scenarioId);
      this.logger.info('Scenario deleted', { scenarioName, scenarioId });
      return { success: true, message: `Scenario '${scenarioName}' deleted successfully` };
    } catch (error) {
      this.logger.error('Error deleting scenario:', { scenarioName, error: error instanceof Error ? error.message : String(error) });
      return { success: false, message: `Failed to delete scenario '${scenarioName}': ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Simple Browser MCP Server running on stdio');
  }

  private async loadExistingScenarios() {
    this.logger.info('Loading existing scenarios...', { path: this.scenarioStoragePath });
    try {
      const files = await fs.promises.readdir(this.scenarioStoragePath);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.scenarioStoragePath, file);
          const content = await fs.promises.readFile(filePath, 'utf-8');
          const scenario: Scenario = JSON.parse(content);
          this.scenarios.set(scenario.scenarioId, scenario);
          this.logger.debug('Loaded scenario:', { name: scenario.name, id: scenario.scenarioId });
        }
      }
      this.logger.info(`Loaded ${this.scenarios.size} scenarios.`);
    } catch (error) {
      this.logger.error('Error loading scenarios:', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  private findPluginTool(toolName: string): { pluginName: string; toolName: string } | null {
    const plugins = this.pluginManager.getAllPlugins();
    for (const plugin of plugins) {
      for (const tool of plugin.tools) {
        if (tool.name === toolName) {
          return { pluginName: plugin.name, toolName: tool.name };
        }
      }
    }
    return null;
  }

  private async saveScenario(scenario: Scenario) {
    try {
      const filePath = path.join(this.scenarioStoragePath, `${scenario.scenarioId}.json`);
      await fs.promises.writeFile(filePath, JSON.stringify(scenario, null, 2), 'utf-8');
      this.logger.info('Scenario saved:', { name: scenario.name, id: scenario.scenarioId, path: filePath });
    } catch (error) {
      this.logger.error('Error saving scenario:', { name: scenario.name, error: error instanceof Error ? error.message : String(error) });
      throw new Error(`Failed to save scenario ${scenario.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// Run the server
const server = new SimpleMCPServer();
server.run().catch(console.error);