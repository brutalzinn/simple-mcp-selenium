import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { ServiceBuilder } from 'selenium-webdriver/chrome.js';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

interface BrowserSession {
  sessionId: string;
  browserId: string;
  driver: any;
  createdAt: Date;
  lastUsed: Date;
  isActive: boolean;
}

class ChromeDriverManager {
  private logger: Logger;
  private chromedriverPath: string | null = null;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async getChromeVersion(): Promise<string> {
    try {
      const output = execSync('google-chrome --version', { encoding: 'utf8' });
      const match = output.match(/(\d+\.\d+\.\d+\.\d+)/);
      if (match) {
        return match[1];
      }
      throw new Error('Could not parse Chrome version');
    } catch (error) {
      this.logger.error('Failed to get Chrome version', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async getCompatibleChromeDriverPath(): Promise<string> {
    if (this.chromedriverPath) {
      return this.chromedriverPath;
    }

    try {
      const chromeVersion = await this.getChromeVersion();
      const majorVersion = chromeVersion.split('.')[0];

      this.logger.info('Detected Chrome version', { chromeVersion, majorVersion });

      // Check for downloaded ChromeDriver first
      const downloadedChromeDriver = path.join(process.cwd(), 'chromedriver', 'chromedriver-linux64', 'chromedriver');
      if (fs.existsSync(downloadedChromeDriver)) {
        try {
          const downloadedVersion = execSync(`"${downloadedChromeDriver}" --version`, { encoding: 'utf8' });
          const downloadedMajorVersion = downloadedVersion.match(/ChromeDriver (\d+)/)?.[1];

          if (downloadedMajorVersion && Math.abs(parseInt(downloadedMajorVersion) - parseInt(majorVersion)) <= 1) {
            this.logger.info('Using downloaded ChromeDriver', { downloadedVersion: downloadedVersion.trim() });
            this.chromedriverPath = downloadedChromeDriver;
            return this.chromedriverPath;
          } else {
            this.logger.warn('Downloaded ChromeDriver version mismatch', {
              chromeMajor: majorVersion,
              driverMajor: downloadedMajorVersion || 'unknown',
              difference: downloadedMajorVersion ? Math.abs(parseInt(downloadedMajorVersion) - parseInt(majorVersion)) : 'unknown'
            });
          }
        } catch (error) {
          this.logger.warn('Downloaded ChromeDriver not working', { error: error instanceof Error ? error.message : String(error) });
        }
      }

      // Try to use system chromedriver
      try {
        const systemChromeDriver = execSync('which chromedriver', { encoding: 'utf8' }).trim();
        const systemVersion = execSync('chromedriver --version', { encoding: 'utf8' });
        const systemMajorVersion = systemVersion.match(/ChromeDriver (\d+)/)?.[1];

        if (systemMajorVersion && Math.abs(parseInt(systemMajorVersion) - parseInt(majorVersion)) <= 1) {
          this.logger.info('Using system ChromeDriver', { systemVersion: systemVersion.trim() });
          this.chromedriverPath = systemChromeDriver;
          return this.chromedriverPath;
        } else {
          this.logger.warn('System ChromeDriver version mismatch', {
            chromeMajor: majorVersion,
            driverMajor: systemMajorVersion || 'unknown',
            difference: systemMajorVersion ? Math.abs(parseInt(systemMajorVersion) - parseInt(majorVersion)) : 'unknown'
          });
        }
      } catch (error) {
        this.logger.warn('System ChromeDriver not compatible', { error: error instanceof Error ? error.message : String(error) });
      }

      // Use selenium-webdriver's built-in ChromeDriver as last resort
      this.logger.info('Using selenium-webdriver built-in ChromeDriver');
      this.chromedriverPath = 'selenium-webdriver';
      return this.chromedriverPath;

    } catch (error) {
      this.logger.error('Failed to setup ChromeDriver', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }
}

class Logger {
  private logDir: string;
  private logFile: string;

  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    this.logFile = path.join(this.logDir, `mcp-server-${new Date().toISOString().split('T')[0]}.log`);

    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` | Data: ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level}] ${message}${dataStr}`;
  }

  private writeToFile(message: string) {
    try {
      fs.appendFileSync(this.logFile, message + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  info(message: string, data?: any) {
    const formatted = this.formatMessage('INFO', message, data);
    console.log(formatted);
    this.writeToFile(formatted);
  }

  error(message: string, data?: any) {
    const formatted = this.formatMessage('ERROR', message, data);
    console.error(formatted);
    this.writeToFile(formatted);
  }

  warn(message: string, data?: any) {
    const formatted = this.formatMessage('WARN', message, data);
    console.warn(formatted);
    this.writeToFile(formatted);
  }

  debug(message: string, data?: any) {
    const formatted = this.formatMessage('DEBUG', message, data);
    console.log(formatted);
    this.writeToFile(formatted);
  }
}

interface RecordingStep {
  id: string;
  timestamp: number;
  action: string;
  selector?: string;
  by?: string;
  text?: string;
  url?: string;
  screenshot?: string;
  consoleLogs?: any[];
  metadata?: any;
}

interface Recording {
  name: string;
  createdAt: string;
  steps: RecordingStep[];
  metadata: {
    totalSteps: number;
    duration: number;
    includeScreenshots: boolean;
    includeConsole: boolean;
  };
}

class SimpleMCPServer {
  private server: Server;
  private sessions: Map<string, BrowserSession> = new Map();
  private logger: Logger;
  private chromeDriverManager: ChromeDriverManager;
  private recordings: Map<string, Recording> = new Map();
  private activeRecordings: Map<string, { recording: Recording; startTime: number }> = new Map();

  constructor() {
    this.logger = new Logger();
    this.chromeDriverManager = new ChromeDriverManager(this.logger);
    this.server = new Server(
      {
        name: 'simple-browser-mcp-server',
        version: '1.0.0',
        description: 'Simple MCP Server for browser automation using direct Chrome with auto ChromeDriver compatibility',
      },
    );

    this.setupToolHandlers();
    this.loadExistingRecordings();
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
                browserId: {
                  type: 'string',
                  description: 'Unique identifier for the browser session',
                },
                headless: {
                  type: 'boolean',
                  description: 'Whether to run in headless mode (default: true)',
                  default: true,
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
            description: 'Navigate to a URL in a specific browser session',
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
            description: 'Click an element in a specific browser session',
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
            description: 'Type text into an element in a specific browser session',
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
            description: 'Take a screenshot of a specific browser session',
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
            description: 'Execute JavaScript in a specific browser session',
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
            description: 'Close a specific browser session',
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
            description: 'Get comprehensive debugging information about the current page (console logs, network, errors)',
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
            name: 'list_recordings',
            description: 'List all available recordings',
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
            result = await this.openBrowser(args);
            break;

          case 'navigate_to':
            result = await this.navigateTo(args);
            break;

          case 'click_element':
            result = await this.clickElement(args);
            break;

          case 'type_text':
            result = await this.typeText(args);
            break;

          case 'take_screenshot':
            result = await this.takeScreenshot(args);
            break;

          case 'execute_script':
            result = await this.executeScript(args);
            break;

          case 'close_browser':
            result = await this.closeBrowser(args);
            break;

          case 'debug_page':
            result = await this.debugPageState(args);
            break;

          case 'start_recording':
            result = await this.startRecording(args);
            break;

          case 'stop_recording':
            result = await this.stopRecording(args);
            break;

          case 'play_recording':
            result = await this.playRecording(args);
            break;

          case 'list_recordings':
            result = await this.listRecordings();
            break;

          default:
            result = {
              success: false,
              message: `Unknown tool: ${name}`,
            };
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
    type: 'string',
      description: 'CSS selector for the element to click',
                },
  by: {
    type: 'string',
    description: 'Selector type (css, xpath, id, name, className, tagName)',
    default: 'css',
  },
  timeout: {
    type: 'number',
    description: 'Timeout in milliseconds',
    default: 10000,
  },
},
required: ['sessionId', 'selector'],
            },
          },
{
  name: 'type_text',
    description: 'Type text into an element in a specific browser session',
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
      by: {
        type: 'string',
          description: 'Selector type (css, xpath, id, name, className, tagName)',
                  default: 'css',
                },
      timeout: {
        type: 'number',
          description: 'Timeout in milliseconds',
                  default: 10000,
                },
    },
    required: ['sessionId', 'selector', 'text'],
            },
},
{
  name: 'take_screenshot',
    description: 'Take a screenshot of a specific browser session',
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
    description: 'Execute JavaScript in a specific browser session',
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
      args: {
        type: 'array',
          description: 'Arguments to pass to the script',
            items: { type: 'string' },
      },
    },
    required: ['sessionId', 'script'],
            },
},
{
  name: 'get_page_info',
    description: 'Get page information from a specific browser session',
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
  name: 'close_browser',
    description: 'Close a specific browser session',
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
  name: 'list_sessions',
    description: 'List all active browser sessions',
      inputSchema: {
    type: 'object',
      properties: { },
  },
},
{
  name: 'close_all_browsers',
    description: 'Close all active browser sessions',
      inputSchema: {
    type: 'object',
      properties: { },
  },
},
{
  name: 'quick_test',
    description: 'Quick test tool: open browser, navigate to URL, and take screenshot in one operation',
      inputSchema: {
    type: 'object',
      properties: {
      url: {
        type: 'string',
          description: 'URL to navigate to',
                },
      badge: {
        type: 'string',
          description: 'Optional debug badge text',
                },
      headless: {
        type: 'boolean',
          description: 'Whether to run in headless mode',
                  default: true,
                },
      wait: {
        type: 'number',
          description: 'Wait time in milliseconds before taking screenshot',
                  default: 2000,
                },
    },
    required: ['url'],
            },
},
{
  name: 'smart_click_and_type',
    description: 'Smart tool: find element by text/selector, click it, and type text in one operation',
      inputSchema: {
    type: 'object',
      properties: {
      sessionId: {
        type: 'string',
          description: 'Session ID of the browser to control',
                },
      action: {
        type: 'string',
          description: 'Action to perform: "click", "type", or "click_and_type"',
                  enum: ['click', 'type', 'click_and_type'],
                },
      target: {
        type: 'string',
          description: 'Element to target (text content, CSS selector, or XPath)',
                },
      text: {
        type: 'string',
          description: 'Text to type (required for "type" and "click_and_type" actions)',
                },
      by: {
        type: 'string',
          description: 'How to find the element: "text", "css", "xpath", "id", "name", "className"',
                  default: 'text',
                },
      timeout: {
        type: 'number',
          description: 'Timeout in milliseconds',
                  default: 10000,
                },
    },
    required: ['sessionId', 'action', 'target'],
            },
},
{
  name: 'get_page_debug_info',
    description: 'Get comprehensive page debug information including elements, console logs, and performance',
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
      includePerformance: {
        type: 'boolean',
          description: 'Include performance metrics',
                  default: true,
                },
      elementLimit: {
        type: 'number',
          description: 'Maximum number of elements to return',
                  default: 50,
                },
    },
    required: ['sessionId'],
            },
},
{
  name: 'wait_and_verify',
    description: 'Wait for element to appear and verify page state',
      inputSchema: {
    type: 'object',
      properties: {
      sessionId: {
        type: 'string',
          description: 'Session ID of the browser to control',
                },
      waitFor: {
        type: 'string',
          description: 'Element to wait for (text content, CSS selector, or XPath)',
                },
      by: {
        type: 'string',
          description: 'How to find the element: "text", "css", "xpath", "id", "name", "className"',
                  default: 'text',
                },
      timeout: {
        type: 'number',
          description: 'Timeout in milliseconds',
                  default: 10000,
                },
      verifyText: {
        type: 'string',
          description: 'Text that should be present on the page',
                },
      verifyUrl: {
        type: 'string',
          description: 'URL pattern that should match',
                },
      takeScreenshot: {
        type: 'boolean',
          description: 'Take screenshot after verification',
                  default: false,
                },
    },
    required: ['sessionId', 'waitFor'],
            },
},
{
  name: 'set_badge',
    description: 'Set or update debug badge on an existing browser session',
      inputSchema: {
    type: 'object',
      properties: {
      sessionId: {
        type: 'string',
          description: 'Session ID of the browser to control',
                },
      badge: {
        type: 'string',
          description: 'Debug badge text to display (empty string to remove badge)',
                },
    },
    required: ['sessionId', 'badge'],
            },
},
{
  name: 'check_chrome_compatibility',
    description: 'Check Chrome and ChromeDriver version compatibility',
      inputSchema: {
    type: 'object',
      properties: { },
  },
},
{
  name: 'get_console_logs',
    description: 'Get browser console logs in an easy-to-read format for Cursor',
      inputSchema: {
    type: 'object',
      properties: {
      sessionId: {
        type: 'string',
          description: 'Session ID of the browser to control',
                },
      limit: {
        type: 'number',
          description: 'Maximum number of console logs to return (default: 50)',
                  default: 50,
                },
      level: {
        type: 'string',
          description: 'Filter by log level (log, error, warn, info, debug, all)',
                  enum: ['log', 'error', 'warn', 'info', 'debug', 'all'],
                  default: 'all',
                },
    },
    required: ['sessionId'],
            },
},
{
  name: 'get_network_logs',
    description: 'Get browser network logs in an easy-to-read format for Cursor',
      inputSchema: {
    type: 'object',
      properties: {
      sessionId: {
        type: 'string',
          description: 'Session ID of the browser to control',
                },
      limit: {
        type: 'number',
          description: 'Maximum number of network logs to return (default: 50)',
                  default: 50,
                },
      method: {
        type: 'string',
          description: 'Filter by HTTP method (GET, POST, PUT, DELETE, etc.)',
                },
      status: {
        type: 'string',
          description: 'Filter by response status (200, 404, 500, etc.)',
                },
    },
    required: ['sessionId'],
            },
},
{
  name: 'clear_console_logs',
    description: 'Clear browser console logs',
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
  name: 'monitor_console',
    description: 'Start monitoring console logs and return them in real-time format',
      inputSchema: {
    type: 'object',
      properties: {
      sessionId: {
        type: 'string',
          description: 'Session ID of the browser to control',
                },
      duration: {
        type: 'number',
          description: 'Duration to monitor in seconds (default: 10)',
                  default: 10,
                },
      level: {
        type: 'string',
          description: 'Filter by log level (log, error, warn, info, debug, all)',
                  enum: ['log', 'error', 'warn', 'info', 'debug', 'all'],
                  default: 'all',
                },
    },
    required: ['sessionId'],
            },
},
{
  name: 'debug_page_state',
    description: 'Get comprehensive debugging information about the current page state',
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
      includeNetwork: {
        type: 'boolean',
          description: 'Include network activity',
                  default: true,
                },
      includeErrors: {
        type: 'boolean',
          description: 'Include JavaScript errors',
                  default: true,
                },
      includePerformance: {
        type: 'boolean',
          description: 'Include performance metrics',
                  default: false,
                },
    },
    required: ['sessionId'],
            },
},
{
  name: 'test_element_interaction',
    description: 'Test if an element can be interacted with (click, type, etc.)',
      inputSchema: {
    type: 'object',
      properties: {
      sessionId: {
        type: 'string',
          description: 'Session ID of the browser to control',
                },
      selector: {
        type: 'string',
          description: 'CSS selector for the element to test',
                },
      by: {
        type: 'string',
          description: 'Selector type (css, xpath, id, name, className, tagName)',
                  default: 'css',
                },
      testType: {
        type: 'string',
          description: 'Type of interaction to test',
                  enum: ['click', 'type', 'hover', 'visibility', 'enabled'],
                  default: 'visibility',
                },
    },
    required: ['sessionId', 'selector'],
            },
},
{
  name: 'wait_for_condition',
    description: 'Wait for a specific condition to be met (useful for testing)',
      inputSchema: {
    type: 'object',
      properties: {
      sessionId: {
        type: 'string',
          description: 'Session ID of the browser to control',
                },
      condition: {
        type: 'string',
          description: 'JavaScript condition to wait for (e.g., "document.readyState === \'complete\'")',
                },
      timeout: {
        type: 'number',
          description: 'Timeout in milliseconds (default: 10000)',
                  default: 10000,
                },
      description: {
        type: 'string',
          description: 'Description of what we\'re waiting for (for debugging)',
                },
    },
    required: ['sessionId', 'condition'],
            },
},
{
  name: 'capture_page_errors',
    description: 'Capture and format all JavaScript errors on the page',
      inputSchema: {
    type: 'object',
      properties: {
      sessionId: {
        type: 'string',
          description: 'Session ID of the browser to control',
                },
      includeStack: {
        type: 'boolean',
          description: 'Include stack traces',
                  default: true,
                },
    },
    required: ['sessionId'],
            },
},
{
  name: 'test_page_functionality',
    description: 'Run a comprehensive test of basic page functionality',
      inputSchema: {
    type: 'object',
      properties: {
      sessionId: {
        type: 'string',
          description: 'Session ID of the browser to control',
                },
      testForms: {
        type: 'boolean',
          description: 'Test form elements',
                  default: true,
                },
      testLinks: {
        type: 'boolean',
          description: 'Test links and navigation',
                  default: true,
                },
      testImages: {
        type: 'boolean',
          description: 'Test image loading',
                  default: true,
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
          description: 'Name for this recording session',
                },
      includeScreenshots: {
        type: 'boolean',
          description: 'Include screenshots at each step',
                  default: true,
                },
      includeConsole: {
        type: 'boolean',
          description: 'Include console logs in recording',
                  default: true,
                },
    },
    required: ['sessionId', 'recordingName'],
            },
},
{
  name: 'stop_recording',
    description: 'Stop recording and save the interaction sequence',
      inputSchema: {
    type: 'object',
      properties: {
      sessionId: {
        type: 'string',
          description: 'Session ID of the browser to control',
                },
      saveToFile: {
        type: 'boolean',
          description: 'Save recording to file for later use',
                  default: true,
                },
    },
    required: ['sessionId'],
            },
},
{
  name: 'play_recording',
    description: 'Play back a recorded interaction sequence',
      inputSchema: {
    type: 'object',
      properties: {
      sessionId: {
        type: 'string',
          description: 'Session ID of the browser to control',
                },
      recordingName: {
        type: 'string',
          description: 'Name of the recording to play back',
                },
      speed: {
        type: 'number',
          description: 'Playback speed multiplier (1.0 = normal, 0.5 = half speed, 2.0 = double speed)',
                  default: 1.0,
                },
      pauseBetweenSteps: {
        type: 'number',
          description: 'Pause between steps in milliseconds (0 = no pause)',
                  default: 500,
                },
    },
    required: ['sessionId', 'recordingName'],
            },
},
{
  name: 'list_recordings',
    description: 'List all available recordings',
      inputSchema: {
    type: 'object',
      properties: { },
  },
},
{
  name: 'save_recording',
    description: 'Save a recording to a file for sharing or backup',
      inputSchema: {
    type: 'object',
      properties: {
      recordingName: {
        type: 'string',
          description: 'Name of the recording to save',
                },
      filename: {
        type: 'string',
          description: 'Filename to save as (optional, defaults to recording name)',
                },
    },
    required: ['recordingName'],
            },
},
{
  name: 'load_recording',
    description: 'Load a recording from a file',
      inputSchema: {
    type: 'object',
      properties: {
      filename: {
        type: 'string',
          description: 'Filename to load',
                },
      recordingName: {
        type: 'string',
          description: 'Name to give the loaded recording (optional)',
                },
    },
    required: ['filename'],
            },
},
{
  name: 'create_test_script',
    description: 'Create a test script from a recording for automated testing',
      inputSchema: {
    type: 'object',
      properties: {
      recordingName: {
        type: 'string',
          description: 'Name of the recording to convert',
                },
      scriptType: {
        type: 'string',
          description: 'Type of test script to generate',
                  enum: ['javascript', 'python', 'json'],
                  default: 'javascript',
                },
      includeAssertions: {
        type: 'boolean',
          description: 'Include assertions for validation',
                  default: true,
                },
    },
    required: ['recordingName'],
            },
},
{
  name: 'auto_login',
    description: 'Automatically perform login using a recorded login flow',
      inputSchema: {
    type: 'object',
      properties: {
      sessionId: {
        type: 'string',
          description: 'Session ID of the browser to control',
                },
      recordingName: {
        type: 'string',
          description: 'Name of the recorded login flow to use',
                },
      username: {
        type: 'string',
          description: 'Username to login with',
                },
      password: {
        type: 'string',
          description: 'Password to login with',
                },
      waitForSuccess: {
        type: 'boolean',
          description: 'Wait for login success indicators',
                  default: true,
                },
    },
    required: ['sessionId', 'recordingName', 'username', 'password'],
            },
},
{
  name: 'auto_register',
    description: 'Automatically perform user registration using a recorded flow',
      inputSchema: {
    type: 'object',
      properties: {
      sessionId: {
        type: 'string',
          description: 'Session ID of the browser to control',
                },
      recordingName: {
        type: 'string',
          description: 'Name of the recorded registration flow to use',
                },
      userData: {
        type: 'object',
          description: 'User data for registration',
            properties: {
          email: { type: 'string' },
          password: { type: 'string' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          company: { type: 'string' },
        },
        required: ['email', 'password'],
                },
    },
    required: ['sessionId', 'recordingName', 'userData'],
            },
},
{
  name: 'record_common_task',
    description: 'Record a common task (login, registration, etc.) for later use',
      inputSchema: {
    type: 'object',
      properties: {
      sessionId: {
        type: 'string',
          description: 'Session ID of the browser to control',
                },
      taskType: {
        type: 'string',
          description: 'Type of task being recorded',
                  enum: ['login', 'registration', 'checkout', 'profile_update', 'custom'],
                  default: 'custom',
                },
      taskName: {
        type: 'string',
          description: 'Name for this specific task recording',
                },
      instructions: {
        type: 'string',
          description: 'Instructions for what to do during recording',
                },
    },
    required: ['sessionId', 'taskType', 'taskName'],
            },
},
{
  name: 'execute_common_task',
    description: 'Execute a previously recorded common task',
      inputSchema: {
    type: 'object',
      properties: {
      sessionId: {
        type: 'string',
          description: 'Session ID of the browser to control',
                },
      taskName: {
        type: 'string',
          description: 'Name of the task to execute',
                },
      parameters: {
        type: 'object',
          description: 'Parameters to substitute in the task (e.g., username, password)',
                },
      verifySuccess: {
        type: 'boolean',
          description: 'Verify that the task completed successfully',
                  default: true,
                },
    },
    required: ['sessionId', 'taskName'],
            },
},
{
  name: 'list_common_tasks',
    description: 'List all available common task recordings',
      inputSchema: {
    type: 'object',
      properties: {
      taskType: {
        type: 'string',
          description: 'Filter by task type (login, registration, etc.)',
                  enum: ['login', 'registration', 'checkout', 'profile_update', 'custom', 'all'],
                  default: 'all',
                },
    },
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
        result = await this.openBrowser(args);
        break;

      case 'navigate_to':
        result = await this.navigateTo(args);
        break;

      case 'click_element':
        result = await this.clickElement(args);
        break;

      case 'type_text':
        result = await this.typeText(args);
        break;

      case 'take_screenshot':
        result = await this.takeScreenshot(args);
        break;

      case 'execute_script':
        result = await this.executeScript(args);
        break;

      case 'get_page_info':
        result = await this.getPageInfo(args);
        break;

      case 'close_browser':
        result = await this.closeBrowser(args);
        break;

      case 'list_sessions':
        result = await this.listSessions();
        break;

      case 'close_all_browsers':
        result = await this.closeAllBrowsers();
        break;

      case 'quick_test':
        result = await this.quickTest(args);
        break;

      case 'smart_click_and_type':
        result = await this.smartClickAndType(args);
        break;

      case 'get_page_debug_info':
        result = await this.getPageDebugInfo(args);
        break;

      case 'wait_and_verify':
        result = await this.waitAndVerify(args);
        break;

      case 'set_badge':
        result = await this.setBadge(args);
        break;

      case 'check_chrome_compatibility':
        result = await this.checkChromeCompatibility();
        break;

      case 'get_console_logs':
        result = await this.getConsoleLogs(args);
        break;

      case 'get_network_logs':
        result = await this.getNetworkLogs(args);
        break;

      case 'clear_console_logs':
        result = await this.clearConsoleLogs(args);
        break;

      case 'monitor_console':
        result = await this.monitorConsole(args);
        break;

      case 'debug_page_state':
        result = await this.debugPageState(args);
        break;

      case 'test_element_interaction':
        result = await this.testElementInteraction(args);
        break;

      case 'wait_for_condition':
        result = await this.waitForCondition(args);
        break;

      case 'capture_page_errors':
        result = await this.capturePageErrors(args);
        break;

      case 'test_page_functionality':
        result = await this.testPageFunctionality(args);
        break;

      case 'start_recording':
        result = await this.startRecording(args);
        break;

      case 'stop_recording':
        result = await this.stopRecording(args);
        break;

      case 'play_recording':
        result = await this.playRecording(args);
        break;

      case 'list_recordings':
        result = await this.listRecordings();
        break;

      case 'save_recording':
        result = await this.saveRecording(args);
        break;

      case 'load_recording':
        result = await this.loadRecording(args);
        break;

      case 'create_test_script':
        result = await this.createTestScript(args);
        break;

      case 'auto_login':
        result = await this.autoLogin(args);
        break;

      case 'auto_register':
        result = await this.autoRegister(args);
        break;

      case 'record_common_task':
        result = await this.recordCommonTask(args);
        break;

      case 'execute_common_task':
        result = await this.executeCommonTask(args);
        break;

      case 'list_common_tasks':
        result = await this.listCommonTasks(args);
        break;

      default:
        result = {
          success: false,
          message: `Unknown tool: ${name}`,
        };
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
      isError: true,
    };
  }
});
  }

  private async openBrowser(args: any) {
  try {
    const { browserId, headless = true, width = 1920, height = 1080, badge, url } = args;

    if (this.sessions.has(browserId)) {
      return {
        success: false,
        message: `Browser session '${browserId}' already exists`,
      };
    }

    this.logger.info('Creating new browser session', { browserId, headless, width, height, badge, url });

    const chromeOptions = new chrome.Options();

    if (headless) {
      // Headless mode configuration
      chromeOptions.addArguments('--headless=new');
      chromeOptions.addArguments('--no-sandbox');
      chromeOptions.addArguments('--disable-dev-shm-usage');
      chromeOptions.addArguments('--disable-gpu');
      chromeOptions.addArguments('--disable-web-security');
      chromeOptions.addArguments('--remote-debugging-port=0');
      chromeOptions.addArguments(`--window-size=${width},${height}`);
      chromeOptions.addArguments('--disable-extensions');
      chromeOptions.addArguments('--disable-plugins');
      chromeOptions.addArguments('--disable-images');
      chromeOptions.addArguments('--disable-javascript');
      chromeOptions.addArguments('--disable-default-apps');
      chromeOptions.addArguments('--disable-sync');
      chromeOptions.addArguments('--disable-translate');
      chromeOptions.addArguments('--hide-scrollbars');
      chromeOptions.addArguments('--mute-audio');
      chromeOptions.addArguments('--no-first-run');
      chromeOptions.addArguments('--disable-background-timer-throttling');
      chromeOptions.addArguments('--disable-backgrounding-occluded-windows');
      chromeOptions.addArguments('--disable-renderer-backgrounding');
      chromeOptions.addArguments('--enable-automation');
      chromeOptions.addArguments('--password-store=basic');
      chromeOptions.addArguments('--use-mock-keychain');
    } else {
      // Visible mode configuration
      chromeOptions.addArguments('--no-sandbox');
      chromeOptions.addArguments('--disable-dev-shm-usage');
      chromeOptions.addArguments('--disable-gpu');
      chromeOptions.addArguments('--disable-web-security');
      chromeOptions.addArguments('--remote-debugging-port=0');
      chromeOptions.addArguments(`--window-size=${width},${height}`);
    }

    // Get compatible ChromeDriver path
    const chromeDriverPath = await this.chromeDriverManager.getCompatibleChromeDriverPath();

    let driver;
    if (chromeDriverPath === 'selenium-webdriver') {
      // Use selenium-webdriver's built-in ChromeDriver
      driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(chromeOptions)
        .build();
    } else {
      // Use system ChromeDriver
      const service = new ServiceBuilder(chromeDriverPath);
      driver = await new Builder()
        .forBrowser('chrome')
        .setChromeService(service)
        .setChromeOptions(chromeOptions)
        .build();
    }

    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const session: BrowserSession = {
      sessionId,
      browserId,
      driver,
      createdAt: new Date(),
      lastUsed: new Date(),
      isActive: true,
    };

    this.sessions.set(browserId, session);

    // Navigate to URL if specified first
    if (url) {
      try {
        await session.driver.get(url);
        this.logger.info('Navigated to URL after browser creation', { browserId, url });
      } catch (error) {
        this.logger.warn('Failed to navigate to URL', { browserId, url, error: error instanceof Error ? error.message : String(error) });
      }
    }

    // Add debug badge if specified (after navigation to ensure localStorage is available)
    if (badge && badge.trim()) {
      try {
        // Wait for page to fully load before injecting badge
        await new Promise(resolve => setTimeout(resolve, 2000));

        // First, try to inject badge directly
        await this.injectBadge(session.driver);

        // Then set up persistence
        await this.addDebugBadge(session.driver, badge.trim());

        this.logger.info('Badge injection completed', { browserId, badge: badge.trim() });
      } catch (error) {
        this.logger.warn('Failed to add debug badge', { browserId, error: error instanceof Error ? error.message : String(error) });
        // Try again after a longer delay
        try {
          await new Promise(resolve => setTimeout(resolve, 3000));
          await this.injectBadge(session.driver);
          this.logger.info('Badge injection retry successful', { browserId });
        } catch (retryError) {
          this.logger.error('Failed to add debug badge on retry', { browserId, error: retryError instanceof Error ? retryError.message : String(retryError) });
        }
      }
    }

    this.logger.info(`Browser session created successfully: ${browserId}`, { sessionId });

    return {
      success: true,
      sessionId,
      browserId,
      message: `Browser opened successfully (Session: ${sessionId}, Browser: ${browserId})${badge ? ` with badge: ${badge}` : ''}${url ? ` and navigated to: ${url}` : ''}`,
    };
  } catch (error) {
    this.logger.error('Failed to open browser', { browserId: args.browserId, error: error instanceof Error ? error.message : String(error) });
    return {
      success: false,
      message: `Failed to open browser: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

  private async getSession(sessionId: string): Promise < BrowserSession | null > {
  for(const session of this.sessions.values()) {
  if (session.sessionId === sessionId && session.isActive) {
    session.lastUsed = new Date();
    return session;
  }
}
return null;
  }

  private async addDebugBadge(driver: any, badgeText: string) {
  // Store badge text in browser's localStorage so it persists across navigations
  await driver.executeScript(`
      localStorage.setItem('mcp-debug-badge', '${badgeText}');
    `);

  // Inject badge immediately
  await this.injectBadge(driver);
}

  private async injectBadge(driver: any) {
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

  private async navigateTo(args: any) {
  const { sessionId, url } = args;
  const session = await this.getSession(sessionId);

  if (!session) {
    return {
      success: false,
      message: `Session '${sessionId}' not found`,
    };
  }

  try {
    await session.driver.get(url);
    const title = await session.driver.getTitle();

    // Record navigation if recording is active
    await this.recordInteraction(sessionId, {
      action: 'navigate',
      url: url,
      timestamp: Date.now()
    });

    this.logger.info('Navigation successful', { sessionId, url, title });

    // Re-inject badge after navigation to ensure it persists across domain changes
    try {
      await this.injectBadge(session.driver);
      this.logger.info('Badge re-injected after navigation', { sessionId, url });
    } catch (badgeError) {
      this.logger.warn('Failed to re-inject badge after navigation', { sessionId, url, error: badgeError instanceof Error ? badgeError.message : String(badgeError) });
    }

    return {
      success: true,
      message: `Navigated to: ${url}`,
      data: { url, title },
    };
  } catch (error) {
    this.logger.error('Navigation failed', { sessionId, url, error: error instanceof Error ? error.message : String(error) });
    return {
      success: false,
      message: `Navigation failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

  private async clickElement(args: any) {
  const { sessionId, selector, by = 'css', timeout = 10000 } = args;
  const session = await this.getSession(sessionId);

  if (!session) {
    return {
      success: false,
      message: `Session '${sessionId}' not found`,
    };
  }

  try {
    const { By, until } = await import('selenium-webdriver');
    let byMethod;
    switch (by) {
      case 'css': byMethod = By.css; break;
      case 'xpath': byMethod = By.xpath; break;
      case 'id': byMethod = By.id; break;
      case 'name': byMethod = By.name; break;
      case 'className': byMethod = By.className; break;
      case 'tagName': byMethod = By.tagName; break;
      default: byMethod = By.css;
    }
    const element = await session.driver.wait(until.elementLocated(byMethod(selector)), timeout);
    await element.click();

    // Record click if recording is active
    await this.recordInteraction(sessionId, {
      action: 'click',
      selector: selector,
      by: by,
      timestamp: Date.now()
    });

    this.logger.info('Element clicked successfully', { sessionId, selector });

    return {
      success: true,
      message: `Clicked element: ${selector}`,
    };
  } catch (error) {
    this.logger.error('Click failed', { sessionId, selector, error: error instanceof Error ? error.message : String(error) });
    return {
      success: false,
      message: `Click failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

  private async typeText(args: any) {
  const { sessionId, selector, text, by = 'css', timeout = 10000 } = args;
  const session = await this.getSession(sessionId);

  if (!session) {
    return {
      success: false,
      message: `Session '${sessionId}' not found`,
    };
  }

  try {
    const { By, until } = await import('selenium-webdriver');
    let byMethod;
    switch (by) {
      case 'css': byMethod = By.css; break;
      case 'xpath': byMethod = By.xpath; break;
      case 'id': byMethod = By.id; break;
      case 'name': byMethod = By.name; break;
      case 'className': byMethod = By.className; break;
      case 'tagName': byMethod = By.tagName; break;
      default: byMethod = By.css;
    }
    const element = await session.driver.wait(until.elementLocated(byMethod(selector)), timeout);
    await element.clear();
    await element.sendKeys(text);

    // Record type if recording is active
    await this.recordInteraction(sessionId, {
      action: 'type',
      selector: selector,
      by: by,
      text: text,
      timestamp: Date.now()
    });

    this.logger.info('Text typed successfully', { sessionId, selector, text });

    return {
      success: true,
      message: `Typed "${text}" into element: ${selector}`,
    };
  } catch (error) {
    this.logger.error('Type failed', { sessionId, selector, text, error: error instanceof Error ? error.message : String(error) });
    return {
      success: false,
      message: `Type failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

  private async takeScreenshot(args: any) {
  const { sessionId, filename } = args;
  const session = await this.getSession(sessionId);

  if (!session) {
    return {
      success: false,
      message: `Session '${sessionId}' not found`,
    };
  }

  try {
    const screenshot = await session.driver.takeScreenshot();
    const finalFilename = filename || `screenshot-${sessionId}.png`;
    fs.writeFileSync(finalFilename, screenshot, 'base64');

    this.logger.info('Screenshot taken successfully', { sessionId, filename: finalFilename });

    return {
      success: true,
      message: `Screenshot saved: ${finalFilename}`,
      data: { filename: finalFilename },
    };
  } catch (error) {
    this.logger.error('Screenshot failed', { sessionId, error: error instanceof Error ? error.message : String(error) });
    return {
      success: false,
      message: `Screenshot failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

  private async executeScript(args: any) {
  const { sessionId, script, args: scriptArgs = [] } = args;
  const session = await this.getSession(sessionId);

  if (!session) {
    return {
      success: false,
      message: `Session '${sessionId}' not found`,
    };
  }

  try {
    const result = await session.driver.executeScript(script, ...scriptArgs);

    this.logger.info('Script executed successfully', { sessionId });

    return {
      success: true,
      message: `Script executed successfully`,
      data: { result },
    };
  } catch (error) {
    this.logger.error('Script execution failed', { sessionId, error: error instanceof Error ? error.message : String(error) });
    return {
      success: false,
      message: `Script execution failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

  private async getPageInfo(args: any) {
  const { sessionId } = args;
  const session = await this.getSession(sessionId);

  if (!session) {
    return {
      success: false,
      message: `Session '${sessionId}' not found`,
    };
  }

  try {
    const title = await session.driver.getTitle();
    const url = await session.driver.getCurrentUrl();

    this.logger.info('Page info retrieved successfully', { sessionId, title, url });

    return {
      success: true,
      message: `Page information retrieved`,
      data: { title, url, sessionId, browserId: session.browserId },
    };
  } catch (error) {
    this.logger.error('Failed to get page info', { sessionId, error: error instanceof Error ? error.message : String(error) });
    return {
      success: false,
      message: `Failed to get page info: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

  private async closeBrowser(args: any) {
  const { sessionId } = args;
  const session = await this.getSession(sessionId);

  if (!session) {
    return {
      success: false,
      message: `Session '${sessionId}' not found`,
    };
  }

  try {
    await session.driver.quit();
    session.isActive = false;
    this.sessions.delete(session.browserId);

    this.logger.info('Browser session closed successfully', { sessionId, browserId: session.browserId });

    return {
      success: true,
      message: `Browser session '${sessionId}' closed successfully`,
    };
  } catch (error) {
    this.logger.error('Failed to close browser', { sessionId, error: error instanceof Error ? error.message : String(error) });
    return {
      success: false,
      message: `Failed to close browser: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

  private async listSessions() {
  const sessionList = Array.from(this.sessions.values()).map(session => ({
    sessionId: session.sessionId,
    browserId: session.browserId,
    createdAt: session.createdAt.toISOString(),
    lastUsed: session.lastUsed.toISOString(),
    isActive: session.isActive,
  }));

  this.logger.info('Sessions listed', { count: sessionList.length });

  return {
    success: true,
    message: `Found ${sessionList.length} active browser sessions`,
    data: { sessions: sessionList },
  };
}

  private async closeAllBrowsers() {
  const sessions = Array.from(this.sessions.values());
  let successCount = 0;
  let errorCount = 0;

  for (const session of sessions) {
    try {
      if (session.isActive) {
        await session.driver.quit();
        session.isActive = false;
        successCount++;
      }
    } catch (error) {
      errorCount++;
      this.logger.error('Error closing session', { sessionId: session.sessionId, error: error instanceof Error ? error.message : String(error) });
    }
  }

  this.sessions.clear();

  this.logger.info('All browsers closed', { successCount, errorCount });

  return {
    success: errorCount === 0,
    message: `Closed ${successCount} browser sessions${errorCount > 0 ? `, ${errorCount} errors` : ''}`,
    data: {
      closed: successCount,
      errors: errorCount
    },
  };
}

  // Smart tool implementations
  private async quickTest(args: any) {
  try {
    const { url, badge, headless = true, wait = 2000 } = args;
    const browserId = `quick-test-${Date.now()}`;

    // Open browser with badge and URL
    const openResult = await this.openBrowser({
      browserId,
      headless,
      badge,
      url
    });

    if (!openResult.success) {
      return openResult;
    }

    const sessionId = openResult.sessionId;

    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, wait));

    // Take screenshot
    const screenshotResult = await this.takeScreenshot({ sessionId });

    return {
      success: true,
      message: `Quick test completed: ${url}`,
      data: {
        browserId,
        sessionId,
        url,
        badge,
        screenshot: screenshotResult.success ? screenshotResult.data?.filename : null
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Quick test failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

  private async smartClickAndType(args: any) {
  try {
    const { sessionId, action, target, text, by = 'text', timeout = 10000 } = args;
    const session = await this.getSession(sessionId);

    if (!session) {
      return {
        success: false,
        message: `Session '${sessionId}' not found`,
      };
    }

    const { By, until } = await import('selenium-webdriver');
    let byMethod: any;

    // Smart element finding
    if (by === 'text') {
      // Find by text content
      byMethod = By.xpath(`//*[contains(text(), '${target}')]`);
    } else {
      switch (by) {
        case 'css': byMethod = By.css; break;
        case 'xpath': byMethod = By.xpath; break;
        case 'id': byMethod = By.id; break;
        case 'name': byMethod = By.name; break;
        case 'className': byMethod = By.className; break;
        default: byMethod = By.css;
      }
    }

    const element = await session.driver.wait(until.elementLocated(byMethod(target)), timeout);
    await session.driver.wait(until.elementIsVisible(element), timeout);

    let result = '';

    if (action === 'click' || action === 'click_and_type') {
      await element.click();
      result += `Clicked element: ${target}`;
    }

    if (action === 'type' || action === 'click_and_type') {
      if (!text) {
        return {
          success: false,
          message: 'Text is required for type actions',
        };
      }
      await element.clear();
      await element.sendKeys(text);
      result += `${result ? ' and ' : ''}Typed: "${text}"`;
    }

    this.logger.info('Smart click and type completed', { sessionId, action, target, text });

    return {
      success: true,
      message: result,
      data: { action, target, text: text || null }
    };
  } catch (error) {
    return {
      success: false,
      message: `Smart click and type failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

  private async getPageDebugInfo(args: any) {
  try {
    const { sessionId, includeConsole = true, includeElements = true, includePerformance = true, elementLimit = 50 } = args;
    const session = await this.getSession(sessionId);

    if (!session) {
      return {
        success: false,
        message: `Session '${sessionId}' not found`,
      };
    }

    const debugInfo: any = {
      timestamp: new Date().toISOString(),
      sessionId,
      browserId: session.browserId
    };

    // Get basic page info
    try {
      debugInfo.title = await session.driver.getTitle();
      debugInfo.url = await session.driver.getCurrentUrl();
      debugInfo.windowSize = await session.driver.manage().window().getSize();
    } catch (error) {
      debugInfo.basicInfoError = error instanceof Error ? error.message : String(error);
    }

    // Get console logs
    if (includeConsole) {
      try {
        const logs = await session.driver.manage().logs().get('browser');
        debugInfo.consoleLogs = logs.slice(-20).map((log: any) => ({
          level: log.level.name,
          message: log.message,
          timestamp: new Date(log.timestamp).toISOString()
        }));
      } catch (error) {
        debugInfo.consoleError = error instanceof Error ? error.message : String(error);
      }
    }

    // Get page elements
    if (includeElements) {
      try {
        const { By } = await import('selenium-webdriver');
        const elements = await session.driver.findElements(By.css('*'));
        const limitedElements = elements.slice(0, elementLimit);

        debugInfo.elements = await Promise.all(limitedElements.map(async (element: any, index: number) => {
          try {
            return {
              index,
              tagName: await element.getTagName(),
              text: (await element.getText()).substring(0, 100),
              isDisplayed: await element.isDisplayed(),
              isEnabled: await element.isEnabled()
            };
          } catch (error) {
            return {
              index,
              tagName: 'unknown',
              text: 'Error reading element',
              isDisplayed: false,
              isEnabled: false
            };
          }
        }));
      } catch (error) {
        debugInfo.elementsError = error instanceof Error ? error.message : String(error);
      }
    }

    // Get performance metrics
    if (includePerformance) {
      try {
        const performance = await session.driver.executeScript(`
            return {
              navigation: performance.navigation ? {
                type: performance.navigation.type,
                redirectCount: performance.navigation.redirectCount
              } : null,
              timing: performance.timing ? {
                loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
                domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart
              } : null
            };
          `);
        debugInfo.performance = performance;
      } catch (error) {
        debugInfo.performanceError = error instanceof Error ? error.message : String(error);
      }
    }

    return {
      success: true,
      message: 'Page debug information retrieved successfully',
      data: debugInfo
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to get page debug info: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

  private async waitAndVerify(args: any) {
  try {
    const { sessionId, waitFor, by = 'text', timeout = 10000, verifyText, verifyUrl, takeScreenshot = false } = args;
    const session = await this.getSession(sessionId);

    if (!session) {
      return {
        success: false,
        message: `Session '${sessionId}' not found`,
      };
    }

    const { By, until } = await import('selenium-webdriver');
    let byMethod: any;

    if (by === 'text') {
      byMethod = By.xpath(`//*[contains(text(), '${waitFor}')]`);
    } else {
      switch (by) {
        case 'css': byMethod = By.css; break;
        case 'xpath': byMethod = By.xpath; break;
        case 'id': byMethod = By.id; break;
        case 'name': byMethod = By.name; break;
        case 'className': byMethod = By.className; break;
        default: byMethod = By.css;
      }
    }

    // Wait for element
    const element = await session.driver.wait(until.elementLocated(byMethod(waitFor)), timeout);
    await session.driver.wait(until.elementIsVisible(element), timeout);

    const verification: any = {
      elementFound: true,
      elementText: await element.getText(),
      timestamp: new Date().toISOString()
    };

    // Verify text if specified
    if (verifyText) {
      const { By } = await import('selenium-webdriver');
      const pageText = await session.driver.findElement(By.tagName('body')).getText();
      verification.textFound = pageText.includes(verifyText);
      verification.textVerification = verifyText;
    }

    // Verify URL if specified
    if (verifyUrl) {
      const currentUrl = await session.driver.getCurrentUrl();
      verification.urlMatches = currentUrl.includes(verifyUrl);
      verification.urlVerification = verifyUrl;
      verification.currentUrl = currentUrl;
    }

    // Take screenshot if requested
    if (takeScreenshot) {
      const screenshotResult = await this.takeScreenshot({ sessionId });
      verification.screenshot = screenshotResult.success ? screenshotResult.data?.filename : null;
    }

    return {
      success: true,
      message: `Wait and verify completed for: ${waitFor}`,
      data: verification
    };
  } catch (error) {
    return {
      success: false,
      message: `Wait and verify failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
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

  private async checkChromeCompatibility() {
  try {
    const chromeVersion = await this.chromeDriverManager.getChromeVersion();
    const chromeDriverPath = await this.chromeDriverManager.getCompatibleChromeDriverPath();

    let chromeDriverVersion = 'Unknown';
    let compatibilityStatus = 'Unknown';

    if (chromeDriverPath !== 'selenium-webdriver') {
      try {
        const driverVersion = execSync(`"${chromeDriverPath}" --version`, { encoding: 'utf8' });
        const match = driverVersion.match(/ChromeDriver (\d+\.\d+\.\d+\.\d+)/);
        if (match) {
          chromeDriverVersion = match[1];
          const chromeMajor = parseInt(chromeVersion.split('.')[0]);
          const driverMajor = parseInt(chromeDriverVersion.split('.')[0]);
          const versionDiff = Math.abs(chromeMajor - driverMajor);

          if (versionDiff === 0) {
            compatibilityStatus = 'Perfect Match';
          } else if (versionDiff <= 1) {
            compatibilityStatus = 'Compatible';
          } else {
            compatibilityStatus = 'Incompatible';
          }
        }
      } catch (error) {
        chromeDriverVersion = 'Error reading version';
        compatibilityStatus = 'Error';
      }
    } else {
      chromeDriverVersion = 'selenium-webdriver built-in';
      compatibilityStatus = 'Using built-in driver';
    }

    this.logger.info('Chrome compatibility check completed', {
      chromeVersion,
      chromeDriverVersion,
      compatibilityStatus
    });

    return {
      success: true,
      message: 'Chrome compatibility check completed',
      data: {
        chromeVersion,
        chromeDriverVersion,
        chromeDriverPath,
        compatibilityStatus,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    this.logger.error('Chrome compatibility check failed', { error: error instanceof Error ? error.message : String(error) });
    return {
      success: false,
      message: `Chrome compatibility check failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

  private async getConsoleLogs(args: any) {
  const { sessionId, limit = 50, level = 'all' } = args;
  const session = await this.getSession(sessionId);

  if (!session) {
    return {
      success: false,
      message: `Session '${sessionId}' not found`,
    };
  }

  try {
    const logs = await session.driver.manage().logs().get('browser');

    // Filter by level if specified
    let filteredLogs = logs;
    if (level !== 'all') {
      filteredLogs = logs.filter((log: any) => log.level.name.toLowerCase() === level.toLowerCase());
    }

    // Limit results
    const limitedLogs = filteredLogs.slice(-limit);

    // Format logs for easy reading
    const formattedLogs = limitedLogs.map((log: any, index: number) => {
      const timestamp = new Date(log.timestamp).toISOString();
      const level = log.level.name.toUpperCase();
      const message = log.message.replace(/^.*?:\s*/, ''); // Remove browser prefix

      return {
        index: index + 1,
        timestamp,
        level,
        message: message.trim(),
        source: log.source || 'unknown'
      };
    });

    this.logger.info('Console logs retrieved', { sessionId, count: formattedLogs.length });

    return {
      success: true,
      message: `Retrieved ${formattedLogs.length} console logs`,
      data: {
        logs: formattedLogs,
        total: logs.length,
        filtered: filteredLogs.length,
        returned: formattedLogs.length
      },
    };
  } catch (error) {
    this.logger.error('Failed to get console logs', { sessionId, error: error instanceof Error ? error.message : String(error) });
    return {
      success: false,
      message: `Failed to get console logs: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

  private async getNetworkLogs(args: any) {
  const { sessionId, limit = 50, method, status } = args;
  const session = await this.getSession(sessionId);

  if (!session) {
    return {
      success: false,
      message: `Session '${sessionId}' not found`,
    };
  }

  try {
    const logs = await session.driver.manage().logs().get('performance');

    // Parse network logs from performance logs
    const networkLogs = logs
      .map((log: any) => {
        try {
          const message = JSON.parse(log.message);
          if (message.message?.method === 'Network.responseReceived' ||
            message.message?.method === 'Network.requestWillBeSent') {
            return {
              ...message,
              timestamp: log.timestamp,
              level: log.level.name
            };
          }
        } catch (e) {
          // Skip invalid JSON
        }
        return null;
      })
      .filter(Boolean);

    // Filter by method and status
    let filteredLogs = networkLogs;
    if (method) {
      filteredLogs = filteredLogs.filter((log: any) =>
        log.message?.params?.request?.method?.toLowerCase() === method.toLowerCase()
      );
    }
    if (status) {
      filteredLogs = filteredLogs.filter((log: any) =>
        log.message?.params?.response?.status?.toString() === status.toString()
      );
    }

    // Limit results
    const limitedLogs = filteredLogs.slice(-limit);

    // Format for easy reading
    const formattedLogs = limitedLogs.map((log: any, index: number) => {
      const timestamp = new Date(log.timestamp).toISOString();
      const method = log.message?.params?.request?.method || 'UNKNOWN';
      const url = log.message?.params?.request?.url || 'unknown';
      const status = log.message?.params?.response?.status || 'pending';
      const type = log.message?.method;

      return {
        index: index + 1,
        timestamp,
        method,
        url,
        status,
        type,
        requestId: log.message?.params?.requestId
      };
    });

    this.logger.info('Network logs retrieved', { sessionId, count: formattedLogs.length });

    return {
      success: true,
      message: `Retrieved ${formattedLogs.length} network logs`,
      data: {
        logs: formattedLogs,
        total: networkLogs.length,
        filtered: filteredLogs.length,
        returned: formattedLogs.length
      },
    };
  } catch (error) {
    this.logger.error('Failed to get network logs', { sessionId, error: error instanceof Error ? error.message : String(error) });
    return {
      success: false,
      message: `Failed to get network logs: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

  private async clearConsoleLogs(args: any) {
  const { sessionId } = args;
  const session = await this.getSession(sessionId);

  if (!session) {
    return {
      success: false,
      message: `Session '${sessionId}' not found`,
    };
  }

  try {
    // Clear browser console logs
    await session.driver.manage().logs().get('browser');

    // Execute script to clear console
    await session.driver.executeScript(`
        console.clear();
        if (window.capturedLogs) {
          window.capturedLogs = [];
        }
      `);

    this.logger.info('Console logs cleared', { sessionId });

    return {
      success: true,
      message: 'Console logs cleared successfully',
    };
  } catch (error) {
    this.logger.error('Failed to clear console logs', { sessionId, error: error instanceof Error ? error.message : String(error) });
    return {
      success: false,
      message: `Failed to clear console logs: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

  private async monitorConsole(args: any) {
  const { sessionId, duration = 10, level = 'all' } = args;
  const session = await this.getSession(sessionId);

  if (!session) {
    return {
      success: false,
      message: `Session '${sessionId}' not found`,
    };
  }

  try {
    const startTime = Date.now();
    const endTime = startTime + (duration * 1000);
    const logs: any[] = [];

    this.logger.info('Starting console monitoring', { sessionId, duration });

    // Monitor for the specified duration
    while (Date.now() < endTime) {
      const currentLogs = await session.driver.manage().logs().get('browser');

      // Get new logs since last check
      const newLogs = currentLogs.filter((log: any) => log.timestamp > startTime);

      // Filter by level
      let filteredLogs = newLogs;
      if (level !== 'all') {
        filteredLogs = newLogs.filter((log: any) => log.level.name.toLowerCase() === level.toLowerCase());
      }

      // Add to our collection
      logs.push(...filteredLogs);

      // Wait a bit before next check
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Format logs for easy reading
    const formattedLogs = logs.map((log: any, index: number) => {
      const timestamp = new Date(log.timestamp).toISOString();
      const logLevel = log.level.name.toUpperCase();
      const message = log.message.replace(/^.*?:\s*/, '');

      return {
        index: index + 1,
        timestamp,
        level: logLevel,
        message: message.trim(),
        source: log.source || 'unknown'
      };
    });

    this.logger.info('Console monitoring completed', { sessionId, count: formattedLogs.length });

    return {
      success: true,
      message: `Monitored console for ${duration} seconds, captured ${formattedLogs.length} logs`,
      data: {
        logs: formattedLogs,
        duration,
        level,
        count: formattedLogs.length
      },
    };
  } catch (error) {
    this.logger.error('Console monitoring failed', { sessionId, error: error instanceof Error ? error.message : String(error) });
    return {
      success: false,
      message: `Console monitoring failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

  private async debugPageState(args: any) {
  const { sessionId, includeConsole = true, includeNetwork = true, includeErrors = true, includePerformance = false } = args;
  const session = await this.getSession(sessionId);

  if (!session) {
    return {
      success: false,
      message: `Session '${sessionId}' not found`,
    };
  }

  try {
    const debugInfo: any = {
      timestamp: new Date().toISOString(),
      sessionId,
      browserId: session.browserId,
      pageInfo: {},
      issues: [],
      recommendations: []
    };

    // Get basic page info
    try {
      debugInfo.pageInfo.title = await session.driver.getTitle();
      debugInfo.pageInfo.url = await session.driver.getCurrentUrl();
      debugInfo.pageInfo.windowSize = await session.driver.manage().window().getSize();
      debugInfo.pageInfo.readyState = await session.driver.executeScript('return document.readyState');
    } catch (error) {
      debugInfo.issues.push(`Failed to get basic page info: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Get console logs
    if (includeConsole) {
      try {
        const logs = await session.driver.manage().logs().get('browser');
        const errorLogs = logs.filter((log: any) => log.level.name === 'SEVERE');
        const warningLogs = logs.filter((log: any) => log.level.name === 'WARNING');

        debugInfo.console = {
          total: logs.length,
          errors: errorLogs.length,
          warnings: warningLogs.length,
          recentLogs: logs.slice(-10).map((log: any) => ({
            level: log.level.name,
            message: log.message.replace(/^.*?:\s*/, ''),
            timestamp: new Date(log.timestamp).toISOString()
          }))
        };

        if (errorLogs.length > 0) {
          debugInfo.issues.push(`${errorLogs.length} console errors found`);
          debugInfo.recommendations.push('Check console errors for JavaScript issues');
        }
      } catch (error) {
        debugInfo.issues.push(`Failed to get console logs: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Get network activity
    if (includeNetwork) {
      try {
        const networkLogs = await session.driver.manage().logs().get('performance');
        const failedRequests = networkLogs.filter((log: any) => {
          try {
            const message = JSON.parse(log.message);
            return message.message?.method === 'Network.responseReceived' &&
              message.message?.params?.response?.status >= 400;
          } catch {
            return false;
          }
        });

        debugInfo.network = {
          totalRequests: networkLogs.length,
          failedRequests: failedRequests.length,
          recentRequests: networkLogs.slice(-5).map((log: any) => {
            try {
              const message = JSON.parse(log.message);
              return {
                method: message.message?.params?.request?.method || 'unknown',
                url: message.message?.params?.request?.url || 'unknown',
                status: message.message?.params?.response?.status || 'pending'
              };
            } catch {
              return { method: 'unknown', url: 'unknown', status: 'unknown' };
            }
          })
        };

        if (failedRequests.length > 0) {
          debugInfo.issues.push(`${failedRequests.length} failed network requests found`);
          debugInfo.recommendations.push('Check network tab for failed requests');
        }
      } catch (error) {
        debugInfo.issues.push(`Failed to get network logs: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Get JavaScript errors
    if (includeErrors) {
      try {
        const errors = await session.driver.executeScript(`
            return window.errors || [];
          `);
        debugInfo.javascriptErrors = errors;

        if (errors.length > 0) {
          debugInfo.issues.push(`${errors.length} JavaScript errors captured`);
          debugInfo.recommendations.push('Fix JavaScript errors to improve page functionality');
        }
      } catch (error) {
        // No errors captured yet, this is normal
      }
    }

    // Get performance metrics
    if (includePerformance) {
      try {
        const performance = await session.driver.executeScript(`
            const perf = performance.getEntriesByType('navigation')[0];
            return {
              loadTime: perf ? perf.loadEventEnd - perf.loadEventStart : 0,
              domContentLoaded: perf ? perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart : 0,
              firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0
            };
          `);
        debugInfo.performance = performance;
      } catch (error) {
        debugInfo.issues.push(`Failed to get performance metrics: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Generate recommendations
    if (debugInfo.issues.length === 0) {
      debugInfo.recommendations.push('Page appears to be functioning normally');
    }

    this.logger.info('Page debug info collected', { sessionId, issues: debugInfo.issues.length });

    return {
      success: true,
      message: `Debug information collected. Found ${debugInfo.issues.length} issues.`,
      data: debugInfo,
    };
  } catch (error) {
    this.logger.error('Failed to debug page state', { sessionId, error: error instanceof Error ? error.message : String(error) });
    return {
      success: false,
      message: `Failed to debug page state: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

  private async testElementInteraction(args: any) {
  const { sessionId, selector, by = 'css', testType = 'visibility' } = args;
  const session = await this.getSession(sessionId);

  if (!session) {
    return {
      success: false,
      message: `Session '${sessionId}' not found`,
    };
  }

  try {
    let element;

    // Find element based on selector type
    switch (by.toLowerCase()) {
      case 'css':
        element = await session.driver.findElement(By.css(selector));
        break;
      case 'xpath':
        element = await session.driver.findElement(By.xpath(selector));
        break;
      case 'id':
        element = await session.driver.findElement(By.id(selector));
        break;
      case 'name':
        element = await session.driver.findElement(By.name(selector));
        break;
      case 'classname':
        element = await session.driver.findElement(By.className(selector));
        break;
      case 'tagname':
        element = await session.driver.findElement(By.tagName(selector));
        break;
      default:
        return {
          success: false,
          message: `Invalid selector type: ${by}`,
        };
    }

    const testResults: any = {
      elementFound: true,
      selector,
      by,
      testType,
      results: {}
    };

    // Test based on type
    switch (testType) {
      case 'visibility':
        testResults.results.visible = await element.isDisplayed();
        testResults.results.inViewport = await session.driver.executeScript(`
            const rect = arguments[0].getBoundingClientRect();
            return rect.top >= 0 && rect.left >= 0 && 
                   rect.bottom <= window.innerHeight && 
                   rect.right <= window.innerWidth;
          `, element);
        break;

      case 'enabled':
        testResults.results.enabled = await element.isEnabled();
        break;

      case 'click':
        testResults.results.clickable = await element.isDisplayed() && await element.isEnabled();
        if (testResults.results.clickable) {
          try {
            await element.click();
            testResults.results.clickSuccessful = true;
          } catch (error) {
            testResults.results.clickSuccessful = false;
            testResults.results.clickError = error instanceof Error ? error.message : String(error);
          }
        }
        break;

      case 'type':
        testResults.results.typeable = await element.isDisplayed() && await element.isEnabled();
        const tagName = await element.getTagName();
        testResults.results.isInputElement = ['input', 'textarea'].includes(tagName.toLowerCase());
        break;

      case 'hover':
        testResults.results.hoverable = await element.isDisplayed();
        if (testResults.results.hoverable) {
          try {
            await session.driver.actions().moveToElement(element).perform();
            testResults.results.hoverSuccessful = true;
          } catch (error) {
            testResults.results.hoverSuccessful = false;
            testResults.results.hoverError = error instanceof Error ? error.message : String(error);
          }
        }
        break;
    }

    this.logger.info('Element interaction test completed', { sessionId, selector, testType });

    return {
      success: true,
      message: `Element interaction test completed for ${testType}`,
      data: testResults,
    };
  } catch (error) {
    this.logger.error('Element interaction test failed', { sessionId, selector, error: error instanceof Error ? error.message : String(error) });
    return {
      success: false,
      message: `Element interaction test failed: ${error instanceof Error ? error.message : String(error)}`,
      data: {
        elementFound: false,
        selector,
        by,
        testType,
        error: error instanceof Error ? error.message : String(error)
      },
    };
  }
}

  private async waitForCondition(args: any) {
  const { sessionId, condition, timeout = 10000, description = 'custom condition' } = args;
  const session = await this.getSession(sessionId);

  if (!session) {
    return {
      success: false,
      message: `Session '${sessionId}' not found`,
    };
  }

  try {
    const startTime = Date.now();
    let conditionMet = false;
    let lastError: string | null = null;

    this.logger.info('Waiting for condition', { sessionId, condition, description });

    while (Date.now() - startTime < timeout) {
      try {
        conditionMet = await session.driver.executeScript(`return ${condition}`);
        if (conditionMet) {
          break;
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const duration = Date.now() - startTime;

    this.logger.info('Condition wait completed', { sessionId, conditionMet, duration });

    return {
      success: true,
      message: conditionMet ?
        `Condition met after ${duration}ms` :
        `Condition not met after ${timeout}ms timeout`,
      data: {
        condition,
        description,
        conditionMet,
        duration,
        timeout,
        lastError
      },
    };
  } catch (error) {
    this.logger.error('Condition wait failed', { sessionId, error: error instanceof Error ? error.message : String(error) });
    return {
      success: false,
      message: `Condition wait failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

  private async capturePageErrors(args: any) {
  const { sessionId, includeStack = true } = args;
  const session = await this.getSession(sessionId);

  if (!session) {
    return {
      success: false,
      message: `Session '${sessionId}' not found`,
    };
  }

  try {
    // Set up error capturing
    await session.driver.executeScript(`
        window.capturedErrors = [];
        window.addEventListener('error', function(event) {
          window.capturedErrors.push({
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            stack: event.error ? event.error.stack : null,
            timestamp: new Date().toISOString()
          });
        });
        window.addEventListener('unhandledrejection', function(event) {
          window.capturedErrors.push({
            message: 'Unhandled Promise Rejection: ' + event.reason,
            filename: 'unknown',
            lineno: 0,
            colno: 0,
            stack: event.reason ? event.reason.stack : null,
            timestamp: new Date().toISOString()
          });
        });
      `);

    // Wait a moment for any immediate errors
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get captured errors
    const errors = await session.driver.executeScript(`
        return window.capturedErrors || [];
      `);

    // Format errors for easy reading
    const formattedErrors = errors.map((error: any, index: number) => ({
      index: index + 1,
      message: error.message,
      location: `${error.filename}:${error.lineno}:${error.colno}`,
      timestamp: error.timestamp,
      stack: includeStack ? error.stack : undefined
    }));

    this.logger.info('Page errors captured', { sessionId, count: formattedErrors.length });

    return {
      success: true,
      message: `Captured ${formattedErrors.length} page errors`,
      data: {
        errors: formattedErrors,
        count: formattedErrors.length,
        includeStack
      },
    };
  } catch (error) {
    this.logger.error('Failed to capture page errors', { sessionId, error: error instanceof Error ? error.message : String(error) });
    return {
      success: false,
      message: `Failed to capture page errors: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

  private async testPageFunctionality(args: any) {
  const { sessionId, testForms = true, testLinks = true, testImages = true } = args;
  const session = await this.getSession(sessionId);

  if (!session) {
    return {
      success: false,
      message: `Session '${sessionId}' not found`,
    };
  }

  try {
    const testResults: any = {
      timestamp: new Date().toISOString(),
      sessionId,
      tests: {},
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        issues: []
      }
    };

    // Test forms
    if (testForms) {
      try {
        const formResults = await session.driver.executeScript(`
            const forms = document.querySelectorAll('form');
            const inputs = document.querySelectorAll('input, textarea, select');
            const buttons = document.querySelectorAll('button, input[type="submit"], input[type="button"]');
            
            return {
              formCount: forms.length,
              inputCount: inputs.length,
              buttonCount: buttons.length,
              formsWithAction: Array.from(forms).filter(f => f.action).length,
              requiredInputs: Array.from(inputs).filter(i => i.required).length,
              disabledInputs: Array.from(inputs).filter(i => i.disabled).length,
              brokenInputs: Array.from(inputs).filter(i => !i.name && !i.id).length
            };
          `);

        testResults.tests.forms = {
          ...formResults,
          passed: formResults.brokenInputs === 0,
          issues: formResults.brokenInputs > 0 ? [`${formResults.brokenInputs} inputs without name or id`] : []
        };

        testResults.summary.total++;
        if (testResults.tests.forms.passed) {
          testResults.summary.passed++;
        } else {
          testResults.summary.failed++;
          testResults.summary.issues.push(...testResults.tests.forms.issues);
        }
      } catch (error) {
        testResults.tests.forms = {
          passed: false,
          error: error instanceof Error ? error.message : String(error)
        };
        testResults.summary.total++;
        testResults.summary.failed++;
      }
    }

    // Test links
    if (testLinks) {
      try {
        const linkResults = await session.driver.executeScript(`
            const links = document.querySelectorAll('a[href]');
            const brokenLinks = [];
            
            links.forEach(link => {
              if (!link.href || link.href === '#' || link.href.includes('javascript:')) {
                brokenLinks.push(link.href || 'empty');
              }
            });
            
            return {
              linkCount: links.length,
              brokenLinkCount: brokenLinks.length,
              brokenLinks: brokenLinks.slice(0, 10) // Limit to first 10
            };
          `);

        testResults.tests.links = {
          ...linkResults,
          passed: linkResults.brokenLinkCount === 0,
          issues: linkResults.brokenLinkCount > 0 ? [`${linkResults.brokenLinkCount} broken or empty links`] : []
        };

        testResults.summary.total++;
        if (testResults.tests.links.passed) {
          testResults.summary.passed++;
        } else {
          testResults.summary.failed++;
          testResults.summary.issues.push(...testResults.tests.links.issues);
        }
      } catch (error) {
        testResults.tests.links = {
          passed: false,
          error: error instanceof Error ? error.message : String(error)
        };
        testResults.summary.total++;
        testResults.summary.failed++;
      }
    }

    // Test images
    if (testImages) {
      try {
        const imageResults = await session.driver.executeScript(`
            const images = document.querySelectorAll('img');
            const brokenImages = [];
            
            images.forEach(img => {
              if (!img.src || img.src === '' || img.complete === false) {
                brokenImages.push(img.src || 'empty');
              }
            });
            
            return {
              imageCount: images.length,
              brokenImageCount: brokenImages.length,
              brokenImages: brokenImages.slice(0, 10) // Limit to first 10
            };
          `);

        testResults.tests.images = {
          ...imageResults,
          passed: imageResults.brokenImageCount === 0,
          issues: imageResults.brokenImageCount > 0 ? [`${imageResults.brokenImageCount} broken or missing images`] : []
        };

        testResults.summary.total++;
        if (testResults.tests.images.passed) {
          testResults.summary.passed++;
        } else {
          testResults.summary.failed++;
          testResults.summary.issues.push(...testResults.tests.images.issues);
        }
      } catch (error) {
        testResults.tests.images = {
          passed: false,
          error: error instanceof Error ? error.message : String(error)
        };
        testResults.summary.total++;
        testResults.summary.failed++;
      }
    }

    this.logger.info('Page functionality test completed', {
      sessionId,
      total: testResults.summary.total,
      passed: testResults.summary.passed,
      failed: testResults.summary.failed
    });

    return {
      success: true,
      message: `Page functionality test completed: ${testResults.summary.passed}/${testResults.summary.total} tests passed`,
      data: testResults,
    };
  } catch (error) {
    this.logger.error('Page functionality test failed', { sessionId, error: error instanceof Error ? error.message : String(error) });
    return {
      success: false,
      message: `Page functionality test failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

  private async startRecording(args: any) {
  const { sessionId, recordingName, includeScreenshots = true, includeConsole = true } = args;
  const session = await this.getSession(sessionId);

  if (!session) {
    return {
      success: false,
      message: `Session '${sessionId}' not found`,
    };
  }

  try {
    // Check if already recording
    if (this.activeRecordings.has(sessionId)) {
      return {
        success: false,
        message: 'Recording already in progress for this session',
      };
    }

    // Create new recording
    const recording: Recording = {
      name: recordingName,
      createdAt: new Date().toISOString(),
      steps: [],
      metadata: {
        totalSteps: 0,
        duration: 0,
        includeScreenshots,
        includeConsole
      }
    };

    this.recordings.set(recordingName, recording);
    this.activeRecordings.set(sessionId, { recording, startTime: Date.now() });

    // Set up recording hooks
    await this.setupRecordingHooks(session.driver, sessionId, includeScreenshots, includeConsole);

    this.logger.info('Recording started', { sessionId, recordingName });

    return {
      success: true,
      message: `Recording started: ${recordingName}`,
      data: { recordingName, includeScreenshots, includeConsole },
    };
  } catch (error) {
    this.logger.error('Failed to start recording', { sessionId, error: error instanceof Error ? error.message : String(error) });
    return {
      success: false,
      message: `Failed to start recording: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

  private async stopRecording(args: any) {
  const { sessionId, saveToFile = true } = args;
  const activeRecording = this.activeRecordings.get(sessionId);

  if (!activeRecording) {
    return {
      success: false,
      message: 'No active recording found for this session',
    };
  }

  try {
    const { recording, startTime } = activeRecording;
    const duration = Date.now() - startTime;

    // Update recording metadata
    recording.metadata.duration = duration;
    recording.metadata.totalSteps = recording.steps.length;

    // Save to file if requested
    if (saveToFile) {
      const filename = `recording-${recording.name}-${Date.now()}.json`;
      const filepath = join(process.cwd(), filename);
      await fs.writeFile(filepath, JSON.stringify(recording, null, 2));

      this.logger.info('Recording saved to file', { sessionId, filename, filepath });
    }

    // Remove from active recordings
    this.activeRecordings.delete(sessionId);

    this.logger.info('Recording stopped', { sessionId, recordingName: recording.name, steps: recording.steps.length });

    return {
      success: true,
      message: `Recording stopped: ${recording.name} (${recording.steps.length} steps, ${duration}ms)`,
      data: {
        recordingName: recording.name,
        steps: recording.steps.length,
        duration,
        saved: saveToFile
      },
    };
  } catch (error) {
    this.logger.error('Failed to stop recording', { sessionId, error: error instanceof Error ? error.message : String(error) });
    return {
      success: false,
      message: `Failed to stop recording: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

  private async playRecording(args: any) {
  const { sessionId, recordingName, speed = 1.0, pauseBetweenSteps = 500 } = args;
  const session = await this.getSession(sessionId);
  const recording = this.recordings.get(recordingName);

  if (!session) {
    return {
      success: false,
      message: `Session '${sessionId}' not found`,
    };
  }

  if (!recording) {
    return {
      success: false,
      message: `Recording '${recordingName}' not found`,
    };
  }

  try {
    this.logger.info('Starting playback', { sessionId, recordingName, steps: recording.steps.length });

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < recording.steps.length; i++) {
      const step = recording.steps[i];

      try {
        await this.executeRecordingStep(session.driver, step);
        successCount++;

        // Pause between steps (adjusted for speed)
        if (pauseBetweenSteps > 0 && i < recording.steps.length - 1) {
          await new Promise(resolve => setTimeout(resolve, pauseBetweenSteps / speed));
        }
      } catch (error) {
        errorCount++;
        const errorMsg = `Step ${i + 1} failed: ${error instanceof Error ? error.message : String(error)}`;
        errors.push(errorMsg);
        this.logger.warn('Playback step failed', { sessionId, step: i + 1, error: errorMsg });
      }
    }

    this.logger.info('Playback completed', { sessionId, successCount, errorCount });

    return {
      success: true,
      message: `Playback completed: ${successCount}/${recording.steps.length} steps successful`,
      data: {
        recordingName,
        totalSteps: recording.steps.length,
        successCount,
        errorCount,
        errors: errors.slice(0, 10) // Limit error details
      },
    };
  } catch (error) {
    this.logger.error('Playback failed', { sessionId, error: error instanceof Error ? error.message : String(error) });
    return {
      success: false,
      message: `Playback failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

  private async listRecordings() {
  try {
    const recordingsList = Array.from(this.recordings.values()).map(recording => ({
      name: recording.name,
      createdAt: recording.createdAt,
      steps: recording.metadata.totalSteps,
      duration: recording.metadata.duration,
      includeScreenshots: recording.metadata.includeScreenshots,
      includeConsole: recording.metadata.includeConsole
    }));

    return {
      success: true,
      message: `Found ${recordingsList.length} recordings`,
      data: { recordings: recordingsList },
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to list recordings: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

  private async saveRecording(args: any) {
  const { recordingName, filename } = args;
  const recording = this.recordings.get(recordingName);

  if (!recording) {
    return {
      success: false,
      message: `Recording '${recordingName}' not found`,
    };
  }

  try {
    const finalFilename = filename || `recording-${recordingName}-${Date.now()}.json`;
    const filepath = join(process.cwd(), finalFilename);
    await fs.writeFile(filepath, JSON.stringify(recording, null, 2));

    this.logger.info('Recording saved to file', { recordingName, filename: finalFilename, filepath });

    return {
      success: true,
      message: `Recording saved: ${finalFilename}`,
      data: { filename: finalFilename, filepath, recordingName },
    };
  } catch (error) {
    this.logger.error('Failed to save recording', { recordingName, error: error instanceof Error ? error.message : String(error) });
    return {
      success: false,
      message: `Failed to save recording: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

  private async loadRecording(args: any) {
  const { filename, recordingName } = args;

  try {
    const filepath = join(process.cwd(), filename);
    const fileContent = await fs.readFile(filepath, 'utf-8');
    const recording: Recording = JSON.parse(fileContent);

    // Use provided name or keep original
    const finalName = recordingName || recording.name;
    recording.name = finalName;

    this.recordings.set(finalName, recording);

    this.logger.info('Recording loaded from file', { filename, filepath, recordingName: finalName });

    return {
      success: true,
      message: `Recording loaded: ${finalName}`,
      data: {
        recordingName: finalName,
        filepath,
        steps: recording.metadata.totalSteps,
        duration: recording.metadata.duration
      },
    };
  } catch (error) {
    this.logger.error('Failed to load recording', { filename, error: error instanceof Error ? error.message : String(error) });
    return {
      success: false,
      message: `Failed to load recording: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

  private async createTestScript(args: any) {
  const { recordingName, scriptType = 'javascript', includeAssertions = true } = args;
  const recording = this.recordings.get(recordingName);

  if (!recording) {
    return {
      success: false,
      message: `Recording '${recordingName}' not found`,
    };
  }

  try {
    let script = '';

    switch (scriptType) {
      case 'javascript':
        script = this.generateJavaScriptTest(recording, includeAssertions);
        break;
      case 'python':
        script = this.generatePythonTest(recording, includeAssertions);
        break;
      case 'json':
        script = JSON.stringify(recording, null, 2);
        break;
      default:
        return {
          success: false,
          message: `Unsupported script type: ${scriptType}`,
        };
    }

    const filename = `test-${recordingName}-${Date.now()}.${scriptType === 'json' ? 'json' : scriptType === 'python' ? 'py' : 'js'}`;
    const filepath = join(process.cwd(), filename);
    await fs.writeFile(filepath, script);

    this.logger.info('Test script created', { recordingName, scriptType, filename, filepath });

    return {
      success: true,
      message: `Test script created: ${filename}`,
      data: { filename, filepath, scriptType, recordingName },
    };
  } catch (error) {
    this.logger.error('Failed to create test script', { recordingName, error: error instanceof Error ? error.message : String(error) });
    return {
      success: false,
      message: `Failed to create test script: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

  private async setupRecordingHooks(driver: any, sessionId: string, includeScreenshots: boolean, includeConsole: boolean) {
  // This would set up hooks to capture interactions
  // For now, we'll implement a basic version that records when tools are called
  // In a full implementation, you'd hook into the WebDriver events
}

  private async recordInteraction(sessionId: string, stepData: Partial<RecordingStep>) {
  const activeRecording = this.activeRecordings.get(sessionId);
  if (!activeRecording) return;

  const { recording } = activeRecording;
  const step: RecordingStep = {
    id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    action: stepData.action || 'unknown',
    ...stepData
  };

  recording.steps.push(step);
  this.logger.debug('Interaction recorded', { sessionId, action: step.action });
}

  private async executeRecordingStep(driver: any, step: RecordingStep) {
  switch (step.action) {
    case 'navigate':
      await driver.get(step.url!);
      break;
    case 'click':
      const clickElement = await this.findElementBySelector(driver, step.selector!, step.by!);
      await clickElement.click();
      break;
    case 'type':
      const typeElement = await this.findElementBySelector(driver, step.selector!, step.by!);
      await typeElement.clear();
      await typeElement.sendKeys(step.text!);
      break;
    case 'screenshot':
      // Screenshots are handled separately
      break;
    default:
      throw new Error(`Unknown action: ${step.action}`);
  }
}

  private async findElementBySelector(driver: any, selector: string, by: string) {
  switch (by.toLowerCase()) {
    case 'css':
      return await driver.findElement(By.css(selector));
    case 'xpath':
      return await driver.findElement(By.xpath(selector));
    case 'id':
      return await driver.findElement(By.id(selector));
    case 'name':
      return await driver.findElement(By.name(selector));
    case 'classname':
      return await driver.findElement(By.className(selector));
    case 'tagname':
      return await driver.findElement(By.tagName(selector));
    default:
      throw new Error(`Unknown selector type: ${by}`);
  }
}

  private generateJavaScriptTest(recording: Recording, includeAssertions: boolean): string {
  let script = `// Test script generated from recording: ${recording.name}\n`;
  script += `// Generated on: ${new Date().toISOString()}\n\n`;
  script += `const { Builder, By, until } = require('selenium-webdriver');\n\n`;
  script += `async function test${recording.name.replace(/[^a-zA-Z0-9]/g, '')}() {\n`;
  script += `  const driver = await new Builder().forBrowser('chrome').build();\n\n`;
  script += `  try {\n`;

  for (const step of recording.steps) {
    switch (step.action) {
      case 'navigate':
        script += `    await driver.get('${step.url}');\n`;
        if (includeAssertions) {
          script += `    await driver.wait(until.titleContains(''), 5000);\n`;
        }
        break;
      case 'click':
        script += `    await driver.findElement(By.${step.by}('${step.selector}')).click();\n`;
        break;
      case 'type':
        script += `    await driver.findElement(By.${step.by}('${step.selector}')).sendKeys('${step.text}');\n`;
        break;
    }
    script += `\n`;
  }

  script += `    console.log('Test completed successfully');\n`;
  script += `  } finally {\n`;
  script += `    await driver.quit();\n`;
  script += `  }\n`;
  script += `}\n\n`;
  script += `test${recording.name.replace(/[^a-zA-Z0-9]/g, '')}();\n`;

  return script;
}

  private generatePythonTest(recording: Recording, includeAssertions: boolean): string {
  let script = `# Test script generated from recording: ${recording.name}\n`;
  script += `# Generated on: ${new Date().toISOString()}\n\n`;
  script += `from selenium import webdriver\n`;
  script += `from selenium.webdriver.common.by import By\n`;
  script += `from selenium.webdriver.support.ui import WebDriverWait\n`;
  script += `from selenium.webdriver.support import expected_conditions as EC\n\n`;
  script += `def test_${recording.name.replace(/[^a-zA-Z0-9]/g, '_').lower()}():\n`;
  script += `    driver = webdriver.Chrome()\n\n`;
  script += `    try:\n`;

  for (const step of recording.steps) {
    switch (step.action) {
      case 'navigate':
        script += `        driver.get('${step.url}')\n`;
        if (includeAssertions) {
          script += `        WebDriverWait(driver, 5).until(EC.presence_of_element_located((By.TAG_NAME, 'body')))\n`;
        }
        break;
      case 'click':
        script += `        driver.find_element(By.${step.by.upper()}, '${step.selector}').click()\n`;
        break;
      case 'type':
        script += `        driver.find_element(By.${step.by.upper()}, '${step.selector}').send_keys('${step.text}')\n`;
        break;
    }
    script += `\n`;
  }

  script += `        print('Test completed successfully')\n`;
  script += `    finally:\n`;
  script += `        driver.quit()\n\n`;
  script += `if __name__ == '__main__':\n`;
  script += `    test_${recording.name.replace(/[^a-zA-Z0-9]/g, '_').lower()}()\n`;

  return script;
}

  private async loadExistingRecordings() {
  try {
    const projectDir = process.cwd();
    const files = await fs.readdir(projectDir);
    const recordingFiles = files.filter(file =>
      file.startsWith('recording-') && file.endsWith('.json')
    );

    this.logger.info('Loading existing recordings from project directory', {
      projectDir,
      foundFiles: recordingFiles.length
    });

    for (const file of recordingFiles) {
      try {
        const filepath = join(projectDir, file);
        const fileContent = await fs.readFile(filepath, 'utf-8');
        const recording: Recording = JSON.parse(fileContent);

        this.recordings.set(recording.name, recording);
        this.logger.debug('Loaded recording from file', {
          filename: file,
          recordingName: recording.name,
          steps: recording.metadata.totalSteps
        });
      } catch (error) {
        this.logger.warn('Failed to load recording file', {
          file,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    this.logger.info('Finished loading recordings', {
      totalLoaded: this.recordings.size
    });
  } catch (error) {
    this.logger.warn('Failed to load existing recordings', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

  private async autoLogin(args: any) {
  const { sessionId, recordingName, username, password, waitForSuccess = true } = args;
  const session = await this.getSession(sessionId);
  const recording = this.recordings.get(recordingName);

  if (!session) {
    return {
      success: false,
      message: `Session '${sessionId}' not found`,
    };
  }

  if (!recording) {
    return {
      success: false,
      message: `Recording '${recordingName}' not found`,
    };
  }

  try {
    this.logger.info('Starting auto login', { sessionId, recordingName, username });

    // Substitute parameters in the recording
    const parameterizedRecording = this.substituteParameters(recording, {
      username: username,
      password: password,
      email: username // Often username is email
    });

    // Execute the parameterized recording
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < parameterizedRecording.steps.length; i++) {
      const step = parameterizedRecording.steps[i];

      try {
        await this.executeRecordingStep(session.driver, step);
        successCount++;

        // Small pause between steps
        if (i < parameterizedRecording.steps.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        errorCount++;
        const errorMsg = `Step ${i + 1} failed: ${error instanceof Error ? error.message : String(error)}`;
        errors.push(errorMsg);
        this.logger.warn('Login step failed', { sessionId, step: i + 1, error: errorMsg });
      }
    }

    // Wait for success indicators if requested
    if (waitForSuccess && successCount > 0) {
      try {
        await this.waitForLoginSuccess(session.driver);
      } catch (error) {
        this.logger.warn('Login success verification failed', { sessionId, error: error instanceof Error ? error.message : String(error) });
      }
    }

    this.logger.info('Auto login completed', { sessionId, successCount, errorCount });

    return {
      success: errorCount === 0,
      message: `Auto login completed: ${successCount}/${parameterizedRecording.steps.length} steps successful`,
      data: {
        recordingName,
        username,
        totalSteps: parameterizedRecording.steps.length,
        successCount,
        errorCount,
        errors: errors.slice(0, 5) // Limit error details
      },
    };
  } catch (error) {
    this.logger.error('Auto login failed', { sessionId, error: error instanceof Error ? error.message : String(error) });
    return {
      success: false,
      message: `Auto login failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

  private async autoRegister(args: any) {
  const { sessionId, recordingName, userData } = args;
  const session = await this.getSession(sessionId);
  const recording = this.recordings.get(recordingName);

  if (!session) {
    return {
      success: false,
      message: `Session '${sessionId}' not found`,
    };
  }

  if (!recording) {
    return {
      success: false,
      message: `Recording '${recordingName}' not found`,
    };
  }

  try {
    this.logger.info('Starting auto registration', { sessionId, recordingName, email: userData.email });

    // Substitute parameters in the recording
    const parameterizedRecording = this.substituteParameters(recording, {
      email: userData.email,
      password: userData.password,
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      company: userData.company || '',
      username: userData.email // Often email is used as username
    });

    // Execute the parameterized recording
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < parameterizedRecording.steps.length; i++) {
      const step = parameterizedRecording.steps[i];

      try {
        await this.executeRecordingStep(session.driver, step);
        successCount++;

        // Small pause between steps
        if (i < parameterizedRecording.steps.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        errorCount++;
        const errorMsg = `Step ${i + 1} failed: ${error instanceof Error ? error.message : String(error)}`;
        errors.push(errorMsg);
        this.logger.warn('Registration step failed', { sessionId, step: i + 1, error: errorMsg });
      }
    }

    this.logger.info('Auto registration completed', { sessionId, successCount, errorCount });

    return {
      success: errorCount === 0,
      message: `Auto registration completed: ${successCount}/${parameterizedRecording.steps.length} steps successful`,
      data: {
        recordingName,
        userData,
        totalSteps: parameterizedRecording.steps.length,
        successCount,
        errorCount,
        errors: errors.slice(0, 5)
      },
    };
  } catch (error) {
    this.logger.error('Auto registration failed', { sessionId, error: error instanceof Error ? error.message : String(error) });
    return {
      success: false,
      message: `Auto registration failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

  private async recordCommonTask(args: any) {
  const { sessionId, taskType, taskName, instructions } = args;
  const session = await this.getSession(sessionId);

  if (!session) {
    return {
      success: false,
      message: `Session '${sessionId}' not found`,
    };
  }

  try {
    // Start recording with a descriptive name
    const recordingName = `${taskType}_${taskName}_${Date.now()}`;

    const recording: Recording = {
      name: recordingName,
      createdAt: new Date().toISOString(),
      steps: [],
      metadata: {
        totalSteps: 0,
        duration: 0,
        includeScreenshots: true,
        includeConsole: true
      }
    };

    // Add task metadata
    (recording as any).taskType = taskType;
    (recording as any).taskName = taskName;
    (recording as any).instructions = instructions;

    this.recordings.set(recordingName, recording);
    this.activeRecordings.set(sessionId, { recording, startTime: Date.now() });

    this.logger.info('Common task recording started', { sessionId, taskType, taskName, instructions });

    return {
      success: true,
      message: `Recording started for ${taskType} task: ${taskName}`,
      data: {
        recordingName,
        taskType,
        taskName,
        instructions: instructions || 'Please perform the task steps now'
      },
    };
  } catch (error) {
    this.logger.error('Failed to start common task recording', { sessionId, error: error instanceof Error ? error.message : String(error) });
    return {
      success: false,
      message: `Failed to start recording: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

  private async executeCommonTask(args: any) {
  const { sessionId, taskName, parameters = {}, verifySuccess = true } = args;
  const session = await this.getSession(sessionId);

  if (!session) {
    return {
      success: false,
      message: `Session '${sessionId}' not found`,
    };
  }

  try {
    // Find recording by task name
    const recording = Array.from(this.recordings.values()).find(r =>
      (r as any).taskName === taskName
    );

    if (!recording) {
      return {
        success: false,
        message: `Task '${taskName}' not found`,
      };
    }

    this.logger.info('Executing common task', { sessionId, taskName, parameters });

    // Substitute parameters
    const parameterizedRecording = this.substituteParameters(recording, parameters);

    // Execute the task
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < parameterizedRecording.steps.length; i++) {
      const step = parameterizedRecording.steps[i];

      try {
        await this.executeRecordingStep(session.driver, step);
        successCount++;

        // Small pause between steps
        if (i < parameterizedRecording.steps.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        errorCount++;
        const errorMsg = `Step ${i + 1} failed: ${error instanceof Error ? error.message : String(error)}`;
        errors.push(errorMsg);
        this.logger.warn('Task step failed', { sessionId, step: i + 1, error: errorMsg });
      }
    }

    // Verify success if requested
    if (verifySuccess && successCount > 0) {
      try {
        await this.waitForTaskSuccess(session.driver, (recording as any).taskType);
      } catch (error) {
        this.logger.warn('Task success verification failed', { sessionId, error: error instanceof Error ? error.message : String(error) });
      }
    }

    this.logger.info('Common task executed', { sessionId, taskName, successCount, errorCount });

    return {
      success: errorCount === 0,
      message: `Task '${taskName}' executed: ${successCount}/${parameterizedRecording.steps.length} steps successful`,
      data: {
        taskName,
        taskType: (recording as any).taskType,
        totalSteps: parameterizedRecording.steps.length,
        successCount,
        errorCount,
        errors: errors.slice(0, 5)
      },
    };
  } catch (error) {
    this.logger.error('Common task execution failed', { sessionId, error: error instanceof Error ? error.message : String(error) });
    return {
      success: false,
      message: `Task execution failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

  private async listCommonTasks(args: any) {
  const { taskType = 'all' } = args;

  try {
    const allRecordings = Array.from(this.recordings.values());
    const commonTasks = allRecordings
      .filter(recording => (recording as any).taskType && (recording as any).taskName)
      .filter(recording => taskType === 'all' || (recording as any).taskType === taskType)
      .map(recording => ({
        name: (recording as any).taskName,
        type: (recording as any).taskType,
        recordingName: recording.name,
        createdAt: recording.createdAt,
        steps: recording.metadata.totalSteps,
        duration: recording.metadata.duration,
        instructions: (recording as any).instructions || 'No instructions provided'
      }));

    return {
      success: true,
      message: `Found ${commonTasks.length} common tasks`,
      data: { tasks: commonTasks },
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to list common tasks: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

  private substituteParameters(recording: Recording, parameters: Record<string, string>): Recording {
  const substituted = JSON.parse(JSON.stringify(recording)); // Deep clone

  for (const step of substituted.steps) {
    // Substitute in text content
    if (step.text) {
      for (const [key, value] of Object.entries(parameters)) {
        step.text = step.text.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
        step.text = step.text.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
      }
    }

    // Substitute in URLs
    if (step.url) {
      for (const [key, value] of Object.entries(parameters)) {
        step.url = step.url.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
        step.url = step.url.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
      }
    }

    // Substitute in selectors
    if (step.selector) {
      for (const [key, value] of Object.entries(parameters)) {
        step.selector = step.selector.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
        step.selector = step.selector.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
      }
    }
  }

  return substituted;
}

  private async waitForLoginSuccess(driver: any) {
  // Wait for common login success indicators
  const successIndicators = [
    'dashboard',
    'profile',
    'welcome',
    'logout',
    'account',
    'settings'
  ];

  for (const indicator of successIndicators) {
    try {
      await driver.wait(async () => {
        const url = await driver.getCurrentUrl();
        const title = await driver.getTitle();
        return url.toLowerCase().includes(indicator) || title.toLowerCase().includes(indicator);
      }, 5000);
      return; // Success found
    } catch {
      // Continue to next indicator
    }
  }
}

  private async waitForTaskSuccess(driver: any, taskType: string) {
  // Wait for task-specific success indicators
  const successIndicators: Record<string, string[]> = {
    login: ['dashboard', 'profile', 'welcome', 'logout'],
    registration: ['welcome', 'verify', 'confirm', 'success'],
    checkout: ['success', 'thank', 'order', 'complete'],
    profile_update: ['saved', 'updated', 'success', 'profile']
  };

  const indicators = successIndicators[taskType] || ['success', 'complete', 'saved'];

  for (const indicator of indicators) {
    try {
      await driver.wait(async () => {
        const url = await driver.getCurrentUrl();
        const title = await driver.getTitle();
        return url.toLowerCase().includes(indicator) || title.toLowerCase().includes(indicator);
      }, 5000);
      return; // Success found
    } catch {
      // Continue to next indicator
    }
  }
}

  async run() {
  const transport = new StdioServerTransport();
  await this.server.connect(transport);
  console.error('Simple Browser MCP Server running on stdio');
}
}

// Run the server
const server = new SimpleMCPServer();
server.run().catch(console.error);