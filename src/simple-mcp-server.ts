#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { BrowserAutomationCore } from './core/browser-automation-core.js';
import { PluginManager } from './plugin-manager.js';

class SimpleMCPServer {
  private server: Server;
  private browserCore: BrowserAutomationCore;
  private pluginManager: PluginManager;

  constructor() {
    this.server = new Server(
      {
        name: 'selenium-mcp-server',
        version: '1.0.0',
        description: 'MCP Server for browser automation using Selenium WebDriver',
      }
    );

    this.browserCore = new BrowserAutomationCore();
    this.pluginManager = new PluginManager(this.browserCore);
    this.setupToolHandlers();
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
                  enum: ['chrome', 'duckduckgo', 'firefox'],
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
              },
            },
          },
          {
            name: 'get_page_title',
            description: 'Get the current page title',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'get_page_url',
            description: 'Get the current page URL',
            inputSchema: {
              type: 'object',
              properties: {},
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
                          'take_screenshot', 'wait'
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
                  description: 'CSS selector or XPath for the draggable element (e.g., button, div with draggable="true")'
                },
                targetSelector: {
                  type: 'string',
                  description: 'CSS selector or XPath for the drop zone element (e.g., div with id="drawflow")'
                },
                sourceBy: {
                  type: 'string',
                  enum: ['css', 'xpath', 'id', 'name', 'className', 'tagName'],
                  description: 'Type of selector for source draggable element',
                  default: 'css'
                },
                targetBy: {
                  type: 'string',
                  enum: ['css', 'xpath', 'id', 'name', 'className', 'tagName'],
                  description: 'Type of selector for target drop zone element',
                  default: 'css'
                },
                timeout: {
                  type: 'number',
                  description: 'Timeout in milliseconds for the drag and drop operation',
                  default: 10000
                }
              },
              required: ['sourceSelector', 'targetSelector']
            }
          },
          {
            name: 'hover_element',
            description: 'Hover over an element',
            inputSchema: {
              type: 'object',
              properties: {
                selector: {
                  type: 'string',
                  description: 'CSS selector or XPath to find the element'
                },
                by: {
                  type: 'string',
                  enum: ['css', 'xpath', 'id', 'name', 'className', 'tagName'],
                  description: 'Type of selector',
                  default: 'css'
                },
                timeout: {
                  type: 'number',
                  description: 'Timeout in milliseconds',
                  default: 10000
                }
              },
              required: ['selector']
            }
          },
          {
            name: 'double_click_element',
            description: 'Double-click on an element',
            inputSchema: {
              type: 'object',
              properties: {
                selector: {
                  type: 'string',
                  description: 'CSS selector or XPath to find the element'
                },
                by: {
                  type: 'string',
                  enum: ['css', 'xpath', 'id', 'name', 'className', 'tagName'],
                  description: 'Type of selector',
                  default: 'css'
                },
                timeout: {
                  type: 'number',
                  description: 'Timeout in milliseconds',
                  default: 10000
                }
              },
              required: ['selector']
            }
          },
          {
            name: 'right_click_element',
            description: 'Right-click on an element',
            inputSchema: {
              type: 'object',
              properties: {
                selector: {
                  type: 'string',
                  description: 'CSS selector or XPath to find the element'
                },
                by: {
                  type: 'string',
                  enum: ['css', 'xpath', 'id', 'name', 'className', 'tagName'],
                  description: 'Type of selector',
                  default: 'css'
                },
                timeout: {
                  type: 'number',
                  description: 'Timeout in milliseconds',
                  default: 10000
                }
              },
              required: ['selector']
            }
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
                  default: '*'
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of elements to return',
                  default: 100
                }
              }
            }
          },
          {
            name: 'wait_for_element',
            description: 'Wait for an element to appear and be visible',
            inputSchema: {
              type: 'object',
              properties: {
                selector: {
                  type: 'string',
                  description: 'CSS selector or XPath to find the element'
                },
                by: {
                  type: 'string',
                  enum: ['css', 'xpath', 'id', 'name', 'className', 'tagName'],
                  description: 'Type of selector',
                  default: 'css'
                },
                timeout: {
                  type: 'number',
                  description: 'Timeout in milliseconds',
                  default: 10000
                }
              },
              required: ['selector']
            }
          },
          {
            name: 'close_browser',
            description: 'Close the current browser instance',
            inputSchema: {
              type: 'object',
              properties: {},
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
        }

        switch (name) {
          case 'open_browser':
            result = await this.browserCore.openBrowser(typedArgs);
            break;
          
          case 'navigate_to':
            result = await this.browserCore.navigateTo(typedArgs.url);
            break;
          
          case 'click_element':
            result = await this.browserCore.clickElement({
              selector: typedArgs.selector,
              by: typedArgs.by || 'css',
              timeout: typedArgs.timeout || 3000
            });
            break;
          
          case 'type_text':
            result = await this.browserCore.typeText({
              selector: typedArgs.selector,
              text: typedArgs.text,
              by: typedArgs.by || 'css',
              timeout: typedArgs.timeout || 3000
            });
            break;
          
          case 'take_screenshot':
            result = await this.browserCore.takeScreenshot(typedArgs.filename, typedArgs.fullPage);
            break;
          
          case 'get_page_title':
            result = await this.browserCore.getPageTitle();
            break;
          
          case 'get_page_url':
            result = await this.browserCore.getPageUrl();
            break;
          
          case 'execute_script':
            result = await this.browserCore.executeScript(typedArgs.script, typedArgs.args || []);
            break;
          
          case 'execute_action_sequence':
            result = await this.browserCore.executeActionSequence(
              typedArgs.actions,
              typedArgs.continueOnError || false,
              typedArgs.stopOnError !== false
            );
            break;
          
          case 'drag_and_drop':
            result = await this.browserCore.dragAndDrop(
              {
                selector: typedArgs.sourceSelector,
                by: typedArgs.sourceBy || 'css',
                timeout: typedArgs.timeout || 3000
              },
              {
                selector: typedArgs.targetSelector,
                by: typedArgs.targetBy || 'css',
                timeout: typedArgs.timeout || 3000
              }
            );
            break;
          
          case 'hover_element':
            result = await this.browserCore.hoverElement({
              selector: typedArgs.selector,
              by: typedArgs.by || 'css',
              timeout: typedArgs.timeout || 3000
            });
            break;
          
          case 'double_click_element':
            result = await this.browserCore.doubleClickElement({
              selector: typedArgs.selector,
              by: typedArgs.by || 'css',
              timeout: typedArgs.timeout || 3000
            });
            break;
          
          case 'right_click_element':
            result = await this.browserCore.rightClickElement({
              selector: typedArgs.selector,
              by: typedArgs.by || 'css',
              timeout: typedArgs.timeout || 3000
            });
            break;
          
          case 'get_page_elements':
            result = await this.browserCore.getPageElements(typedArgs.selector || '*', typedArgs.limit || 100);
            break;
          
          case 'wait_for_element':
            result = await this.browserCore.waitForElement({
              selector: typedArgs.selector,
              by: typedArgs.by || 'css',
              timeout: typedArgs.timeout || 3000
            });
            break;
          
          case 'close_browser':
            result = await this.browserCore.closeBrowser();
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
