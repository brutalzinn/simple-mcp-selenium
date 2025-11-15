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
import { BrowserSession } from './common/types.js';
import { openBrowserTool } from './tools/browser/openBrowser.js';
import { navigateToTool } from './tools/browser/navigateTo.js';
import { clickElementTool } from './tools/browser/clickElement.js';
import { typeTextTool } from './tools/browser/typeText.js';
import { takeScreenshotTool } from './tools/browser/takeScreenshot.js';
import { executeScriptTool } from './tools/browser/executeScript.js';
import { closeBrowserTool } from './tools/browser/closeBrowser.js';
import { getPageDebugInfoTool } from './tools/browser/getPageDebugInfo.js';
import { getInteractiveElementsTool } from './tools/browser/getInteractiveElements.js';
import { getPageElementsMarkdownTool } from './tools/browser/getPageElementsMarkdown.js';
import { PluginManager } from './utils/pluginManager.js';
import { MCPPlugin } from './types/plugin.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class MCPSeleniumServer {
  private logger: Logger;
  private server: Server;
  private browserSessions: Map<string, BrowserSession> = new Map();
  private chromeDriverManager: ChromeDriverManager;
  private pluginManager: PluginManager;
  private pluginsPath: string;

  constructor() {
    this.logger = new Logger();
    this.server = new Server({
      name: 'mcp-selenium',
      version: '1.0.0',
      description: 'MCP Server for browser automation using Selenium',
    });
    this.pluginsPath = path.join(__dirname, '..', 'plugins');
    this.pluginManager = new PluginManager(this.logger);
    this.chromeDriverManager = new ChromeDriverManager(this.logger);
    // Load plugins first, then setup handlers (plugins are loaded synchronously in setupToolHandlers)
    this.loadPlugins().then(() => {
      this.logger.info('Plugins loaded, server ready');
    }).catch((error) => {
      this.logger.error('Failed to load plugins during initialization', { error: error instanceof Error ? error.message : String(error) });
    });
    this.setupToolHandlers();
  }

  private async loadPlugins() {
    try {
      const plugins = await this.pluginManager.loadAllPlugins(this.pluginsPath);
      if (plugins.length > 0) {
        this.logger.info(`Loaded ${plugins.length} plugin(s)`, { plugins: plugins.map(p => p.name) });
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
          description: 'Open a browser window with a unique ID. Multiple browser instances can be managed simultaneously using different browserId values.',
          inputSchema: {
            type: 'object',
            properties: {
              browserId: {
                type: 'string',
                description: 'Unique identifier for the browser session. Use different IDs to manage multiple browser instances.',
              },
              headless: {
                type: 'boolean',
                description: 'Run without window. Default: false',
              },
              url: {
                type: 'string',
                description: 'Optional URL to navigate to immediately after opening browser',
              },
              badge: {
                type: 'string',
                description: 'Optional badge text to display on the page for debugging/identification purposes',
              },
              width: {
                type: 'number',
                description: 'Window width in pixels. Default: 1920',
              },
              height: {
                type: 'number',
                description: 'Window height in pixels. Default: 1080',
              },
              x: {
                type: 'number',
                description: 'Window X position in pixels. Can be used with monitor option',
              },
              y: {
                type: 'number',
                description: 'Window Y position in pixels. Can be used with monitor option',
              },
              monitor: {
                type: 'string',
                enum: ['primary', 'secondary', 'auto'],
                description: 'Monitor to display browser on. primary=0,0; secondary=1920,0; auto=detect. Can be combined with x/y for fine-tuning',
              },
            },
            required: ['browserId'],
          },
        },
        {
          name: 'navigate_to',
          description: 'Navigate browser to a URL',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'Session ID of the browser (alternative to browserId)',
              },
              browserId: {
                type: 'string',
                description: 'Browser ID of the browser (alternative to sessionId)',
              },
              url: {
                type: 'string',
                description: 'URL to navigate to',
              },
            },
            required: ['url'],
          },
        },
        {
          name: 'click_element',
          description: 'Click on an element using CSS selector',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'Session ID of the browser (alternative to browserId)',
              },
              browserId: {
                type: 'string',
                description: 'Browser ID of the browser (alternative to sessionId)',
              },
              selector: {
                type: 'string',
                description: 'CSS selector for the element to click',
              },
            },
            required: ['selector'],
          },
        },
        {
          name: 'type_text',
          description: 'Type text into an input field',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'Session ID of the browser (alternative to browserId)',
              },
              browserId: {
                type: 'string',
                description: 'Browser ID of the browser (alternative to sessionId)',
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
            required: ['selector', 'text'],
          },
        },
        {
          name: 'take_screenshot',
          description: 'Capture a screenshot of the current page',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'Session ID of the browser (alternative to browserId)',
              },
              browserId: {
                type: 'string',
                description: 'Browser ID of the browser (alternative to sessionId)',
              },
              filename: {
                type: 'string',
                description: 'Optional filename to save the screenshot',
              },
            },
          },
        },
        {
          name: 'execute_script',
          description: 'Execute JavaScript code in the browser context. The script receives arguments from the args array as function parameters.',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'Session ID of the browser (alternative to browserId)',
              },
              browserId: {
                type: 'string',
                description: 'Browser ID of the browser (alternative to sessionId)',
              },
              script: {
                type: 'string',
                description: 'JavaScript code to execute. Arguments from args array are passed as function parameters (arguments[0], arguments[1], etc.)',
              },
              args: {
                type: 'array',
                description: 'Optional array of arguments to pass to the script. Each element can be a string, number, boolean, object, or null',
                items: {
                  oneOf: [
                    { type: 'string' },
                    { type: 'number' },
                    { type: 'boolean' },
                    { type: 'object' },
                    { type: 'null' },
                  ],
                },
              },
            },
            required: ['script'],
          },
        },
        {
          name: 'close_browser',
          description: 'Close browser by sessionId or browserId',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'Session ID of the browser to close (alternative to browserId)',
              },
              browserId: {
                type: 'string',
                description: 'Browser ID of the browser to close (alternative to sessionId)',
              },
            },
          },
        },
        {
          name: 'list_browsers',
          description: 'List all active browser instances with their IDs and session information',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'get_window_info',
          description: 'Get current browser window size and position information',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'Session ID of the browser',
              },
              browserId: {
                type: 'string',
                description: 'Browser ID of the browser (alternative to sessionId)',
              },
            },
          },
        },
        {
          name: 'set_window_size',
          description: 'Set browser window size',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'Session ID of the browser',
              },
              browserId: {
                type: 'string',
                description: 'Browser ID of the browser (alternative to sessionId)',
              },
              width: {
                type: 'number',
                description: 'Window width in pixels',
              },
              height: {
                type: 'number',
                description: 'Window height in pixels',
              },
            },
            required: ['width', 'height'],
          },
        },
        {
          name: 'set_window_position',
          description: 'Set browser window position on screen. Useful for multi-monitor setups',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'Session ID of the browser',
              },
              browserId: {
                type: 'string',
                description: 'Browser ID of the browser (alternative to sessionId)',
              },
              x: {
                type: 'number',
                description: 'Window X position in pixels',
              },
              y: {
                type: 'number',
                description: 'Window Y position in pixels',
              },
              monitor: {
                type: 'string',
                enum: ['primary', 'secondary', 'auto'],
                description: 'Monitor preset. primary=0,0; secondary=1920,0. x/y override this if provided',
              },
            },
          },
        },
        {
          name: 'get_page_debug_info',
          description: 'Get comprehensive page debug information including URL, title, console logs, network logs, performance metrics, and interactive elements. Provides everything the browser developer console offers for autonomous error detection and debugging.',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'Session ID of the browser (alternative to browserId)',
              },
              browserId: {
                type: 'string',
                description: 'Browser ID of the browser (alternative to sessionId)',
              },
              includeConsole: {
                type: 'boolean',
                description: 'Include browser console logs (console.log, console.error, console.warn, etc.). Default: true',
              },
              includeNetwork: {
                type: 'boolean',
                description: 'Include network logs (fetch, XHR, WebSocket requests). Default: true',
              },
              includePerformance: {
                type: 'boolean',
                description: 'Include performance metrics (load time, paint metrics, resource loading). Default: true',
              },
              includeElements: {
                type: 'boolean',
                description: 'Include page elements. Default: true',
              },
              elementLimit: {
                type: 'number',
                description: 'Maximum number of elements to return. Default: 50',
              },
              logLimit: {
                type: 'number',
                description: 'Maximum number of console logs to return (0 for all logs). Default: 20',
              },
              networkLimit: {
                type: 'number',
                description: 'Maximum number of network requests to return. Default: 50',
              },
            },
          },
        },
        {
          name: 'get_interactive_elements',
          description: 'Get interactive elements (buttons, inputs, links, form controls) that can be clicked or interacted with',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'Session ID of the browser (alternative to browserId)',
              },
              browserId: {
                type: 'string',
                description: 'Browser ID of the browser (alternative to sessionId)',
              },
              elementLimit: {
                type: 'number',
                description: 'Maximum number of interactive elements to return. Default: 50',
              },
            },
          },
        },
        {
          name: 'list_elements',
          description: 'List all page elements with optional filtering. More comprehensive than get_interactive_elements as it supports filtering by type, tag, text, and attributes',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'Session ID of the browser (alternative to browserId)',
              },
              browserId: {
                type: 'string',
                description: 'Browser ID of the browser (alternative to sessionId)',
              },
              filter: {
                type: 'object',
                description: 'Optional filter object to narrow down elements',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['button', 'input', 'link', 'form', 'select', 'any'],
                    description: 'Filter by element type',
                  },
                  tagName: {
                    type: 'string',
                    description: 'Filter by HTML tag name',
                  },
                  visibleOnly: {
                    type: 'boolean',
                    description: 'Only return visible elements. Default: true',
                  },
                  containsText: {
                    type: 'string',
                    description: 'Filter elements containing this text',
                  },
                  hasAttribute: {
                    type: 'object',
                    description: 'Filter by attribute',
                    properties: {
                      name: { type: 'string' },
                      value: { type: 'string' },
                    },
                  },
                  cssSelector: {
                    type: 'string',
                    description: 'Filter by CSS selector',
                  },
                },
              },
              limit: {
                type: 'number',
                description: 'Maximum number of elements to return. Default: 50',
              },
              includeHidden: {
                type: 'boolean',
                description: 'Include hidden elements in results. Default: false',
              },
            },
          },
        },
        {
          name: 'check_element_exists',
          description: 'Check if an element exists on the page',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'Session ID of the browser (alternative to browserId)',
              },
              browserId: {
                type: 'string',
                description: 'Browser ID of the browser (alternative to sessionId)',
              },
              selector: {
                type: 'string',
                description: 'Element selector',
              },
              by: {
                type: 'string',
                enum: ['css', 'xpath', 'id', 'name', 'className', 'tagName', 'text'],
                description: 'Selector type. Default: css',
              },
            },
            required: ['selector'],
          },
        },
        {
          name: 'find_by_description',
          description: 'Find element by human-readable description using AI-like matching',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'Session ID of the browser (alternative to browserId)',
              },
              browserId: {
                type: 'string',
                description: 'Browser ID of the browser (alternative to sessionId)',
              },
              description: {
                type: 'string',
                description: 'Human-readable description of the element to find',
              },
              context: {
                type: 'string',
                description: 'Optional context to help narrow down the search',
              },
              preferredSelector: {
                type: 'string',
                enum: ['css', 'xpath', 'all'],
                description: 'Preferred selector type to return. Default: all',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of matches to return. Default: 10',
              },
            },
            required: ['description'],
          },
        },
        {
          name: 'fill_form',
          description: 'Fill multiple form fields at once',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'Session ID of the browser (alternative to browserId)',
              },
              browserId: {
                type: 'string',
                description: 'Browser ID of the browser (alternative to sessionId)',
              },
              fields: {
                type: 'object',
                description: 'Object mapping field names to {selector, value} objects',
                additionalProperties: {
                  type: 'object',
                  properties: {
                    selector: { type: 'string' },
                    value: { type: 'string' },
                  },
                },
              },
              submitAfter: {
                type: 'boolean',
                description: 'Submit the form after filling. Default: false',
              },
              submitSelector: {
                type: 'string',
                description: 'CSS selector for the submit button (if different from default)',
              },
            },
            required: ['fields'],
          },
        },
        {
          name: 'select_option',
          description: 'Select an option from a dropdown/select element',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'Session ID of the browser (alternative to browserId)',
              },
              browserId: {
                type: 'string',
                description: 'Browser ID of the browser (alternative to sessionId)',
              },
              selector: {
                type: 'string',
                description: 'CSS selector for the select element',
              },
              option: {
                type: 'object',
                description: 'Option selection criteria',
                properties: {
                  by: {
                    type: 'string',
                    enum: ['text', 'value', 'index'],
                    description: 'How to select the option',
                  },
                  text: {
                    type: 'string',
                    description: 'Option text to match (when by=text)',
                  },
                  value: {
                    type: 'string',
                    description: 'Option value to match (when by=value)',
                  },
                  index: {
                    type: 'number',
                    description: 'Option index to select (when by=index)',
                  },
                },
              },
              timeout: {
                type: 'number',
                description: 'Timeout in milliseconds. Default: 10000',
              },
            },
            required: ['selector', 'option'],
          },
        },
        {
          name: 'wait_for_page_change',
          description: 'Wait for the page URL to change (useful after form submissions or navigation)',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'Session ID of the browser (alternative to browserId)',
              },
              browserId: {
                type: 'string',
                description: 'Browser ID of the browser (alternative to sessionId)',
              },
              fromUrl: {
                type: 'string',
                description: 'Current URL to wait for change from',
              },
              toUrlPattern: {
                type: 'string',
                description: 'URL pattern to wait for (supports wildcards)',
              },
              timeout: {
                type: 'number',
                description: 'Timeout in milliseconds. Default: 10000',
              },
              takeScreenshot: {
                type: 'boolean',
                description: 'Take screenshot when page changes. Default: false',
              },
            },
          },
        },
        {
          name: 'set_badge',
          description: 'Set or update the debug badge text displayed on the page. Can be called at any time to change the badge. Pass empty string to remove badge.',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'Session ID of the browser (alternative to browserId)',
              },
              browserId: {
                type: 'string',
                description: 'Browser ID of the browser (alternative to sessionId)',
              },
              badge: {
                type: 'string',
                description: 'Badge text to display. Pass empty string to remove badge.',
              },
            },
            required: ['badge'],
          },
        },
        {
          name: 'get_page_elements_markdown',
          description: 'Get all page elements formatted as simple markdown that Cursor can understand. Returns a structured markdown document with all elements, their selectors, properties, and interaction capabilities. Perfect for autonomous element discovery and management.',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'Session ID of the browser (alternative to browserId)',
              },
              browserId: {
                type: 'string',
                description: 'Browser ID of the browser (alternative to sessionId)',
              },
              includeHidden: {
                type: 'boolean',
                description: 'Include hidden elements. Default: false',
              },
              elementLimit: {
                type: 'number',
                description: 'Maximum number of elements to return. Default: 100',
              },
            },
          },
        },
      ];

      // Add plugin tools
      const plugins = this.pluginManager.getAllPlugins();
      for (const plugin of plugins) {
        for (const tool of plugin.tools) {
          try {
            // Validate and sanitize tool schema to ensure JSON serialization works
            const sanitizedSchema = this.sanitizeToolSchema(tool.inputSchema);
            const toolDef = {
              name: tool.name,
              description: tool.description,
              inputSchema: sanitizedSchema,
            };

            // Test JSON serialization before adding
            JSON.stringify(toolDef);

            tools.push(toolDef);
          } catch (error) {
            this.logger.error('Failed to add plugin tool', {
              plugin: plugin.name,
              tool: tool.name,
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }
      }

      // Final validation - ensure the entire tools array can be serialized
      try {
        JSON.stringify(tools);
      } catch (error) {
        this.logger.error('Tools array serialization failed', {
          error: error instanceof Error ? error.message : String(error),
          toolCount: tools.length
        });
        // Return only built-in tools if plugin tools cause issues
        return { tools: tools.slice(0, tools.length - (tools.length - 625)) };
      }

      return { tools };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      // Log incoming tool call for debugging
      try {
        this.logger.debug('Handling CallTool action', {
          toolName: name,
          argsKeys: args ? Object.keys(args) : [],
          argsStringified: args ? JSON.stringify(args).substring(0, 200) : 'null'
        });
      } catch (logError) {
        this.logger.warn('Failed to log tool call args', {
          toolName: name,
          error: logError instanceof Error ? logError.message : String(logError)
        });
      }

      try {
        let result;

        switch (name) {
          case 'open_browser':
            result = await openBrowserTool(args, this.browserSessions, this.chromeDriverManager, this.logger, this.setBadge.bind(this));
            break;

          case 'navigate_to':
            result = await this.handleNavigateTo(args);
            break;

          case 'click_element':
            result = await this.handleClickElement(args);
            break;

          case 'type_text':
            result = await this.handleTypeText(args);
            break;

          case 'take_screenshot':
            result = await this.handleTakeScreenshot(args);
            break;

          case 'execute_script':
            result = await this.handleExecuteScript(args);
            break;

          case 'close_browser':
            result = await closeBrowserTool(args, this.getSession.bind(this), this.browserSessions, this.logger, this.getSessionByBrowserId.bind(this));
            break;

          case 'list_browsers':
            result = await this.listBrowsers();
            break;

          case 'get_window_info':
            result = await this.getWindowInfo(args);
            break;

          case 'set_window_size':
            result = await this.setWindowSize(args);
            break;

          case 'set_window_position':
            result = await this.setWindowPosition(args);
            break;

          case 'get_page_debug_info':
            result = await this.handleGetPageDebugInfo(args);
            break;

          case 'get_interactive_elements':
            result = await this.handleGetInteractiveElements(args);
            break;

          case 'list_elements':
            result = await this.handleListElements(args);
            break;

          case 'check_element_exists':
            result = await this.handleCheckElementExists(args);
            break;

          case 'find_by_description':
            result = await this.handleFindByDescription(args);
            break;

          case 'fill_form':
            result = await this.handleFillForm(args);
            break;

          case 'select_option':
            result = await this.handleSelectOption(args);
            break;

          case 'wait_for_page_change':
            result = await this.handleWaitForPageChange(args);
            break;

          case 'set_badge':
            result = await this.handleSetBadge(args);
            break;

          case 'get_page_elements_markdown':
            result = await this.handleGetPageElementsMarkdown(args);
            break;

          default:
            // Check if it's a plugin tool
            const pluginTool = this.findPluginTool(name);
            if (pluginTool) {
              try {
                // Pass context to plugin (getSession function)
                const context = {
                  getSession: this.getSession.bind(this),
                  browserSessions: this.browserSessions,
                };
                result = await this.pluginManager.executeTool(pluginTool.pluginName, pluginTool.toolName, args || {}, context);
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

        // Log successful tool execution
        this.logger.debug('Tool execution completed', {
          toolName: name,
          success: result && typeof result === 'object' && 'success' in result ? result.success : true
        });

        // Plugin tools return { content: Array<{ type: string; text: string }> } format
        if (result && typeof result === 'object' && 'content' in result && Array.isArray(result.content)) {
          return result;
        }

        // Built-in tools return { success: boolean, message: string, data?: any } format
        let responseText: string;
        try {
          responseText = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
        } catch (jsonError) {
          this.logger.error('Failed to stringify tool result', {
            toolName: name,
            error: jsonError instanceof Error ? jsonError.message : String(jsonError),
            resultType: typeof result
          });
          responseText = `Error serializing result: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`;
        }

        return {
          content: [
            {
              type: 'text',
              text: responseText,
            },
          ],
        };
      } catch (error) {
        // Enhanced error logging
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;

        this.logger.error('Tool execution error', {
          toolName: name,
          error: errorMessage,
          stack: errorStack,
          args: args ? JSON.stringify(args).substring(0, 500) : 'null'
        });

        return {
          content: [
            {
              type: 'text',
              text: `Error: ${errorMessage}`,
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

  private getSessionByBrowserId(browserId: string): BrowserSession | null {
    const session = this.browserSessions.get(browserId);
    if (session && session.isActive) {
      session.lastUsed = new Date();
      return session;
    }
    return null;
  }

  private async setBadge(args: any) {
    const { sessionId, badge } = args;
    const session = await this.getSession(sessionId);
    if (!session) return { success: false, message: 'Session not found' };

    try {
      if (badge && badge.trim()) {
        const badgeText = badge.trim();
        session.badge = badgeText;
        await session.driver.executeScript(`localStorage.setItem('mcp-debug-badge', '${badgeText}');`);
        await this.injectBadge(session.driver);
        return { success: true };
      } else {
        session.badge = undefined;
        await session.driver.executeScript(`localStorage.removeItem('mcp-debug-badge');const e=document.getElementById('mcp-debug-badge');if(e)e.remove();`);
        return { success: true };
      }
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : String(error) };
    }
  }

  private async injectBadge(driver: WebDriver) {
    const result = await driver.executeScript(`
      try {
        // Get badge text with fallback
        let badgeText = 'RIDER'; // Default fallback
        try {
          badgeText = localStorage.getItem('mcp-debug-badge') || 'RIDER';
        } catch (e) {
          badgeText = 'RIDER';
        }
        
        if (!badgeText) {
          return { success: false, reason: 'No badge text' };
        }

        // Remove existing badge if any
        const existingBadge = document.getElementById('mcp-debug-badge');
        if (existingBadge) {
          existingBadge.remove();
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
        }
        
        // Add to body
        if (document.body) {
          document.body.appendChild(badge);
        } else {
          // Wait for body to be ready
          document.addEventListener('DOMContentLoaded', function() {
            if (document.body) {
              document.body.appendChild(badge);
            }
          });
        }
        
        // Try to re-store badge text
        try {
          localStorage.setItem('mcp-debug-badge', badgeText);
        } catch (e) {
          // Silently fail
        }
        
        // Set up automatic re-injection on every page load/navigation
        // This ensures badge persists across all navigations to identify Cursor's actions
        if (!window.mcpBadgeObserverSetup) {
          window.mcpBadgeObserverSetup = true;
          
          // Function to re-inject badge from localStorage
          function reInjectBadge() {
            try {
              const storedBadge = localStorage.getItem('mcp-debug-badge');
              if (storedBadge && !document.getElementById('mcp-debug-badge')) {
                // Badge exists in storage but not on page, re-inject
                const badgeEl = document.createElement('div');
                badgeEl.id = 'mcp-debug-badge';
                badgeEl.textContent = storedBadge;
                badgeEl.style.cssText = \`
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
                if (document.body) {
                  document.body.appendChild(badgeEl);
                }
              }
            } catch (e) {
              // Ignore errors
            }
          }
          
          // Re-inject on DOMContentLoaded
          document.addEventListener('DOMContentLoaded', reInjectBadge);
          
          // Re-inject immediately if DOM is already loaded
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', reInjectBadge);
          } else {
            reInjectBadge();
          }
          
          // Watch for dynamic content changes (SPA navigation)
          if (document.body) {
            const observer = new MutationObserver(function(mutations) {
              if (!document.getElementById('mcp-debug-badge')) {
                reInjectBadge();
              }
            });
            
            observer.observe(document.body, {
              childList: true,
              subtree: true
            });
          }
          
          // Also re-inject on popstate (back/forward navigation)
          window.addEventListener('popstate', reInjectBadge);
          
          // Re-inject after delays to catch late-loading pages
          setTimeout(reInjectBadge, 100);
          setTimeout(reInjectBadge, 500);
          setTimeout(reInjectBadge, 1000);
        }
        
        return { success: true, badgeText: badgeText };
      } catch (e) {
        return { success: false, error: e.message };
      }
    `);

    this.logger.info('Badge injection result', { result });
    return result;
  }

  private async executeScript(args: any) {
    const { sessionId, script, args: scriptArgs = [] } = args;
    const session = await this.getSession(sessionId);
    if (!session) return { success: false, message: 'Session not found' };
    try {
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
    if (!session) return { success: false, message: 'Session not found' };

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
    if (!session) return { success: false, message: 'Session not found' };
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
    if (!session) return { success: false, message: 'Session not found' };
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
    if (!session) return { success: false, message: 'Session not found' };
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
    if (!session) return { success: false, message: 'Session not found' };
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
    if (!session) return { success: false, message: 'Session not found' };
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


  /**
   * Helper to resolve session from either sessionId or browserId
   * This ensures all tools can work with both identifiers consistently
   */
  private async resolveSession(args: { sessionId?: string; browserId?: string }): Promise<BrowserSession | null> {
    if (args.browserId) {
      const session = this.getSessionByBrowserId(args.browserId);
      if (session) return session;
    }
    if (args.sessionId) {
      return await this.getSession(args.sessionId);
    }
    return null;
  }

  // Wrapper methods to support both sessionId and browserId consistently
  private async handleNavigateTo(args: any) {
    const session = await this.resolveSession(args);
    if (!session) {
      return { success: false, message: 'Browser not found' };
    }
    return await navigateToTool({ ...args, sessionId: session.sessionId }, this.getSession.bind(this), this.logger, this.injectBadge.bind(this));
  }

  private async handleClickElement(args: any) {
    const session = await this.resolveSession(args);
    if (!session) {
      return { success: false, message: 'Browser not found' };
    }
    return await clickElementTool({ ...args, sessionId: session.sessionId }, this.getSession.bind(this), this.findElementBySelector.bind(this), this.logger);
  }

  private async handleTypeText(args: any) {
    const session = await this.resolveSession(args);
    if (!session) {
      return { success: false, message: 'Browser not found' };
    }
    return await typeTextTool({ ...args, sessionId: session.sessionId }, this.getSession.bind(this), this.findElementBySelector.bind(this), this.logger);
  }

  private async handleTakeScreenshot(args: any) {
    const session = await this.resolveSession(args);
    if (!session) {
      return { success: false, message: 'Browser not found' };
    }
    return await takeScreenshotTool({ ...args, sessionId: session.sessionId }, this.getSession.bind(this), this.logger);
  }

  private async handleExecuteScript(args: any) {
    const session = await this.resolveSession(args);
    if (!session) {
      return { success: false, message: 'Browser not found' };
    }
    return await executeScriptTool({ ...args, sessionId: session.sessionId }, this.getSession.bind(this), this.logger);
  }

  private async handleGetPageDebugInfo(args: any) {
    const session = await this.resolveSession(args);
    if (!session) {
      return { success: false, message: 'Browser not found' };
    }
    return await getPageDebugInfoTool(
      { ...args, sessionId: session.sessionId },
      this.getSession.bind(this),
      (args: any) => getInteractiveElementsTool(args, this.getSession.bind(this), this.logger),
      this.logger
    );
  }

  private async handleGetInteractiveElements(args: any) {
    const session = await this.resolveSession(args);
    if (!session) {
      return { success: false, message: 'Browser not found' };
    }
    return await getInteractiveElementsTool({ ...args, sessionId: session.sessionId }, this.getSession.bind(this), this.logger);
  }


  private async handleListElements(args: any) {
    const session = await this.resolveSession(args);
    if (!session) {
      return { success: false, message: 'Browser not found' };
    }
    return await this.listElements({ ...args, sessionId: session.sessionId });
  }

  private async handleCheckElementExists(args: any) {
    const session = await this.resolveSession(args);
    if (!session) {
      return { success: false, message: 'Browser not found' };
    }
    return await this.checkElementExists({ ...args, sessionId: session.sessionId });
  }

  private async handleFindByDescription(args: any) {
    const session = await this.resolveSession(args);
    if (!session) {
      return { success: false, message: 'Browser not found' };
    }
    return await this.findByDescription({ ...args, sessionId: session.sessionId });
  }

  private async handleFillForm(args: any) {
    const session = await this.resolveSession(args);
    if (!session) {
      return { success: false, message: 'Browser not found' };
    }
    return await this.fillForm({ ...args, sessionId: session.sessionId });
  }

  private async handleSelectOption(args: any) {
    const session = await this.resolveSession(args);
    if (!session) {
      return { success: false, message: 'Browser not found' };
    }
    return await this.selectOption({ ...args, sessionId: session.sessionId });
  }

  private async handleWaitForPageChange(args: any) {
    const session = await this.resolveSession(args);
    if (!session) {
      return { success: false, message: 'Browser not found' };
    }
    return await this.waitForPageChange({ ...args, sessionId: session.sessionId });
  }

  private async handleSetBadge(args: any) {
    const session = await this.resolveSession(args);
    if (!session) {
      return { success: false, message: 'Browser not found' };
    }
    return await this.setBadge({ ...args, sessionId: session.sessionId });
  }

  private async handleGetPageElementsMarkdown(args: any) {
    const session = await this.resolveSession(args);
    if (!session) {
      return { success: false, message: 'Browser not found' };
    }
    return await getPageElementsMarkdownTool({ ...args, sessionId: session.sessionId }, this.getSession.bind(this), this.logger);
  }

  private async listBrowsers() {
    const browsers = Array.from(this.browserSessions.values()).map(s => ({
      id: s.browserId,
      session: s.sessionId,
      active: s.isActive
    }));
    return { success: true, data: { browsers, count: browsers.length } };
  }

  private async getWindowInfo(args: any) {
    const session = await this.resolveSession(args);
    if (!session) {
      return { success: false, message: 'Browser not found' };
    }

    try {
      const rect = await session.driver.manage().window().getRect();

      const windowInfo = {
        browserId: session.browserId,
        sessionId: session.sessionId,
        size: {
          width: rect.width,
          height: rect.height,
        },
        position: {
          x: rect.x,
          y: rect.y,
        },
        rect: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        },
      };

      this.logger.info('Window info retrieved', { browserId: session.browserId, windowInfo });
      return {
        success: true,
        message: 'Window info retrieved successfully',
        data: windowInfo,
      };
    } catch (error) {
      this.logger.error('Failed to get window info', {
        browserId: session.browserId,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        message: `Failed to get window info: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private async setWindowSize(args: any) {
    const session = await this.resolveSession(args);
    if (!session) return { success: false, message: 'Browser not found' };
    const { width, height } = args;
    if (!width || !height) return { success: false, message: 'Width and height required' };

    try {
      // Get current position to preserve it
      const currentRect = await session.driver.manage().window().getRect();
      // Set size using setRect (which includes position)
      await session.driver.manage().window().setRect({
        x: currentRect.x,
        y: currentRect.y,
        width: width,
        height: height,
      });
      this.logger.info('Window size set', { browserId: session.browserId, width, height });
      return {
        success: true,
        message: `Window size set to ${width}x${height}`,
        data: { width, height },
      };
    } catch (error) {
      this.logger.error('Failed to set window size', {
        browserId: session.browserId,
        width,
        height,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        message: `Failed to set window size: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private async setWindowPosition(args: any) {
    const session = await this.resolveSession(args);
    if (!session) {
      return { success: false, message: 'Browser not found' };
    }

    const { x, y, monitor } = args;
    let finalX = x;
    let finalY = y;

    // Use monitor preset if x/y not provided
    if (finalX === undefined || finalY === undefined) {
      if (monitor) {
        const monitorPos = this.getMonitorPosition(monitor);
        finalX = monitorPos.x;
        finalY = monitorPos.y;
      } else {
        return {
          success: false,
          message: 'Either x/y coordinates or monitor preset must be provided',
        };
      }
    }

    try {
      // Get current window size to preserve it
      const currentRect = await session.driver.manage().window().getRect();
      // Set position using setRect (which includes position)
      await session.driver.manage().window().setRect({
        x: finalX,
        y: finalY,
        width: currentRect.width,
        height: currentRect.height,
      });
      this.logger.info('Window position set', {
        browserId: session.browserId,
        x: finalX,
        y: finalY,
        monitor: monitor || 'custom',
      });
      return {
        success: true,
        message: `Window position set to (${finalX}, ${finalY})`,
        data: { x: finalX, y: finalY, monitor: monitor || null },
      };
    } catch (error) {
      this.logger.error('Failed to set window position', {
        browserId: session.browserId,
        x,
        y,
        monitor,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        message: `Failed to set window position: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private getMonitorPosition(monitor: string): { x: number; y: number } {
    switch (monitor) {
      case 'primary':
        return { x: 0, y: 0 };
      case 'secondary':
        return { x: 1920, y: 0 }; // Assuming 1920px width for primary monitor
      case 'auto':
      default:
        return { x: 0, y: 0 };
    }
  }

  async run() {
    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      this.logger.info('MCP Selenium Server running on stdio');

      // Add error handlers
      process.on('uncaughtException', (error) => {
        this.logger.error('Uncaught exception', {
          error: error.message,
          stack: error.stack
        });
      });

      process.on('unhandledRejection', (reason, promise) => {
        this.logger.error('Unhandled rejection', {
          reason: reason instanceof Error ? reason.message : String(reason),
          stack: reason instanceof Error ? reason.stack : undefined
        });
      });
    } catch (error) {
      this.logger.error('Failed to start server', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }


  private sanitizeToolSchema(schema: any): any {
    try {
      const sanitized = JSON.parse(JSON.stringify(schema));

      // Ensure basic structure
      if (!sanitized.type) sanitized.type = 'object';
      if (!sanitized.required) sanitized.required = [];
      if (!sanitized.properties) sanitized.properties = {};

      // Remove default values (they cause serialization issues)
      for (const propName in sanitized.properties) {
        const prop = sanitized.properties[propName];
        if ('default' in prop) delete prop.default;
      }

      return sanitized;
    } catch (error) {
      return { type: 'object', properties: {}, required: [] };
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

}

// Run the server
const server = new MCPSeleniumServer();
server.run().catch(console.error);