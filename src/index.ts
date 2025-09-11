#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { BrowserManager } from './browser-manager.js';
import { PluginManager } from './plugin-manager.js';

class SimpleMCPServer {
  private server: Server;
  private browserManager: BrowserManager;
  private pluginManager: PluginManager;

  constructor() {
    this.server = new Server(
      {
        name: 'selenium-mcp-server',
        version: '1.0.0',
        description: 'MCP Server for browser automation using Selenium WebDriver',
      },
    );

    this.browserManager = new BrowserManager();
    this.pluginManager = new PluginManager(this.browserManager);
    this.setupToolHandlers();
  }

  private getBrowserInstance(browserId?: string) {
    const browser = this.browserManager.getBrowser(browserId);
    if (!browser) {
      const availableBrowsers = this.browserManager.listBrowsers();
      const errorMessage = browserId
        ? `Browser with ID '${browserId}' not found. Available browsers: ${availableBrowsers.map(b => b.id).join(', ') || 'none'}`
        : 'No browser instance available. Please call open_browser first.';
      throw new Error(errorMessage);
    }
    return browser;
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const coreTools = [
        {
          name: 'open_browser',
          description: 'Open a new browser instance',
          inputSchema: {
            type: 'object',
            properties: {
              headless: {
                type: 'boolean',
                description: 'Whether to run browser in headless mode',
                default: false,
              },
              width: {
                type: 'number',
                description: 'Browser window width',
                default: 1280,
              },
              height: {
                type: 'number',
                description: 'Browser window height',
                default: 720,
              },
              browserType: {
                type: 'string',
                enum: ['chrome'],
                description: 'Type of browser to use',
                default: 'chrome',
              },
              userAgent: {
                type: 'string',
                description: 'Custom user agent string',
              },
              proxy: {
                type: 'string',
                description: 'Proxy server (format: host:port)',
              },
              browserId: {
                type: 'string',
                description: 'Optional browser ID to use for this instance. If not provided, a new browser will be created with a unique ID.',
              },
            },
          },
        },
        {
          name: 'navigate_to',
          description: 'Navigate to a specific URL',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'The URL to navigate to',
              },
              browserId: {
                type: 'string',
                description: 'Optional browser ID to use. If not provided, uses the default browser instance.',
              },
            },
            required: ['url'],
          },
        },
        {
          name: 'click_element',
          description: 'Click on an element',
          inputSchema: {
            type: 'object',
            properties: {
              selector: {
                type: 'string',
                description: 'CSS selector or XPath to find the element',
              },
              by: {
                type: 'string',
                enum: ['css', 'xpath', 'id', 'name', 'className', 'tagName'],
                description: 'Type of selector',
                default: 'css',
              },
              timeout: {
                type: 'number',
                description: 'Timeout in milliseconds',
                default: 10000,
              },
              browserId: {
                type: 'string',
                description: 'Optional browser ID to use. If not provided, uses the default browser instance.',
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
              selector: {
                type: 'string',
                description: 'CSS selector or XPath to find the element',
              },
              text: {
                type: 'string',
                description: 'Text to type',
              },
              by: {
                type: 'string',
                enum: ['css', 'xpath', 'id', 'name', 'className', 'tagName'],
                description: 'Type of selector',
                default: 'css',
              },
              timeout: {
                type: 'number',
                description: 'Timeout in milliseconds',
                default: 10000,
              },
              browserId: {
                type: 'string',
                description: 'Optional browser ID to use. If not provided, uses the default browser instance.',
              },
            },
            required: ['selector', 'text'],
          },
        },
        {
          name: 'take_screenshot',
          description: 'Take a screenshot of the current page',
          inputSchema: {
            type: 'object',
            properties: {
              filename: {
                type: 'string',
                description: 'Filename for the screenshot (optional)',
              },
              fullPage: {
                type: 'boolean',
                description: 'Whether to capture the full page',
                default: false,
              },
              browserId: {
                type: 'string',
                description: 'Optional browser ID to use. If not provided, uses the default browser instance.',
              },
            },
          },
        },
        {
          name: 'get_page_title',
          description: 'Get the current page title',
          inputSchema: {
            type: 'object',
            properties: {
              browserId: {
                type: 'string',
                description: 'Optional browser ID to use. If not provided, uses the default browser instance.',
              },
            },
          },
        },
        {
          name: 'get_page_url',
          description: 'Get the current page URL',
          inputSchema: {
            type: 'object',
            properties: {
              browserId: {
                type: 'string',
                description: 'Optional browser ID to use. If not provided, uses the default browser instance.',
              },
            },
          },
        },
        {
          name: 'execute_script',
          description: 'Execute JavaScript in the browser',
          inputSchema: {
            type: 'object',
            properties: {
              script: {
                type: 'string',
                description: 'JavaScript code to execute',
              },
              args: {
                type: 'array',
                description: 'Arguments to pass to the script',
                items: {
                  type: 'string',
                },
              },
              browserId: {
                type: 'string',
                description: 'Optional browser ID to use. If not provided, uses the default browser instance.',
              },
            },
            required: ['script'],
          },
        },
        {
          name: 'execute_action_sequence',
          description: 'Execute a sequence of actions on the page in order',
          inputSchema: {
            type: 'object',
            properties: {
              actions: {
                type: 'array',
                description: 'Array of actions to execute in sequence',
                items: {
                  type: 'object',
                  properties: {
                    action: {
                      type: 'string',
                      enum: [
                        'click', 'type', 'navigate_to', 'execute_script',
                        'take_screenshot', 'wait',
                      ],
                      description: 'Type of action to perform',
                    },
                    selector: {
                      type: 'string',
                      description: 'CSS selector for the element (required for most actions)',
                    },
                    text: {
                      type: 'string',
                      description: 'Text for type action',
                    },
                    value: {
                      type: 'string',
                      description: 'Value for navigate_to action',
                    },
                    script: {
                      type: 'string',
                      description: 'JavaScript code for execute_script action',
                    },
                    timeout: {
                      type: 'number',
                      description: 'Timeout in milliseconds for this specific action',
                      default: 10000,
                    },
                    description: {
                      type: 'string',
                      description: 'Optional description of what this action does',
                    },
                  },
                  required: ['action'],
                },
              },
              continueOnError: {
                type: 'boolean',
                description: 'Whether to continue executing remaining actions if one fails',
                default: false,
              },
              stopOnError: {
                type: 'boolean',
                description: 'Whether to stop execution on first error (opposite of continueOnError)',
                default: true,
              },
              browserId: {
                type: 'string',
                description: 'Optional browser ID to use. If not provided, uses the default browser instance.',
              },
            },
            required: ['actions'],
          },
        },
        {
          name: 'drag_and_drop',
          description: 'Drag a draggable element and drop it onto a drop zone element',
          inputSchema: {
            type: 'object',
            properties: {
              sourceSelector: {
                type: 'string',
                description: 'CSS selector or XPath for the draggable element (e.g., button, div with draggable="true")',
              },
              targetSelector: {
                type: 'string',
                description: 'CSS selector or XPath for the drop zone element (e.g., div with id="drawflow")',
              },
              sourceBy: {
                type: 'string',
                enum: ['css', 'xpath', 'id', 'name', 'className', 'tagName'],
                description: 'Type of selector for source draggable element',
                default: 'css',
              },
              targetBy: {
                type: 'string',
                enum: ['css', 'xpath', 'id', 'name', 'className', 'tagName'],
                description: 'Type of selector for target drop zone element',
                default: 'css',
              },
              timeout: {
                type: 'number',
                description: 'Timeout in milliseconds for the drag and drop operation',
                default: 10000,
              },
              browserId: {
                type: 'string',
                description: 'Optional browser ID to use. If not provided, uses the default browser instance.',
              },
            },
            required: ['sourceSelector', 'targetSelector'],
          },
        },
        {
          name: 'hover_element',
          description: 'Hover over an element',
          inputSchema: {
            type: 'object',
            properties: {
              selector: {
                type: 'string',
                description: 'CSS selector or XPath to find the element',
              },
              by: {
                type: 'string',
                enum: ['css', 'xpath', 'id', 'name', 'className', 'tagName'],
                description: 'Type of selector',
                default: 'css',
              },
              timeout: {
                type: 'number',
                description: 'Timeout in milliseconds',
                default: 10000,
              },
              browserId: {
                type: 'string',
                description: 'Optional browser ID to use. If not provided, uses the default browser instance.',
              },
            },
            required: ['selector'],
          },
        },
        {
          name: 'double_click_element',
          description: 'Double-click on an element',
          inputSchema: {
            type: 'object',
            properties: {
              selector: {
                type: 'string',
                description: 'CSS selector or XPath to find the element',
              },
              by: {
                type: 'string',
                enum: ['css', 'xpath', 'id', 'name', 'className', 'tagName'],
                description: 'Type of selector',
                default: 'css',
              },
              timeout: {
                type: 'number',
                description: 'Timeout in milliseconds',
                default: 10000,
              },
              browserId: {
                type: 'string',
                description: 'Optional browser ID to use. If not provided, uses the default browser instance.',
              },
            },
            required: ['selector'],
          },
        },
        {
          name: 'right_click_element',
          description: 'Right-click on an element',
          inputSchema: {
            type: 'object',
            properties: {
              selector: {
                type: 'string',
                description: 'CSS selector or XPath to find the element',
              },
              by: {
                type: 'string',
                enum: ['css', 'xpath', 'id', 'name', 'className', 'tagName'],
                description: 'Type of selector',
                default: 'css',
              },
              timeout: {
                type: 'number',
                description: 'Timeout in milliseconds',
                default: 10000,
              },
              browserId: {
                type: 'string',
                description: 'Optional browser ID to use. If not provided, uses the default browser instance.',
              },
            },
            required: ['selector'],
          },
        },
        {
          name: 'get_page_elements',
          description: 'Get all elements on the current page',
          inputSchema: {
            type: 'object',
            properties: {
              selector: {
                type: 'string',
                description: 'CSS selector to filter elements (optional)',
                default: '*',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of elements to return',
                default: 100,
              },
              browserId: {
                type: 'string',
                description: 'Optional browser ID to use. If not provided, uses the default browser instance.',
              },
            },
          },
        },
        {
          name: 'wait_for_element',
          description: 'Wait for an element to appear and be visible',
          inputSchema: {
            type: 'object',
            properties: {
              selector: {
                type: 'string',
                description: 'CSS selector or XPath to find the element',
              },
              by: {
                type: 'string',
                enum: ['css', 'xpath', 'id', 'name', 'className', 'tagName'],
                description: 'Type of selector',
                default: 'css',
              },
              timeout: {
                type: 'number',
                description: 'Timeout in milliseconds',
                default: 10000,
              },
              browserId: {
                type: 'string',
                description: 'Optional browser ID to use. If not provided, uses the default browser instance.',
              },
            },
            required: ['selector'],
          },
        },
        {
          name: 'close_browser',
          description: 'Close a browser instance',
          inputSchema: {
            type: 'object',
            properties: {
              browserId: {
                type: 'string',
                description: 'Optional browser ID to close. If not provided, closes the default browser instance.',
              },
            },
          },
        },
        {
          name: 'list_browsers',
          description: 'List all active browser instances',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'get_browser_info',
          description: 'Get information about a specific browser instance',
          inputSchema: {
            type: 'object',
            properties: {
              browserId: {
                type: 'string',
                description: 'Optional browser ID to get info for. If not provided, returns info for the default browser instance.',
              },
            },
          },
        },
        {
          name: 'get_console_logs',
          description: 'Get console logs from the browser',
          inputSchema: {
            type: 'object',
            properties: {
              level: {
                type: 'string',
                enum: ['log', 'error', 'warn', 'info', 'debug'],
                description: 'Filter logs by level (optional)',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of logs to return (optional, returns most recent)',
                default: 100,
              },
              browserId: {
                type: 'string',
                description: 'Optional browser ID to use. If not provided, uses the default browser instance.',
              },
            },
          },
        },
        {
          name: 'clear_console_logs',
          description: 'Clear all console logs from the browser',
          inputSchema: {
            type: 'object',
            properties: {
              browserId: {
                type: 'string',
                description: 'Optional browser ID to use. If not provided, uses the default browser instance.',
              },
            },
          },
        },
        {
          name: 'get_console_log_count',
          description: 'Get the number of console log entries',
          inputSchema: {
            type: 'object',
            properties: {
              browserId: {
                type: 'string',
                description: 'Optional browser ID to use. If not provided, uses the default browser instance.',
              },
            },
          },
        },
      ];

      const pluginTools = this.pluginManager.getAllTools();

      return {
        tools: [...coreTools, ...pluginTools],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        let result;
        const typedArgs = args as any;

        try {
          result = await this.pluginManager.executeTool(name, typedArgs);
          return {
            content: [
              {
                type: 'text',
                text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (pluginError) {
          if (pluginError instanceof Error && pluginError.message.includes('not found in any plugin')) {
          } else {
            throw pluginError;
          }
        }

        switch (name) {
        case 'open_browser':
          result = await this.browserManager.openBrowser(typedArgs);
          break;

        case 'navigate_to':
          result = await this.getBrowserInstance(typedArgs.browserId).navigateTo(typedArgs.url);
          break;

        case 'click_element':
          result = await this.getBrowserInstance(typedArgs.browserId).clickElement({
            selector: typedArgs.selector,
            by: typedArgs.by || 'css',
            timeout: typedArgs.timeout || 3000,
          });
          break;

        case 'type_text':
          result = await this.getBrowserInstance(typedArgs.browserId).typeText({
            selector: typedArgs.selector,
            text: typedArgs.text,
            by: typedArgs.by || 'css',
            timeout: typedArgs.timeout || 3000,
          });
          break;

        case 'take_screenshot':
          result = await this.getBrowserInstance(typedArgs.browserId).takeScreenshot(typedArgs.filename, typedArgs.fullPage);
          break;

        case 'get_page_title':
          result = await this.getBrowserInstance(typedArgs.browserId).getPageTitle();
          break;

        case 'get_page_url':
          result = await this.getBrowserInstance(typedArgs.browserId).getPageUrl();
          break;

        case 'execute_script':
          result = await this.getBrowserInstance(typedArgs.browserId).executeScript(typedArgs.script, typedArgs.args || []);
          break;

        case 'execute_action_sequence':
          result = await this.getBrowserInstance(typedArgs.browserId).executeActionSequence(
            typedArgs.actions,
            typedArgs.continueOnError || false,
            typedArgs.stopOnError !== false,
          );
          break;

        case 'drag_and_drop':
          result = await this.getBrowserInstance(typedArgs.browserId).dragAndDrop(
            {
              selector: typedArgs.sourceSelector,
              by: typedArgs.sourceBy || 'css',
              timeout: typedArgs.timeout || 3000,
            },
            {
              selector: typedArgs.targetSelector,
              by: typedArgs.targetBy || 'css',
              timeout: typedArgs.timeout || 3000,
            },
          );
          break;

        case 'hover_element':
          result = await this.getBrowserInstance(typedArgs.browserId).hoverElement({
            selector: typedArgs.selector,
            by: typedArgs.by || 'css',
            timeout: typedArgs.timeout || 3000,
          });
          break;

        case 'double_click_element':
          result = await this.getBrowserInstance(typedArgs.browserId).doubleClickElement({
            selector: typedArgs.selector,
            by: typedArgs.by || 'css',
            timeout: typedArgs.timeout || 3000,
          });
          break;

        case 'right_click_element':
          result = await this.getBrowserInstance(typedArgs.browserId).rightClickElement({
            selector: typedArgs.selector,
            by: typedArgs.by || 'css',
            timeout: typedArgs.timeout || 3000,
          });
          break;

        case 'get_page_elements':
          result = await this.getBrowserInstance(typedArgs.browserId).getPageElements(typedArgs.selector || '*', typedArgs.limit || 100);
          break;

        case 'wait_for_element':
          result = await this.getBrowserInstance(typedArgs.browserId).waitForElement({
            selector: typedArgs.selector,
            by: typedArgs.by || 'css',
            timeout: typedArgs.timeout || 3000,
          });
          break;

        case 'close_browser':
          result = await this.browserManager.closeBrowser(typedArgs.browserId);
          break;

        case 'list_browsers':
          const browsers = this.browserManager.listBrowsers();
          result = {
            success: true,
            message: `Found ${browsers.length} active browser instances`,
            data: {
              count: browsers.length,
              browsers: browsers,
              defaultBrowserId: this.browserManager.getDefaultBrowserId(),
            },
          };
          break;

        case 'get_browser_info':
          const browserInfo = this.browserManager.getBrowserInfo(typedArgs.browserId);
          if (browserInfo) {
            result = {
              success: true,
              message: `Browser info for ID: ${browserInfo.id}`,
              data: browserInfo,
            };
          } else {
            result = {
              success: false,
              message: `Browser with ID '${typedArgs.browserId || 'default'}' not found`,
            };
          }
          break;

        case 'get_console_logs':
          result = await this.getBrowserInstance(typedArgs.browserId).getConsoleLogs(
            typedArgs.level,
            typedArgs.limit
          );
          break;

        case 'clear_console_logs':
          result = await this.getBrowserInstance(typedArgs.browserId).clearConsoleLogs();
          break;

        case 'get_console_log_count':
          result = await this.getBrowserInstance(typedArgs.browserId).getConsoleLogCount();
          break;

        default:
          throw new Error(`Unknown tool: ${name}`);
        }

        return {
          content: [
            {
              type: 'text',
              text: result.success ? result.message : `Error: ${result.message}`,
            },
          ],
          isError: !result.success,
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing ${name}: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async run() {
    await this.pluginManager.loadAllPlugins();

    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Selenium MCP Server running on stdio');
  }
}

const server = new SimpleMCPServer();
server.run().catch(console.error);
