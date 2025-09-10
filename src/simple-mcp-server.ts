#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { BrowserAutomationCore } from './core/browser-automation-core.js';

class SimpleMCPServer {
  private server: Server;
  private browserCore: BrowserAutomationCore;

  constructor() {
    this.server = new Server(
      {
        name: 'selenium-mcp-server',
        version: '1.0.0',
        description: 'MCP Server for browser automation using Selenium WebDriver',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.browserCore = new BrowserAutomationCore();
    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
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
            name: 'close_browser',
            description: 'Close the current browser instance',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        let result;

        switch (name) {
          case 'open_browser':
            result = await this.browserCore.openBrowser(args);
            break;
          
          case 'navigate_to':
            result = await this.browserCore.navigateTo(args.url);
            break;
          
          case 'click_element':
            result = await this.browserCore.clickElement({
              selector: args.selector,
              by: args.by || 'css',
              timeout: args.timeout || 10000
            });
            break;
          
          case 'type_text':
            result = await this.browserCore.typeText({
              selector: args.selector,
              text: args.text,
              by: args.by || 'css',
              timeout: args.timeout || 10000
            });
            break;
          
          case 'take_screenshot':
            result = await this.browserCore.takeScreenshot(args.filename, args.fullPage);
            break;
          
          case 'get_page_title':
            result = await this.browserCore.getPageTitle();
            break;
          
          case 'get_page_url':
            result = await this.browserCore.getPageUrl();
            break;
          
          case 'execute_script':
            result = await this.browserCore.executeScript(args.script, args.args || []);
            break;
          
          case 'execute_action_sequence':
            result = await this.browserCore.executeActionSequence(
              args.actions,
              args.continueOnError || false,
              args.stopOnError !== false
            );
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
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Selenium MCP Server running on stdio');
  }
}

const server = new SimpleMCPServer();
server.run().catch(console.error);
