#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { BrowserManager } from './browser-manager.js';
import { PluginManagerImpl } from './plugin-manager.js';
import { MCPPlugin } from './types/plugin.js';
import { join } from 'path';

class SeleniumMCPServer {
  private server: Server;
  private browserManager: BrowserManager;
  private pluginManager: PluginManagerImpl;
  private plugins: MCPPlugin[] = [];

  constructor() {
    this.server = new Server(
      {
        name: 'selenium-mcp-server',
        version: '1.0.0',
        description: 'MCP Server for comprehensive browser automation using Selenium WebDriver',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
          logging: {},
        },
      }
    );

    this.browserManager = new BrowserManager();
    this.pluginManager = new PluginManagerImpl(this.browserManager);
    this.setupToolHandlers();
    this.loadPlugins();
  }

  private async loadPlugins() {
    try {
      const pluginsDir = join(process.cwd(), 'plugins');
      this.plugins = await this.pluginManager.loadAllPlugins(pluginsDir);
      console.error(`Loaded ${this.plugins.length} plugins`);
    } catch (error) {
      console.error('Failed to load plugins:', error);
    }
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
            name: 'find_element',
            description: 'Find an element on the page',
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
            name: 'get_console_logs',
            description: 'Get browser console logs',
            inputSchema: {
              type: 'object',
              properties: {
                level: {
                  type: 'string',
                  enum: ['all', 'debug', 'info', 'warn', 'error'],
                  description: 'Console log level to retrieve',
                  default: 'all',
                },
              },
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
            name: 'wait_for_element',
            description: 'Wait for an element to be present and visible',
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
            name: 'get_page_elements',
            description: 'Get all interactive elements on the page (forms, inputs, buttons, links)',
            inputSchema: {
              type: 'object',
              properties: {
                includeText: {
                  type: 'boolean',
                  description: 'Include element text content',
                  default: true,
                },
                includeAttributes: {
                  type: 'boolean',
                  description: 'Include element attributes',
                  default: true,
                },
              },
            },
          },
          {
            name: 'get_form_elements',
            description: 'Get all form elements and their details',
            inputSchema: {
              type: 'object',
              properties: {
                formSelector: {
                  type: 'string',
                  description: 'CSS selector for specific form (optional)',
                },
              },
            },
          },
          {
            name: 'fill_form',
            description: 'Fill a form with provided data',
            inputSchema: {
              type: 'object',
              properties: {
                formData: {
                  type: 'object',
                  description: 'Object with field names as keys and values as form data',
                  additionalProperties: {
                    type: 'string',
                  },
                },
                formSelector: {
                  type: 'string',
                  description: 'CSS selector for the form (optional)',
                },
              },
              required: ['formData'],
            },
          },
          {
            name: 'get_page_info',
            description: 'Get comprehensive page information including title, URL, and metadata',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'get_loaded_scripts',
            description: 'Get information about loaded JavaScript files',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'get_dom_structure',
            description: 'Get the DOM structure of the page',
            inputSchema: {
              type: 'object',
              properties: {
                maxDepth: {
                  type: 'number',
                  description: 'Maximum depth to traverse',
                  default: 3,
                },
                includeText: {
                  type: 'boolean',
                  description: 'Include text content',
                  default: false,
                },
              },
            },
          },
          {
            name: 'wait_for_page_load',
            description: 'Wait for page to fully load including all resources',
            inputSchema: {
              type: 'object',
              properties: {
                timeout: {
                  type: 'number',
                  description: 'Timeout in milliseconds',
                  default: 30000,
                },
              },
            },
          },
          {
            name: 'scroll_to_element',
            description: 'Scroll to a specific element on the page',
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
            name: 'drag_and_drop',
            description: 'Drag an element and drop it on another element',
            inputSchema: {
              type: 'object',
              properties: {
                sourceSelector: {
                  type: 'string',
                  description: 'CSS selector or XPath for the source element to drag',
                },
                targetSelector: {
                  type: 'string',
                  description: 'CSS selector or XPath for the target element to drop on',
                },
                sourceBy: {
                  type: 'string',
                  enum: ['css', 'xpath', 'id', 'name', 'className', 'tagName'],
                  description: 'Type of selector for source element',
                  default: 'css',
                },
                targetBy: {
                  type: 'string',
                  enum: ['css', 'xpath', 'id', 'name', 'className', 'tagName'],
                  description: 'Type of selector for target element',
                  default: 'css',
                },
                timeout: {
                  type: 'number',
                  description: 'Timeout in milliseconds',
                  default: 10000,
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
              },
              required: ['selector'],
            },
          },
          {
            name: 'select_option',
            description: 'Select an option from a select dropdown',
            inputSchema: {
              type: 'object',
              properties: {
                selectSelector: {
                  type: 'string',
                  description: 'CSS selector or XPath for the select element',
                },
                optionValue: {
                  type: 'string',
                  description: 'Value of the option to select',
                },
                optionText: {
                  type: 'string',
                  description: 'Text of the option to select (alternative to optionValue)',
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
              required: ['selectSelector'],
            },
          },
          {
            name: 'check_checkbox',
            description: 'Check or uncheck a checkbox',
            inputSchema: {
              type: 'object',
              properties: {
                selector: {
                  type: 'string',
                  description: 'CSS selector or XPath to find the checkbox',
                },
                checked: {
                  type: 'boolean',
                  description: 'Whether to check (true) or uncheck (false) the checkbox',
                  default: true,
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
            name: 'select_radio_button',
            description: 'Select a radio button from a group',
            inputSchema: {
              type: 'object',
              properties: {
                selector: {
                  type: 'string',
                  description: 'CSS selector or XPath to find the radio button',
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
            name: 'upload_file',
            description: 'Upload a file to a file input element',
            inputSchema: {
              type: 'object',
              properties: {
                selector: {
                  type: 'string',
                  description: 'CSS selector or XPath for the file input element',
                },
                filePath: {
                  type: 'string',
                  description: 'Path to the file to upload',
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
              required: ['selector', 'filePath'],
            },
          },
          {
            name: 'switch_to_frame',
            description: 'Switch to an iframe or frame',
            inputSchema: {
              type: 'object',
              properties: {
                selector: {
                  type: 'string',
                  description: 'CSS selector or XPath for the frame element',
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
            name: 'switch_to_default_content',
            description: 'Switch back to the main page from a frame',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'get_element_attributes',
            description: 'Get all attributes of an element',
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
                          'click', 'double_click', 'right_click', 'hover', 'type', 'clear', 'select_option',
                          'check_checkbox', 'select_radio', 'upload_file', 'drag_and_drop', 'scroll_to',
                          'wait_for_element', 'wait_for_text', 'wait_for_url', 'execute_script',
                          'switch_to_frame', 'switch_to_default', 'navigate_to', 'go_back', 'go_forward',
                          'refresh', 'take_screenshot', 'get_text', 'get_attribute', 'is_displayed',
                          'is_enabled', 'is_selected'
                        ],
                        description: 'Type of action to perform',
                      },
                      selector: {
                        type: 'string',
                        description: 'CSS selector or XPath for the element (required for most actions)',
                      },
                      by: {
                        type: 'string',
                        enum: ['css', 'xpath', 'id', 'name', 'className', 'tagName'],
                        description: 'Type of selector',
                        default: 'css',
                      },
                      value: {
                        type: 'string',
                        description: 'Value for actions like type, select_option, etc.',
                      },
                      text: {
                        type: 'string',
                        description: 'Text for actions like wait_for_text, select_option by text',
                      },
                      checked: {
                        type: 'boolean',
                        description: 'Boolean value for checkbox actions',
                      },
                      filePath: {
                        type: 'string',
                        description: 'File path for upload_file action',
                      },
                      targetSelector: {
                        type: 'string',
                        description: 'Target selector for drag_and_drop action',
                      },
                      targetBy: {
                        type: 'string',
                        enum: ['css', 'xpath', 'id', 'name', 'className', 'tagName'],
                        description: 'Target selector type for drag_and_drop',
                        default: 'css',
                      },
                      script: {
                        type: 'string',
                        description: 'JavaScript code for execute_script action',
                      },
                      args: {
                        type: 'array',
                        description: 'Arguments for execute_script action',
                        items: {
                          type: 'string',
                        },
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
        ];

      // Add plugin tools
      const pluginTools = this.plugins.flatMap(plugin => 
        plugin.tools.map(tool => ({
          ...tool,
          name: `${plugin.name}_${tool.name}`,
          description: `[${plugin.name}] ${tool.description}`,
        }))
      );

      return {
        tools: [...coreTools, ...pluginTools],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'open_browser':
            return await this.browserManager.openBrowser(args);
          
          case 'navigate_to':
            return await this.browserManager.navigateTo(args.url);
          
          case 'find_element':
            return await this.browserManager.findElement(
              args.selector,
              args.by || 'css',
              args.timeout || 10000
            );
          
          case 'click_element':
            return await this.browserManager.clickElement(
              args.selector,
              args.by || 'css',
              args.timeout || 10000
            );
          
          case 'type_text':
            return await this.browserManager.typeText(
              args.selector,
              args.text,
              args.by || 'css',
              args.timeout || 10000
            );
          
          case 'get_page_title':
            return await this.browserManager.getPageTitle();
          
          case 'get_page_url':
            return await this.browserManager.getPageUrl();
          
          case 'get_console_logs':
            return await this.browserManager.getConsoleLogs(args.level || 'all');
          
          case 'take_screenshot':
            return await this.browserManager.takeScreenshot(args.filename, args.fullPage);
          
          case 'wait_for_element':
            return await this.browserManager.waitForElement(
              args.selector,
              args.by || 'css',
              args.timeout || 10000
            );
          
          case 'execute_script':
            return await this.browserManager.executeScript(args.script, args.args || []);
          
          case 'get_page_elements':
            return await this.browserManager.getPageElements(
              args.includeText !== false,
              args.includeAttributes !== false
            );
          
          case 'get_form_elements':
            return await this.browserManager.getFormElements(args.formSelector);
          
          case 'fill_form':
            return await this.browserManager.fillForm(args.formData, args.formSelector);
          
          case 'get_page_info':
            return await this.browserManager.getPageInfo();
          
          case 'get_loaded_scripts':
            return await this.browserManager.getLoadedScripts();
          
          case 'get_dom_structure':
            return await this.browserManager.getDomStructure(
              args.maxDepth || 3,
              args.includeText || false
            );
          
          case 'wait_for_page_load':
            return await this.browserManager.waitForPageLoad(args.timeout || 30000);
          
          case 'scroll_to_element':
            return await this.browserManager.scrollToElement(
              args.selector,
              args.by || 'css',
              args.timeout || 10000
            );
          
          case 'drag_and_drop':
            return await this.browserManager.dragAndDrop(
              args.sourceSelector,
              args.targetSelector,
              args.sourceBy || 'css',
              args.targetBy || 'css',
              args.timeout || 10000
            );
          
          case 'hover_element':
            return await this.browserManager.hoverElement(
              args.selector,
              args.by || 'css',
              args.timeout || 10000
            );
          
          case 'double_click_element':
            return await this.browserManager.doubleClickElement(
              args.selector,
              args.by || 'css',
              args.timeout || 10000
            );
          
          case 'right_click_element':
            return await this.browserManager.rightClickElement(
              args.selector,
              args.by || 'css',
              args.timeout || 10000
            );
          
          case 'select_option':
            return await this.browserManager.selectOption(
              args.selectSelector,
              args.optionValue,
              args.optionText,
              args.by || 'css',
              args.timeout || 10000
            );
          
          case 'check_checkbox':
            return await this.browserManager.checkCheckbox(
              args.selector,
              args.checked !== false,
              args.by || 'css',
              args.timeout || 10000
            );
          
          case 'select_radio_button':
            return await this.browserManager.selectRadioButton(
              args.selector,
              args.by || 'css',
              args.timeout || 10000
            );
          
          case 'upload_file':
            return await this.browserManager.uploadFile(
              args.selector,
              args.filePath,
              args.by || 'css',
              args.timeout || 10000
            );
          
          case 'switch_to_frame':
            return await this.browserManager.switchToFrame(
              args.selector,
              args.by || 'css',
              args.timeout || 10000
            );
          
          case 'switch_to_default_content':
            return await this.browserManager.switchToDefaultContent();
          
          case 'get_element_attributes':
            return await this.browserManager.getElementAttributes(
              args.selector,
              args.by || 'css',
              args.timeout || 10000
            );
          
          case 'execute_action_sequence':
            return await this.browserManager.executeActionSequence(
              args.actions,
              args.continueOnError || false,
              args.stopOnError !== false
            );
          
          case 'close_browser':
            return await this.browserManager.closeBrowser();
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
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

const server = new SeleniumMCPServer();
server.run().catch(console.error);
