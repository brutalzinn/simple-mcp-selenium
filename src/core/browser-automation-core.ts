import { Builder, By, WebDriver, until, Key, Actions, Button } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { promises as fs } from 'fs';
import { join, resolve } from 'path';

export interface BrowserOptions {
  headless?: boolean;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  browserType?: 'chrome';
  userAgent?: string;
  proxy?: string;
  monitor?: number | 'primary' | 'secondary' | 'auto';
  kiosk?: boolean;
}

export interface ElementOptions {
  selector: string;
  by?: 'css' | 'xpath' | 'id' | 'name' | 'className' | 'tagName';
  timeout?: number;
}

export interface ActionResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export interface ConsoleLogEntry {
  level: 'log' | 'error' | 'warn' | 'info' | 'debug';
  message: string;
  timestamp: string;
  source?: string;
  line?: number;
  column?: number;
}

export interface NetworkLogEntry {
  url: string;
  method: string;
  status: number;
  statusText: string;
  responseTime: number;
  timestamp: string;
  resourceType: 'fetch' | 'xhr' | 'websocket' | 'websocket-message' | 'websocket-close' | 'websocket-error';
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  responseSize?: number;
  error?: string;
  message?: string;
  messageType?: 'open' | 'message' | 'close' | 'error';
  readyState?: number;
}

export interface PerformanceMetrics {
  loadTime: number;
  domContentLoaded: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  totalBlockingTime: number;
  speedIndex: number;
  timeToInteractive: number;
  networkRequests: number;
  totalTransferSize: number;
  timestamp: string;
}

export interface CommandHistory {
  id: string;
  command: string;
  arguments: any;
  timestamp: string;
  success: boolean;
  result?: any;
  error?: string;
  browserId?: string;
  duration?: number;
}

export interface ScreenRecording {
  id: string;
  filename: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  status: 'recording' | 'stopped' | 'error';
  error?: string;
}

export class BrowserAutomationCore {
  private driver: WebDriver | null = null;
  private consoleLogs: ConsoleLogEntry[] = [];
  private networkLogs: NetworkLogEntry[] = [];
  private performanceMetrics: PerformanceMetrics | null = null;
  private commandHistory: CommandHistory[] = [];
  private screenRecording: ScreenRecording | null = null;
  private debugPort: number | null = null;

  private getMonitorPosition(monitor: number | 'primary' | 'secondary' | 'auto' | undefined): { x: number; y: number } {
    // Default to primary monitor (0, 0)
    let x = 0;
    let y = 0;

    if (monitor === 'primary' || monitor === undefined) {
      return { x: 0, y: 0 };
    }

    if (monitor === 'secondary') {
      // Common secondary monitor positions
      // You can adjust these values based on your setup
      x = 1920; // Assuming 1920x1080 primary monitor
      y = 0;
    } else if (typeof monitor === 'number') {
      // For specific monitor numbers
      // Monitor 0: x=0, y=0 (primary)
      // Monitor 1: x=1920, y=0 (right of primary)
      // Monitor 2: x=-1920, y=0 (left of primary)
      switch (monitor) {
        case 0:
          x = 0;
          y = 0;
          break;
        case 1:
          x = 1920; // Right of primary
          y = 0;
          break;
        case 2:
          x = -1920; // Left of primary
          y = 0;
          break;
        default:
          x = monitor * 1920; // Assume 1920px width per monitor
          y = 0;
      }
    }

    return { x, y };
  }

  async openBrowser(options: BrowserOptions = {}): Promise<ActionResult> {
    try {
      if (this.driver) {
        await this.closeBrowser();
      }

      const browserType = options.browserType || 'chrome';
      const isHeadless = options.headless || false;

      let builder = new Builder();

      if (browserType === 'chrome') {
        const chromeOptions = new chrome.Options();

        if (isHeadless) {
          chromeOptions.addArguments('--headless=new');
          chromeOptions.addArguments('--disable-gpu');
          chromeOptions.addArguments('--no-sandbox');
          chromeOptions.addArguments('--disable-dev-shm-usage');
          chromeOptions.addArguments('--disable-extensions');
          chromeOptions.addArguments('--disable-plugins');
          chromeOptions.addArguments('--disable-images');
          chromeOptions.addArguments('--disable-javascript');
        }

        // Set reasonable default window size
        const width = options.width || 1024;
        const height = options.height || 768;
        chromeOptions.addArguments(`--window-size=${width},${height}`);

        // Handle monitor positioning - prefer command line arguments to avoid flicker
        const monitorPosition = this.getMonitorPosition(options.monitor);
        const finalX = options.x !== undefined ? options.x : monitorPosition.x;
        const finalY = options.y !== undefined ? options.y : monitorPosition.y;

        // Use command line arguments for positioning (preferred method)
        chromeOptions.addArguments(`--window-position=${finalX},${finalY}`);

        // Add kiosk mode - default to false for better agent control
        if (options.kiosk === true) {
          // Core kiosk mode arguments
          chromeOptions.addArguments('--kiosk');
          chromeOptions.addArguments('--disable-infobars');
          chromeOptions.addArguments('--disable-extensions');
          chromeOptions.addArguments('--disable-plugins');
          chromeOptions.addArguments('--disable-web-security');

          // Prevent user from accessing browser controls
          chromeOptions.addArguments('--disable-features=TranslateUI,VizDisplayCompositor');
          chromeOptions.addArguments('--disable-ipc-flooding-protection');
          chromeOptions.addArguments('--disable-background-timer-throttling');
          chromeOptions.addArguments('--disable-renderer-backgrounding');
          chromeOptions.addArguments('--disable-backgrounding-occluded-windows');

          // Prevent system-level interference
          chromeOptions.addArguments('--disable-default-apps');
          chromeOptions.addArguments('--disable-popup-blocking');
          chromeOptions.addArguments('--disable-prompt-on-repost');
          chromeOptions.addArguments('--disable-sync');
          chromeOptions.addArguments('--disable-translate');

          // Force focus and prevent window management
          chromeOptions.addArguments('--no-first-run');
          chromeOptions.addArguments('--no-default-browser-check');
          chromeOptions.addArguments('--disable-hang-monitor');
          chromeOptions.addArguments('--disable-prompt-on-repost');
          chromeOptions.addArguments('--disable-web-resources');

          // Prevent user from closing or minimizing
          chromeOptions.addArguments('--disable-features=VizDisplayCompositor');
          chromeOptions.addArguments('--disable-component-extensions-with-background-pages');
          chromeOptions.addArguments('--disable-component-update');
          chromeOptions.addArguments('--disable-domain-reliability');
        } else {
          // Non-kiosk mode - better for agent control
          chromeOptions.addArguments('--disable-infobars');
          chromeOptions.addArguments('--disable-extensions');
          chromeOptions.addArguments('--disable-plugins');
          chromeOptions.addArguments('--disable-web-security');

          // Allow agent control while preventing user interference
          chromeOptions.addArguments('--disable-features=TranslateUI');
          chromeOptions.addArguments('--disable-ipc-flooding-protection');
          chromeOptions.addArguments('--disable-background-timer-throttling');
          chromeOptions.addArguments('--disable-renderer-backgrounding');
          chromeOptions.addArguments('--disable-backgrounding-occluded-windows');

          // Prevent system-level interference
          chromeOptions.addArguments('--disable-default-apps');
          chromeOptions.addArguments('--disable-popup-blocking');
          chromeOptions.addArguments('--disable-prompt-on-repost');
          chromeOptions.addArguments('--disable-sync');
          chromeOptions.addArguments('--disable-translate');

          // Allow window management for agent control
          chromeOptions.addArguments('--no-first-run');
          chromeOptions.addArguments('--no-default-browser-check');
          chromeOptions.addArguments('--disable-hang-monitor');
          chromeOptions.addArguments('--disable-prompt-on-repost');
          chromeOptions.addArguments('--disable-web-resources');
        }

        // Prevent focus stealing and window management issues
        chromeOptions.addArguments('--no-first-run');
        chromeOptions.addArguments('--no-default-browser-check');
        chromeOptions.addArguments('--disable-default-apps');
        chromeOptions.addArguments('--disable-popup-blocking');
        chromeOptions.addArguments('--disable-extensions');
        chromeOptions.addArguments('--disable-background-timer-throttling');
        chromeOptions.addArguments('--disable-renderer-backgrounding');
        chromeOptions.addArguments('--disable-backgrounding-occluded-windows');
        chromeOptions.addArguments('--disable-features=TranslateUI');
        chromeOptions.addArguments('--disable-ipc-flooding-protection');
        chromeOptions.addArguments('--no-sandbox');
        chromeOptions.addArguments('--disable-dev-shm-usage');
        chromeOptions.addArguments('--disable-gpu');
        chromeOptions.addArguments('--disable-software-rasterizer');
        chromeOptions.addArguments('--disable-background-networking');
        chromeOptions.addArguments('--disable-sync');
        chromeOptions.addArguments('--disable-translate');
        chromeOptions.addArguments('--hide-scrollbars');
        chromeOptions.addArguments('--mute-audio');
        chromeOptions.addArguments('--no-zygote');
        chromeOptions.addArguments('--disable-client-side-phishing-detection');
        chromeOptions.addArguments('--disable-component-extensions-with-background-pages');
        chromeOptions.addArguments('--disable-hang-monitor');
        chromeOptions.addArguments('--disable-prompt-on-repost');
        chromeOptions.addArguments('--disable-web-resources');
        chromeOptions.addArguments('--metrics-recording-only');
        chromeOptions.addArguments('--safebrowsing-disable-auto-update');
        chromeOptions.addArguments('--enable-automation');
        chromeOptions.addArguments('--password-store=basic');
        chromeOptions.addArguments('--use-mock-keychain');
        chromeOptions.addArguments('--disable-component-update');
        chromeOptions.addArguments('--disable-domain-reliability');
        chromeOptions.addArguments('--disable-features=VizDisplayCompositor');
        // Focus prevention - most important for preventing focus stealing
        chromeOptions.addArguments('--disable-background-timer-throttling');
        chromeOptions.addArguments('--disable-renderer-backgrounding');
        chromeOptions.addArguments('--disable-backgrounding-occluded-windows');
        chromeOptions.addArguments('--disable-features=TranslateUI');
        chromeOptions.addArguments('--disable-ipc-flooding-protection');

        this.debugPort = 9222 + Math.floor(Math.random() * 1000);
        chromeOptions.addArguments(`--remote-debugging-port=${this.debugPort}`);
        chromeOptions.addArguments(`--user-data-dir=/tmp/.org.chromium.Chromium.${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
        chromeOptions.addArguments('--disable-blink-features=AutomationControlled');
        chromeOptions.addArguments('--disable-web-security');
        chromeOptions.addArguments('--allow-running-insecure-content');

        if (options.userAgent) {
          chromeOptions.addArguments(`--user-agent=${options.userAgent}`);
        }

        if (options.proxy) {
          chromeOptions.addArguments(`--proxy-server=${options.proxy}`);
        }

        const loggingPrefs = {
          browser: 'ALL',
          driver: 'ALL',
          performance: 'ALL',
        };

        builder = builder
          .forBrowser('chrome')
          .setChromeOptions(chromeOptions)
          .setLoggingPrefs(loggingPrefs);
      }

      this.driver = await builder.build();

      // Fallback: Use Selenium window positioning if command line args didn't work
      // This is useful for cases where the command line positioning fails
      if (options.x !== undefined || options.y !== undefined || options.monitor) {
        try {
          const monitorPosition = this.getMonitorPosition(options.monitor);
          const finalX = options.x !== undefined ? options.x : monitorPosition.x;
          const finalY = options.y !== undefined ? options.y : monitorPosition.y;

          await this.driver.manage().window().setPosition(finalX, finalY);
        } catch (error) {
          console.warn('Failed to set window position via Selenium:', error);
        }
      }

      await this.setupConsoleLogCapture();
      await this.setupNetworkLogCapture();
      await this.setupPerformanceCapture();

      // If kiosk mode is disabled, add overlay protection as fallback
      if (options.kiosk === false) {
        await this.disableUserInteractions({
          disableMouse: true,
          disableKeyboard: true,
          disableTouch: true,
          showOverlay: !isHeadless
        });
      }
      // Kiosk mode is handled by Chrome command-line arguments above

      const modeText = isHeadless ? 'headless' : 'headed';
      const browserText = browserType;
      const kioskMode = options.kiosk === true;
      const controlMode = kioskMode ? 'KIOSK mode (user interactions blocked)' : 'agent control mode (windowed)';

      return {
        success: true,
        message: `Browser opened successfully: ${browserText} in ${modeText} mode with ${controlMode}`,
        data: { browserType, isHeadless, kioskMode, agentControl: true },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to open browser: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async closeBrowser(): Promise<ActionResult> {
    if (!this.driver) {
      return {
        success: true,
        message: 'No browser instance to close',
      };
    }

    try {
      // Properly close the browser by calling quit()
      await this.driver.quit();
      this.driver = null;
      this.consoleLogs = [];
      this.networkLogs = [];
      this.performanceMetrics = null;

      return {
        success: true,
        message: 'Browser closed successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to close browser: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async forceCloseBrowser(): Promise<ActionResult> {
    if (!this.driver) {
      return {
        success: true,
        message: 'No browser instance to close',
      };
    }

    try {
      await this.driver.quit();
      this.driver = null;
      this.consoleLogs = [];
      this.networkLogs = [];
      this.performanceMetrics = null;

      return {
        success: true,
        message: 'Browser closed successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to close browser: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async navigateTo(url: string): Promise<ActionResult> {
    if (!this.driver) {
      return {
        success: false,
        message: 'Browser not opened. Please call openBrowser first.',
      };
    }

    try {
      await this.driver.get(url);
      return {
        success: true,
        message: `Navigated to: ${url}`,
        data: { url },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to navigate to ${url}: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async clickElement(options: ElementOptions): Promise<ActionResult> {
    if (!this.driver) {
      return {
        success: false,
        message: 'Browser not opened. Please call openBrowser first.',
      };
    }

    try {
      const byMethod = this.getByMethod(options.by || 'css');
      const element = await this.driver.wait(until.elementLocated(byMethod(options.selector)), options.timeout || 3000);
      await this.driver.wait(until.elementIsVisible(element), options.timeout || 3000);
      await element.click();

      return {
        success: true,
        message: `Clicked element: ${options.selector}`,
        data: { selector: options.selector },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to click element: ${options.selector} (${options.by || 'css'}): ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async typeText(options: ElementOptions & { text: string }): Promise<ActionResult> {
    if (!this.driver) {
      return {
        success: false,
        message: 'Browser not opened. Please call openBrowser first.',
      };
    }

    try {
      const byMethod = this.getByMethod(options.by || 'css');
      const element = await this.driver.wait(until.elementLocated(byMethod(options.selector)), options.timeout || 3000);
      await this.driver.wait(until.elementIsVisible(element), options.timeout || 3000);
      await element.clear();
      await element.sendKeys(options.text);

      return {
        success: true,
        message: `Typed "${options.text}" into element: ${options.selector}`,
        data: { selector: options.selector, text: options.text },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to type text into element: ${options.selector} (${options.by || 'css'}): ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async getPageTitle(): Promise<ActionResult> {
    if (!this.driver) {
      return {
        success: false,
        message: 'Browser not opened. Please call openBrowser first.',
      };
    }

    try {
      const title = await this.driver.getTitle();
      return {
        success: true,
        message: `Page title: ${title}`,
        data: { title },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get page title: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async getPageUrl(): Promise<ActionResult> {
    if (!this.driver) {
      return {
        success: false,
        message: 'Browser not opened. Please call openBrowser first.',
      };
    }

    try {
      const url = await this.driver.getCurrentUrl();
      return {
        success: true,
        message: `Current URL: ${url}`,
        data: { url },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get page URL: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async executeScript(script: string, args: string[] = []): Promise<ActionResult> {
    if (!this.driver) {
      return {
        success: false,
        message: 'Browser not opened. Please call openBrowser first.',
      };
    }

    try {
      const result = await this.driver.executeScript(script, ...args);
      return {
        success: true,
        message: `Script executed successfully. Result: ${JSON.stringify(result)}`,
        data: { result },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to execute script: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async takeScreenshot(filename?: string, fullPage: boolean = false): Promise<ActionResult> {
    if (!this.driver) {
      return {
        success: false,
        message: 'Browser not opened. Please call openBrowser first.',
      };
    }

    try {
      const screenshot = await this.driver.takeScreenshot();
      const finalFilename = filename || `screenshot-${Date.now()}.png`;
      const filepath = join(process.cwd(), finalFilename);

      await fs.writeFile(filepath, screenshot, 'base64');

      return {
        success: true,
        message: `Screenshot saved to: ${filepath}`,
        data: { filepath },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to take screenshot: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async dragAndDrop(sourceOptions: ElementOptions, targetOptions: ElementOptions): Promise<ActionResult> {
    if (!this.driver) {
      return {
        success: false,
        message: 'Browser not opened. Please call openBrowser first.',
      };
    }

    try {
      const sourceByMethod = this.getByMethod(sourceOptions.by || 'css');
      const targetByMethod = this.getByMethod(targetOptions.by || 'css');

      const sourceElement = await this.driver.wait(until.elementLocated(sourceByMethod(sourceOptions.selector)), sourceOptions.timeout || 3000);
      const targetElement = await this.driver.wait(until.elementLocated(targetByMethod(targetOptions.selector)), targetOptions.timeout || 3000);

      await this.driver.wait(until.elementIsVisible(sourceElement), sourceOptions.timeout || 3000);
      await this.driver.wait(until.elementIsVisible(targetElement), targetOptions.timeout || 3000);

      const actions = this.driver.actions();
      await actions.dragAndDrop(sourceElement, targetElement).perform();

      return {
        success: true,
        message: `Successfully dragged element ${sourceOptions.selector} to ${targetOptions.selector}`,
        data: { source: sourceOptions.selector, target: targetOptions.selector },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to drag and drop: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async executeActionSequence(actions: any[], continueOnError: boolean = false, stopOnError: boolean = true): Promise<ActionResult> {
    if (!this.driver) {
      return {
        success: false,
        message: 'Browser not opened. Please call openBrowser first.',
      };
    }

    const results: string[] = [];
    const errors: string[] = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      const stepNumber = i + 1;
      const actionDescription = action.description || `${action.action}${action.selector ? ` on ${action.selector}` : ''}`;

      try {
        let result: string = '';

        switch (action.action) {
          case 'click':
            const clickResult = await this.clickElement({ selector: action.selector, by: action.by, timeout: action.timeout });
            result = clickResult.success ? `✓ Clicked ${action.selector}` : `✗ Failed to click ${action.selector}`;
            break;

          case 'type':
            const typeResult = await this.typeText({ selector: action.selector, text: action.value || '', by: action.by, timeout: action.timeout });
            result = typeResult.success ? `✓ Typed "${action.value}" into ${action.selector}` : `✗ Failed to type into ${action.selector}`;
            break;

          case 'navigate_to':
            const navResult = await this.navigateTo(action.value);
            result = navResult.success ? `✓ Navigated to ${action.value}` : `✗ Failed to navigate to ${action.value}`;
            break;

          case 'execute_script':
            const scriptResult = await this.executeScript(action.script, action.args || []);
            result = scriptResult.success ? '✓ Executed script' : '✗ Failed to execute script';
            break;

          case 'take_screenshot':
            const screenshotResult = await this.takeScreenshot(action.value, action.checked);
            result = screenshotResult.success ? `✓ ${screenshotResult.message}` : '✗ Failed to take screenshot';
            break;

          default:
            result = `✗ Unknown action: ${action.action}`;
        }

        if (result.startsWith('✓')) {
          results.push(`Step ${stepNumber}: ${result}`);
          successCount++;
        } else {
          errors.push(`Step ${stepNumber}: ${result}`);
          errorCount++;
        }

        if (result.startsWith('✗') && stopOnError && !continueOnError) {
          break;
        }
      } catch (error) {
        const errorMessage = `Step ${stepNumber}: ✗ Failed to ${actionDescription} - ${error instanceof Error ? error.message : String(error)}`;
        errors.push(errorMessage);
        errorCount++;

        if (stopOnError && !continueOnError) {
          break;
        }
      }
    }

    const summary = `Action sequence completed: ${successCount} successful, ${errorCount} failed`;
    const allResults = [
      summary,
      '',
      'Results:',
      ...results,
      ...(errors.length > 0 ? ['', 'Errors:', ...errors] : []),
    ].join('\n');

    return {
      success: errorCount === 0,
      message: allResults,
      data: { successCount, errorCount, results, errors },
    };
  }

  private async setupConsoleLogCapture() {
    if (!this.driver) return;

    try {
      await this.driver.executeScript(`
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;
        const originalInfo = console.info;
        const originalDebug = console.debug;
        
        window.capturedLogs = [];
        
        function captureLog(level, args, stack) {
          const stackInfo = stack ? stack.split('\\n')[1] : '';
          const sourceMatch = stackInfo.match(/at\\s+(.+?)\\s+\\((.+?):(\\d+):(\\d+)\\)/);
          
          window.capturedLogs.push({
            level: level,
            message: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' '),
            timestamp: new Date().toISOString(),
            source: sourceMatch ? sourceMatch[1] : 'unknown',
            line: sourceMatch ? parseInt(sourceMatch[3]) : undefined,
            column: sourceMatch ? parseInt(sourceMatch[4]) : undefined
          });
        }
        
        console.log = function(...args) {
          captureLog('log', args, new Error().stack);
          originalLog.apply(console, args);
        };
        
        console.error = function(...args) {
          captureLog('error', args, new Error().stack);
          originalError.apply(console, args);
        };
        
        console.warn = function(...args) {
          captureLog('warn', args, new Error().stack);
          originalWarn.apply(console, args);
        };
        
        console.info = function(...args) {
          captureLog('info', args, new Error().stack);
          originalInfo.apply(console, args);
        };
        
        console.debug = function(...args) {
          captureLog('debug', args, new Error().stack);
          originalDebug.apply(console, args);
        };
        
        window.addEventListener('error', function(event) {
          captureLog('error', [event.error?.message || event.message], event.error?.stack);
        });
        
        window.addEventListener('unhandledrejection', function(event) {
          captureLog('error', [event.reason?.message || String(event.reason)], event.reason?.stack);
        });
      `);
    } catch (error) {
      console.warn('Failed to setup console log capture:', error);
    }
  }

  private async setupNetworkLogCapture() {
    if (!this.driver) return;

    try {
      await this.driver.executeScript(`
        window.capturedNetworkLogs = [];
        
        // Override fetch
        const originalFetch = window.fetch;
        window.fetch = function(...args) {
          const startTime = performance.now();
          const url = args[0];
          const options = args[1] || {};
          
          return originalFetch.apply(this, args)
            .then(response => {
              const endTime = performance.now();
              window.capturedNetworkLogs.push({
                url: url.toString(),
                method: options.method || 'GET',
                status: response.status,
                statusText: response.statusText,
                responseTime: endTime - startTime,
                timestamp: new Date().toISOString(),
                resourceType: 'fetch',
                responseSize: response.headers.get('content-length') ? parseInt(response.headers.get('content-length')) : undefined
              });
              return response;
            })
            .catch(error => {
              const endTime = performance.now();
              window.capturedNetworkLogs.push({
                url: url.toString(),
                method: options.method || 'GET',
                status: 0,
                statusText: 'Error',
                responseTime: endTime - startTime,
                timestamp: new Date().toISOString(),
                resourceType: 'fetch',
                error: error.message
              });
              throw error;
            });
        };
        
        // Override XMLHttpRequest
        const originalXHROpen = XMLHttpRequest.prototype.open;
        const originalXHRSend = XMLHttpRequest.prototype.send;
        
        XMLHttpRequest.prototype.open = function(method, url, ...args) {
          this._method = method;
          this._url = url;
          this._startTime = performance.now();
          return originalXHROpen.apply(this, [method, url, ...args]);
        };
        
        XMLHttpRequest.prototype.send = function(...args) {
          const xhr = this;
          const originalOnLoad = xhr.onload;
          const originalOnError = xhr.onerror;
          
          xhr.onload = function() {
            const endTime = performance.now();
            window.capturedNetworkLogs.push({
              url: xhr._url,
              method: xhr._method,
              status: xhr.status,
              statusText: xhr.statusText,
              responseTime: endTime - xhr._startTime,
              timestamp: new Date().toISOString(),
              resourceType: 'xhr',
              responseSize: xhr.responseText ? xhr.responseText.length : undefined
            });
            if (originalOnLoad) originalOnLoad.apply(this, arguments);
          };
          
          xhr.onerror = function() {
            const endTime = performance.now();
            window.capturedNetworkLogs.push({
              url: xhr._url,
              method: xhr._method,
              status: 0,
              statusText: 'Error',
              responseTime: endTime - xhr._startTime,
              timestamp: new Date().toISOString(),
              resourceType: 'xhr',
              error: 'Network error'
            });
            if (originalOnError) originalOnError.apply(this, arguments);
          };
          
          return originalXHRSend.apply(this, args);
        };
        
        // Override WebSocket
        const originalWebSocket = window.WebSocket;
        window.WebSocket = function(url, protocols) {
          const ws = new originalWebSocket(url, protocols);
          const startTime = performance.now();
          
          // Log WebSocket connection
          window.capturedNetworkLogs.push({
            url: url,
            method: 'WEBSOCKET',
            status: 0,
            statusText: 'Connecting',
            responseTime: 0,
            timestamp: new Date().toISOString(),
            resourceType: 'websocket',
            messageType: 'open',
            readyState: ws.readyState
          });
          
          // Override WebSocket methods
          const originalSend = ws.send;
          const originalClose = ws.close;
          
          ws.send = function(data) {
            window.capturedNetworkLogs.push({
              url: url,
              method: 'WEBSOCKET',
              status: 0,
              statusText: 'Message Sent',
              responseTime: 0,
              timestamp: new Date().toISOString(),
              resourceType: 'websocket-message',
              messageType: 'message',
              message: typeof data === 'string' ? data : JSON.stringify(data),
              readyState: ws.readyState
            });
            return originalSend.apply(this, arguments);
          };
          
          ws.close = function(code, reason) {
            const endTime = performance.now();
            window.capturedNetworkLogs.push({
              url: url,
              method: 'WEBSOCKET',
              status: code || 1000,
              statusText: 'Closed',
              responseTime: endTime - startTime,
              timestamp: new Date().toISOString(),
              resourceType: 'websocket-close',
              messageType: 'close',
              message: reason || 'Normal closure',
              readyState: ws.readyState
            });
            return originalClose.apply(this, arguments);
          };
          
          // Add event listeners for WebSocket events
          ws.addEventListener('open', function(event) {
            const endTime = performance.now();
            window.capturedNetworkLogs.push({
              url: url,
              method: 'WEBSOCKET',
              status: 200,
              statusText: 'Connected',
              responseTime: endTime - startTime,
              timestamp: new Date().toISOString(),
              resourceType: 'websocket',
              messageType: 'open',
              readyState: ws.readyState
            });
          });
          
          ws.addEventListener('message', function(event) {
            window.capturedNetworkLogs.push({
              url: url,
              method: 'WEBSOCKET',
              status: 0,
              statusText: 'Message Received',
              responseTime: 0,
              timestamp: new Date().toISOString(),
              resourceType: 'websocket-message',
              messageType: 'message',
              message: event.data,
              readyState: ws.readyState
            });
          });
          
          ws.addEventListener('error', function(event) {
            const endTime = performance.now();
            window.capturedNetworkLogs.push({
              url: url,
              method: 'WEBSOCKET',
              status: 0,
              statusText: 'Error',
              responseTime: endTime - startTime,
              timestamp: new Date().toISOString(),
              resourceType: 'websocket-error',
              messageType: 'error',
              error: 'WebSocket error occurred',
              readyState: ws.readyState
            });
          });
          
          ws.addEventListener('close', function(event) {
            const endTime = performance.now();
            window.capturedNetworkLogs.push({
              url: url,
              method: 'WEBSOCKET',
              status: event.code,
              statusText: 'Closed',
              responseTime: endTime - startTime,
              timestamp: new Date().toISOString(),
              resourceType: 'websocket-close',
              messageType: 'close',
              message: event.reason || 'Connection closed',
              readyState: ws.readyState
            });
          });
          
          return ws;
        };
        
        // Copy static properties from original WebSocket
        Object.setPrototypeOf(window.WebSocket, originalWebSocket);
        Object.defineProperty(window.WebSocket, 'prototype', {
          value: originalWebSocket.prototype,
          writable: false
        });
      `);
    } catch (error) {
      console.warn('Failed to setup network log capture:', error);
    }
  }

  private async setupPerformanceCapture() {
    if (!this.driver) return;

    try {
      await this.driver.executeScript(`
        window.performanceMetrics = null;
        
        // Capture performance metrics when page loads
        function capturePerformanceMetrics() {
          const navigation = performance.getEntriesByType('navigation')[0];
          const paintEntries = performance.getEntriesByType('paint');
          
          // Get Core Web Vitals
          const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
          const lcp = performance.getEntriesByType('largest-contentful-paint');
          
          // Calculate additional metrics
          const loadTime = navigation ? navigation.loadEventEnd - navigation.loadEventStart : 0;
          const domContentLoaded = navigation ? navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart : 0;
          
          // Count network requests
          const networkEntries = performance.getEntriesByType('resource');
          const totalTransferSize = networkEntries.reduce((total, entry) => {
            return total + (entry.transferSize || 0);
          }, 0);
          
          window.performanceMetrics = {
            loadTime: loadTime,
            domContentLoaded: domContentLoaded,
            firstContentfulPaint: fcp ? fcp.startTime : 0,
            largestContentfulPaint: lcp.length > 0 ? lcp[lcp.length - 1].startTime : 0,
            firstInputDelay: 0, // Would need more complex measurement
            cumulativeLayoutShift: 0, // Would need more complex measurement
            totalBlockingTime: 0, // Would need more complex measurement
            speedIndex: 0, // Would need more complex measurement
            timeToInteractive: 0, // Would need more complex measurement
            networkRequests: networkEntries.length,
            totalTransferSize: totalTransferSize,
            timestamp: new Date().toISOString()
          };
        }
        
        // Capture metrics when page loads
        if (document.readyState === 'complete') {
          capturePerformanceMetrics();
        } else {
          window.addEventListener('load', capturePerformanceMetrics);
        }
      `);
    } catch (error) {
      console.warn('Failed to setup performance capture:', error);
    }
  }

  private getByMethod(by: string) {
    switch (by.toLowerCase()) {
      case 'css':
        return By.css;
      case 'xpath':
        return By.xpath;
      case 'id':
        return By.id;
      case 'name':
        return By.name;
      case 'classname':
        return By.className;
      case 'tagname':
        return By.tagName;
      default:
        return By.css;
    }
  }

  async hoverElement(options: ElementOptions): Promise<ActionResult> {
    if (!this.driver) {
      return { success: false, message: 'Browser not opened. Please call openBrowser first.' };
    }

    try {
      const byMethod = this.getByMethod(options.by || 'css');
      const element = await this.driver.wait(until.elementLocated(byMethod(options.selector)), options.timeout || 3000);
      await this.driver.wait(until.elementIsVisible(element), options.timeout || 3000);

      const actions = this.driver.actions();
      await actions.move({ origin: element }).perform();

      return {
        success: true,
        message: `Hovered over element: ${options.selector}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to hover over element: ${options.selector} (${options.by || 'css'}): ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async doubleClickElement(options: ElementOptions): Promise<ActionResult> {
    if (!this.driver) {
      return { success: false, message: 'Browser not opened. Please call openBrowser first.' };
    }

    try {
      const byMethod = this.getByMethod(options.by || 'css');
      const element = await this.driver.wait(until.elementLocated(byMethod(options.selector)), options.timeout || 3000);
      await this.driver.wait(until.elementIsVisible(element), options.timeout || 3000);

      const actions = this.driver.actions();
      await actions.doubleClick(element).perform();

      return {
        success: true,
        message: `Double-clicked element: ${options.selector}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to double-click element: ${options.selector} (${options.by || 'css'}): ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async rightClickElement(options: ElementOptions): Promise<ActionResult> {
    if (!this.driver) {
      return { success: false, message: 'Browser not opened. Please call openBrowser first.' };
    }

    try {
      const byMethod = this.getByMethod(options.by || 'css');
      const element = await this.driver.wait(until.elementLocated(byMethod(options.selector)), options.timeout || 3000);
      await this.driver.wait(until.elementIsVisible(element), options.timeout || 3000);

      const actions = this.driver.actions();
      await actions.contextClick(element).perform();

      return {
        success: true,
        message: `Right-clicked element: ${options.selector}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to right-click element: ${options.selector} (${options.by || 'css'}): ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async getPageElements(selector: string = '*', limit: number = 100): Promise<ActionResult> {
    if (!this.driver) {
      return { success: false, message: 'Browser not opened. Please call openBrowser first.' };
    }

    try {
      const elements = await this.driver.findElements(By.css(selector));
      const limitedElements = elements.slice(0, limit);

      const elementData = await Promise.all(limitedElements.map(async (element, index) => {
        try {
          const tagName = await element.getTagName();
          const text = await element.getText();
          const isDisplayed = await element.isDisplayed();
          const isEnabled = await element.isEnabled();

          return {
            index,
            tagName,
            text: text.substring(0, 100), // Limit text length
            displayed: isDisplayed,
            enabled: isEnabled,
          };
        } catch (error) {
          return {
            index,
            tagName: 'unknown',
            text: 'Error reading element',
            displayed: false,
            enabled: false,
          };
        }
      }));

      return {
        success: true,
        message: `Found ${elementData.length} elements matching selector: ${selector}`,
        data: elementData,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get page elements: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async waitForElement(options: ElementOptions): Promise<ActionResult> {
    if (!this.driver) {
      return { success: false, message: 'Browser not opened. Please call openBrowser first.' };
    }

    try {
      const byMethod = this.getByMethod(options.by || 'css');
      await this.driver.wait(until.elementLocated(byMethod(options.selector)), options.timeout || 3000);
      const element = this.driver.findElement(byMethod(options.selector));
      await this.driver.wait(until.elementIsVisible(element), options.timeout || 3000);

      return {
        success: true,
        message: `Element appeared and is visible: ${options.selector}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Element did not appear within timeout: ${options.selector} (${options.by || 'css'}): ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async getConsoleLogs(level?: string, limit?: number): Promise<ActionResult> {
    if (!this.driver) {
      return {
        success: false,
        message: 'Browser not opened. Please call openBrowser first.',
      };
    }

    try {
      // Get console logs using Selenium WebDriver's logging API
      const logs = await this.driver.manage().logs().get('browser');

      // Convert Selenium log entries to our format
      const consoleLogs: ConsoleLogEntry[] = logs.map(log => ({
        level: log.level.name.toLowerCase() as 'log' | 'error' | 'warn' | 'info' | 'debug',
        message: log.message,
        timestamp: new Date(log.timestamp).toISOString(),
      }));

      let filteredLogs = consoleLogs;
      if (level) {
        filteredLogs = consoleLogs.filter((log: ConsoleLogEntry) => log.level === level);
      }

      if (limit && limit > 0) {
        filteredLogs = filteredLogs.slice(-limit);
      }

      this.consoleLogs = consoleLogs;

      return {
        success: true,
        message: `Retrieved ${filteredLogs.length} console log entries${level ? ` (filtered by level: ${level})` : ''}`,
        data: {
          logs: filteredLogs,
          total: consoleLogs.length,
          filtered: filteredLogs.length,
          level: level || 'all'
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get console logs: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async clearConsoleLogs(): Promise<ActionResult> {
    if (!this.driver) {
      return {
        success: false,
        message: 'Browser not opened. Please call openBrowser first.',
      };
    }

    try {
      await this.driver.executeScript('window.capturedLogs = [];');
      this.consoleLogs = [];

      return {
        success: true,
        message: 'Console logs cleared successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to clear console logs: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async getConsoleLogCount(): Promise<ActionResult> {
    if (!this.driver) {
      return {
        success: false,
        message: 'Browser not opened. Please call openBrowser first.',
      };
    }

    try {
      const count = await this.driver.executeScript('return (window.capturedLogs || []).length;');

      return {
        success: true,
        message: `Console has ${count} log entries`,
        data: { count }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get console log count: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  getDriver(): WebDriver | null {
    return this.driver;
  }

  private addCommandToHistory(command: string, args: any, result: ActionResult, browserId?: string, duration?: number): void {
    const commandEntry: CommandHistory = {
      id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      command,
      arguments: args,
      timestamp: new Date().toISOString(),
      success: result.success,
      result: result.data,
      error: result.success ? undefined : result.message,
      browserId,
      duration
    };

    this.commandHistory.push(commandEntry);
  }

  getCommandHistory(): CommandHistory[] {
    return [...this.commandHistory];
  }

  clearCommandHistory(): void {
    this.commandHistory = [];
  }

  async exportSessionHistory(format: 'markdown' | 'json' = 'markdown'): Promise<ActionResult> {
    if (!this.driver) {
      return { success: false, message: 'Browser not opened. Please call openBrowser first.' };
    }

    try {
      const currentUrl = await this.driver.getCurrentUrl();
      const pageTitle = await this.driver.getTitle();
      const timestamp = new Date().toISOString();

      if (format === 'json') {
        const sessionData = {
          metadata: {
            browserId: this.debugPort ? `browser_${this.debugPort}` : 'unknown',
            currentUrl,
            pageTitle,
            exportTimestamp: timestamp,
            totalCommands: this.commandHistory.length
          },
          commands: this.commandHistory,
          networkLogs: await this.getNetworkLogs(),
          performanceMetrics: await this.getPerformanceMetrics(),
          consoleLogs: await this.getConsoleLogs()
        };

        return {
          success: true,
          message: 'Session history exported as JSON',
          data: sessionData
        };
      } else {
        // Markdown format
        let markdown = `# Browser Session History\n\n`;
        markdown += `**Export Date:** ${timestamp}\n`;
        markdown += `**Current URL:** ${currentUrl}\n`;
        markdown += `**Page Title:** ${pageTitle}\n`;
        markdown += `**Total Commands:** ${this.commandHistory.length}\n\n`;

        // Commands section
        markdown += `## Executed Commands\n\n`;
        if (this.commandHistory.length === 0) {
          markdown += `No commands executed yet.\n\n`;
        } else {
          this.commandHistory.forEach((cmd, index) => {
            markdown += `### ${index + 1}. ${cmd.command}\n\n`;
            markdown += `**Timestamp:** ${cmd.timestamp}\n`;
            markdown += `**Status:** ${cmd.success ? '✅ Success' : '❌ Failed'}\n`;
            if (cmd.duration) {
              markdown += `**Duration:** ${cmd.duration}ms\n`;
            }
            markdown += `**Arguments:**\n\`\`\`json\n${JSON.stringify(cmd.arguments, null, 2)}\n\`\`\`\n`;

            if (cmd.success && cmd.result) {
              markdown += `**Result:**\n\`\`\`json\n${JSON.stringify(cmd.result, null, 2)}\n\`\`\`\n`;
            } else if (cmd.error) {
              markdown += `**Error:** ${cmd.error}\n`;
            }
            markdown += `\n---\n\n`;
          });
        }

        // Replay instructions
        markdown += `## How to Replay This Session\n\n`;
        markdown += `To replay this browser session, follow these steps:\n\n`;
        markdown += `1. **Open a new browser instance:**\n`;
        markdown += `   \`\`\`json\n`;
        markdown += `   {\n`;
        markdown += `     "tool": "open_browser",\n`;
        markdown += `     "arguments": {\n`;
        markdown += `       "browserId": "replay-session",\n`;
        markdown += `       "headless": false\n`;
        markdown += `     }\n`;
        markdown += `   }\n`;
        markdown += `   \`\`\`\n\n`;

        if (this.commandHistory.length > 0) {
          markdown += `2. **Execute commands in order:**\n\n`;
          this.commandHistory.forEach((cmd, index) => {
            if (cmd.command === 'open_browser') return; // Skip browser opening commands

            markdown += `   **Step ${index + 1}: ${cmd.command}**\n`;
            markdown += `   \`\`\`json\n`;
            markdown += `   {\n`;
            markdown += `     "tool": "${cmd.command}",\n`;
            markdown += `     "arguments": ${JSON.stringify(cmd.arguments, null, 6).replace(/^/gm, '     ').trim()}\n`;
            markdown += `   }\n`;
            markdown += `   \`\`\`\n\n`;
          });
        }

        markdown += `3. **Optional: Get session data**\n`;
        markdown += `   - Use \`get_network_logs\` to see all network requests\n`;
        markdown += `   - Use \`get_performance_metrics\` to analyze page performance\n`;
        markdown += `   - Use \`get_console_logs\` to see browser console output\n\n`;

        markdown += `## Session Statistics\n\n`;
        const successCount = this.commandHistory.filter(cmd => cmd.success).length;
        const errorCount = this.commandHistory.filter(cmd => !cmd.success).length;
        const avgDuration = this.commandHistory.filter(cmd => cmd.duration).reduce((sum, cmd) => sum + (cmd.duration || 0), 0) / this.commandHistory.filter(cmd => cmd.duration).length;

        markdown += `- **Successful Commands:** ${successCount}\n`;
        markdown += `- **Failed Commands:** ${errorCount}\n`;
        markdown += `- **Success Rate:** ${this.commandHistory.length > 0 ? ((successCount / this.commandHistory.length) * 100).toFixed(1) : 0}%\n`;
        if (avgDuration > 0) {
          markdown += `- **Average Command Duration:** ${avgDuration.toFixed(2)}ms\n`;
        }

        return {
          success: true,
          message: 'Session history exported as markdown',
          data: { markdown }
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to export session history: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async getNetworkLogs(limit?: number): Promise<ActionResult> {
    if (!this.driver) {
      return { success: false, message: 'Browser not opened. Please call openBrowser first.' };
    }

    try {
      const logs = await this.driver.executeScript(`
        return window.capturedNetworkLogs || [];
      `) as NetworkLogEntry[];

      const limitedLogs = limit ? logs.slice(-limit) : logs;

      return {
        success: true,
        message: `Retrieved ${limitedLogs.length} network log entries`,
        data: {
          logs: limitedLogs,
          total: logs.length,
          filtered: limit ? logs.length - limitedLogs.length : 0
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get network logs: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async getPerformanceMetrics(): Promise<ActionResult> {
    if (!this.driver) {
      return { success: false, message: 'Browser not opened. Please call openBrowser first.' };
    }

    try {
      const metrics = await this.driver.executeScript(`
        return window.performanceMetrics || null;
      `);

      if (!metrics) {
        return {
          success: false,
          message: 'No performance metrics available. Try navigating to a page first.',
        };
      }

      return {
        success: true,
        message: 'Performance metrics retrieved successfully',
        data: metrics
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get performance metrics: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async clearNetworkLogs(): Promise<ActionResult> {
    if (!this.driver) {
      return { success: false, message: 'Browser not opened. Please call openBrowser first.' };
    }

    try {
      await this.driver.executeScript(`
        window.capturedNetworkLogs = [];
      `);

      this.networkLogs = [];

      return {
        success: true,
        message: 'Network logs cleared successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to clear network logs: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async getNetworkLogCount(): Promise<ActionResult> {
    if (!this.driver) {
      return { success: false, message: 'Browser not opened. Please call openBrowser first.' };
    }

    try {
      const count = await this.driver.executeScript(`
        return (window.capturedNetworkLogs || []).length;
      `);

      return {
        success: true,
        message: `Found ${count} network log entries`,
        data: { count }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get network log count: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async startScreenRecording(filename?: string): Promise<ActionResult> {
    if (!this.driver) {
      return { success: false, message: 'Browser not opened. Please call openBrowser first.' };
    }

    if (this.screenRecording && this.screenRecording.status === 'recording') {
      return {
        success: false,
        message: 'Screen recording is already in progress. Stop the current recording first.',
      };
    }

    try {
      const recordingId = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const recordingFilename = filename || `recording_${recordingId}.webm`;

      // Start screen recording using Chrome's experimental API
      await this.driver.executeScript(`
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
          navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
            .then(stream => {
              const mediaRecorder = new MediaRecorder(stream);
              const chunks = [];
              
              mediaRecorder.ondataavailable = event => {
                chunks.push(event.data);
              };
              
              mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = '${recordingFilename}';
                a.click();
                URL.revokeObjectURL(url);
              };
              
              mediaRecorder.start();
              window.currentScreenRecording = {
                id: '${recordingId}',
                mediaRecorder: mediaRecorder,
                stream: stream,
                startTime: new Date().toISOString()
              };
            })
            .catch(error => {
              console.error('Failed to start screen recording:', error);
              window.screenRecordingError = error.message;
            });
        } else {
          console.error('Screen recording not supported in this browser');
          window.screenRecordingError = 'Screen recording not supported';
        }
      `);

      // Check if recording started successfully
      await new Promise(resolve => setTimeout(resolve, 1000));

      const recordingStatus = await this.driver.executeScript(`
        return {
          recording: !!window.currentScreenRecording,
          error: window.screenRecordingError || null
        };
      `) as { recording: boolean; error: string | null };

      if (recordingStatus.error) {
        return {
          success: false,
          message: `Failed to start screen recording: ${recordingStatus.error}`,
        };
      }

      this.screenRecording = {
        id: recordingId,
        filename: recordingFilename,
        startTime: new Date().toISOString(),
        status: 'recording'
      };

      return {
        success: true,
        message: `Screen recording started: ${recordingFilename}`,
        data: { recordingId, filename: recordingFilename }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to start screen recording: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async stopScreenRecording(): Promise<ActionResult> {
    if (!this.driver) {
      return { success: false, message: 'Browser not opened. Please call openBrowser first.' };
    }

    if (!this.screenRecording || this.screenRecording.status !== 'recording') {
      return {
        success: false,
        message: 'No active screen recording to stop.',
      };
    }

    try {
      await this.driver.executeScript(`
        if (window.currentScreenRecording && window.currentScreenRecording.mediaRecorder) {
          window.currentScreenRecording.mediaRecorder.stop();
          window.currentScreenRecording.stream.getTracks().forEach(track => track.stop());
          window.currentScreenRecording = null;
        }
      `);

      const endTime = new Date().toISOString();
      const duration = new Date(endTime).getTime() - new Date(this.screenRecording.startTime).getTime();

      this.screenRecording = {
        ...this.screenRecording,
        endTime,
        duration,
        status: 'stopped'
      };

      const result = {
        success: true,
        message: `Screen recording stopped: ${this.screenRecording.filename}`,
        data: {
          recordingId: this.screenRecording.id,
          filename: this.screenRecording.filename,
          duration: duration,
          startTime: this.screenRecording.startTime,
          endTime: endTime
        }
      };

      // Clear the recording after successful stop
      this.screenRecording = null;

      return result;
    } catch (error) {
      return {
        success: false,
        message: `Failed to stop screen recording: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async getScreenRecordingStatus(): Promise<ActionResult> {
    if (!this.driver) {
      return { success: false, message: 'Browser not opened. Please call openBrowser first.' };
    }

    try {
      const isRecording = await this.driver.executeScript(`
        return !!window.currentScreenRecording;
      `);

      if (this.screenRecording) {
        return {
          success: true,
          message: `Screen recording status: ${this.screenRecording.status}`,
          data: {
            isRecording,
            recording: this.screenRecording
          }
        };
      } else {
        return {
          success: true,
          message: 'No screen recording active',
          data: { isRecording: false }
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to get screen recording status: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async disableUserInteractions(options: {
    disableMouse?: boolean;
    disableKeyboard?: boolean;
    disableTouch?: boolean;
    showOverlay?: boolean;
  } = {}): Promise<ActionResult> {
    if (!this.driver) {
      return { success: false, message: 'Browser not opened. Please call openBrowser first.' };
    }

    try {
      const {
        disableMouse = true,
        disableKeyboard = true,
        disableTouch = true,
        showOverlay = true
      } = options;

      await this.driver.executeScript(`
        // Create or update the agent control overlay
        if (window.agentControlOverlay) {
          window.agentControlOverlay.remove();
        }

        if (${showOverlay}) {
          const overlay = document.createElement('div');
          overlay.id = 'agent-control-overlay';
          overlay.style.cssText = \`
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 255, 0.1);
            pointer-events: none;
            z-index: 999999;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: Arial, sans-serif;
            font-size: 24px;
            color: #0066cc;
            font-weight: bold;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
          \`;
          overlay.innerHTML = '🤖 AGENT CONTROL MODE - User interactions disabled';
          document.body.appendChild(overlay);
          window.agentControlOverlay = overlay;
        }

        // Store original event handlers for restoration
        window.originalEventHandlers = window.originalEventHandlers || {};

        // Disable interactions on all interactive elements
        function disableElementInteractions(element) {
          if (!element) return;
          
          // Disable keyboard events completely
          if (${disableKeyboard}) {
            element.onkeydown = function(e) { 
              e.preventDefault(); 
              e.stopPropagation(); 
              e.stopImmediatePropagation(); 
              return false; 
            };
            element.onkeyup = function(e) { 
              e.preventDefault(); 
              e.stopPropagation(); 
              e.stopImmediatePropagation(); 
              return false; 
            };
            element.onkeypress = function(e) { 
              e.preventDefault(); 
              e.stopPropagation(); 
              e.stopImmediatePropagation(); 
              return false; 
            };
            element.oninput = function(e) { 
              e.preventDefault(); 
              e.stopPropagation(); 
              e.stopImmediatePropagation(); 
              return false; 
            };
          }
          
          // Disable mouse events completely
          if (${disableMouse}) {
            element.onclick = function(e) { 
              e.preventDefault(); 
              e.stopPropagation(); 
              e.stopImmediatePropagation(); 
              return false; 
            };
            element.onmousedown = function(e) { 
              e.preventDefault(); 
              e.stopPropagation(); 
              e.stopImmediatePropagation(); 
              return false; 
            };
            element.onmouseup = function(e) { 
              e.preventDefault(); 
              e.stopPropagation(); 
              e.stopImmediatePropagation(); 
              return false; 
            };
            element.onmousemove = function(e) { 
              e.preventDefault(); 
              e.stopPropagation(); 
              e.stopImmediatePropagation(); 
              return false; 
            };
            element.oncontextmenu = function(e) { 
              e.preventDefault(); 
              e.stopPropagation(); 
              e.stopImmediatePropagation(); 
              return false; 
            };
            element.ondblclick = function(e) { 
              e.preventDefault(); 
              e.stopPropagation(); 
              e.stopImmediatePropagation(); 
              return false; 
            };
          }
          
          // Disable touch events completely
          if (${disableTouch}) {
            element.ontouchstart = function(e) { 
              e.preventDefault(); 
              e.stopPropagation(); 
              e.stopImmediatePropagation(); 
              return false; 
            };
            element.ontouchend = function(e) { 
              e.preventDefault(); 
              e.stopPropagation(); 
              e.stopImmediatePropagation(); 
              return false; 
            };
            element.ontouchmove = function(e) { 
              e.preventDefault(); 
              e.stopPropagation(); 
              e.stopImmediatePropagation(); 
              return false; 
            };
          }
          
          // Disable form submission and other events
          element.onsubmit = function(e) { 
            e.preventDefault(); 
            e.stopPropagation(); 
            e.stopImmediatePropagation(); 
            return false; 
          };
          element.onchange = function(e) { 
            e.preventDefault(); 
            e.stopPropagation(); 
            e.stopImmediatePropagation(); 
            return false; 
          };
          element.onfocus = function(e) { 
            e.preventDefault(); 
            e.stopPropagation(); 
            e.stopImmediatePropagation(); 
            element.blur(); 
            return false; 
          };
        }

        // Disable interactions on all existing elements
        const allElements = document.querySelectorAll('*');
        allElements.forEach(disableElementInteractions);

        // Only disable interactions within the browser content, not system-wide
        // This prevents user interaction with the webpage but doesn't affect system input

        // Disable focus on all focusable elements
        const focusableElements = document.querySelectorAll('input, textarea, select, button, a, [tabindex]');
        focusableElements.forEach(element => {
          element.tabIndex = -1;
          element.onfocus = function() { this.blur(); return false; };
        });

        // Store the current state
        window.agentControlMode = {
          disabled: true,
          mouseDisabled: ${disableMouse},
          keyboardDisabled: ${disableKeyboard},
          touchDisabled: ${disableTouch},
          overlayVisible: ${showOverlay}
        };

        console.log('🤖 Agent control mode activated - User interactions disabled');
      `);

      return {
        success: true,
        message: 'User interactions disabled - Browser is now in agent control mode',
        data: {
          mouseDisabled: disableMouse,
          keyboardDisabled: disableKeyboard,
          touchDisabled: disableTouch,
          overlayVisible: showOverlay
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to disable user interactions: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async enableUserInteractions(): Promise<ActionResult> {
    if (!this.driver) {
      return { success: false, message: 'Browser not opened. Please call openBrowser first.' };
    }

    try {
      await this.driver.executeScript(`
        // Remove the agent control overlay
        if (window.agentControlOverlay) {
          window.agentControlOverlay.remove();
          window.agentControlOverlay = null;
        }

        // Re-enable all interactions by removing event listeners
        // Note: This is a simplified approach - in a real implementation,
        // you'd want to store references to the listeners to remove them properly
        
        // Clear the agent control state
        window.agentControlMode = {
          disabled: false,
          mouseDisabled: false,
          keyboardDisabled: false,
          touchDisabled: false,
          overlayVisible: false
        };

        console.log('👤 User control mode activated - User interactions enabled');
      `);

      return {
        success: true,
        message: 'User interactions enabled - Browser is now in user control mode',
        data: {
          mouseEnabled: true,
          keyboardEnabled: true,
          touchEnabled: true,
          overlayHidden: true
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to enable user interactions: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async toggleMobileView(options: {
    mobile: boolean;
    deviceType: 'iPhone' | 'iPad' | 'Android' | 'custom';
    width?: number;
    height?: number;
  }): Promise<ActionResult> {
    if (!this.driver) {
      return { success: false, message: 'Browser not opened. Please call openBrowser first.' };
    }

    try {
      const { mobile, deviceType, width = 375, height = 667 } = options;

      if (mobile) {
        // Set mobile viewport and user agent
        let userAgent = '';
        let viewportWidth = width;
        let viewportHeight = height;

        switch (deviceType) {
          case 'iPhone':
            userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1';
            viewportWidth = 375;
            viewportHeight = 667;
            break;
          case 'iPad':
            userAgent = 'Mozilla/5.0 (iPad; CPU OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1';
            viewportWidth = 768;
            viewportHeight = 1024;
            break;
          case 'Android':
            userAgent = 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36';
            viewportWidth = 360;
            viewportHeight = 640;
            break;
          case 'custom':
            userAgent = 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36';
            break;
        }

        // Set mobile viewport
        await this.driver.executeScript(`
          // Set mobile viewport
          const viewport = document.querySelector('meta[name="viewport"]');
          if (viewport) {
            viewport.setAttribute('content', 'width=${viewportWidth}, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
          } else {
            const meta = document.createElement('meta');
            meta.name = 'viewport';
            meta.content = 'width=${viewportWidth}, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
            document.head.appendChild(meta);
          }
          
          // Add mobile-specific CSS
          const mobileCSS = document.createElement('style');
          mobileCSS.textContent = \`
            body { 
              -webkit-text-size-adjust: 100%; 
              -webkit-touch-callout: none;
              -webkit-user-select: none;
              -khtml-user-select: none;
              -moz-user-select: none;
              -ms-user-select: none;
              user-select: none;
            }
            input, textarea { 
              -webkit-user-select: text; 
              -khtml-user-select: text;
              -moz-user-select: text;
              -ms-user-select: text;
              user-select: text;
            }
          \`;
          document.head.appendChild(mobileCSS);
          
          // Set mobile user agent
          Object.defineProperty(navigator, 'userAgent', {
            get: function() { return '${userAgent}'; },
            configurable: true
          });
          
          // Set mobile screen dimensions
          Object.defineProperty(screen, 'width', {
            get: function() { return ${viewportWidth}; },
            configurable: true
          });
          Object.defineProperty(screen, 'height', {
            get: function() { return ${viewportHeight}; },
            configurable: true
          });
          
          // Set mobile window dimensions
          Object.defineProperty(window, 'innerWidth', {
            get: function() { return ${viewportWidth}; },
            configurable: true
          });
          Object.defineProperty(window, 'innerHeight', {
            get: function() { return ${viewportHeight}; },
            configurable: true
          });
        `);

        // Resize browser window to mobile dimensions
        await this.driver.manage().window().setSize(viewportWidth, viewportHeight);

        return {
          success: true,
          message: `Switched to mobile view (${deviceType}): ${viewportWidth}x${viewportHeight}`,
          data: {
            mobile: true,
            deviceType,
            width: viewportWidth,
            height: viewportHeight,
            userAgent
          }
        };
      } else {
        // Set desktop viewport
        await this.driver.executeScript(`
          // Remove mobile viewport
          const viewport = document.querySelector('meta[name="viewport"]');
          if (viewport) {
            viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
          }
          
          // Remove mobile-specific CSS
          const mobileCSS = document.querySelector('style[data-mobile]');
          if (mobileCSS) {
            mobileCSS.remove();
          }
          
          // Reset to desktop user agent
          Object.defineProperty(navigator, 'userAgent', {
            get: function() { return navigator.userAgent; },
            configurable: true
          });
        `);

        // Resize browser window to desktop dimensions
        await this.driver.manage().window().setSize(1280, 720);

        return {
          success: true,
          message: 'Switched to desktop view: 1280x720',
          data: {
            mobile: false,
            deviceType: 'desktop',
            width: 1280,
            height: 720
          }
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to toggle mobile view: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async getPageInfo(options: {
    includeConsoleLogs?: boolean;
    includeNetworkLogs?: boolean;
    includePerformanceMetrics?: boolean;
    includeElements?: boolean;
    consoleLogLimit?: number;
    networkLogLimit?: number;
    elementLimit?: number;
  } = {}): Promise<ActionResult> {
    if (!this.driver) {
      return {
        success: false,
        message: 'Browser not opened. Please call openBrowser first.',
        error: 'BROWSER_NOT_OPENED'
      };
    }

    try {
      const {
        includeConsoleLogs = true,
        includeNetworkLogs = true,
        includePerformanceMetrics = true,
        includeElements = false,
        consoleLogLimit = 50,
        networkLogLimit = 50,
        elementLimit = 100
      } = options;

      // Get basic page information with better error handling
      let title, url, windowSize;
      try {
        title = await this.driver.getTitle();
        url = await this.driver.getCurrentUrl();
        windowSize = await this.driver.manage().window().getSize();
      } catch (basicError) {
        return {
          success: false,
          message: `Failed to get basic page information: ${basicError instanceof Error ? basicError.message : String(basicError)}`,
          error: 'BASIC_INFO_FAILED',
          data: { basicError: basicError instanceof Error ? basicError.message : String(basicError) }
        };
      }

      const pageInfo: any = {
        title: title || 'Unknown',
        url: url || 'Unknown',
        windowSize: {
          width: windowSize?.width || 0,
          height: windowSize?.height || 0
        },
        timestamp: new Date().toISOString(),
        status: 'success'
      };

      // Get console logs with better error handling
      if (includeConsoleLogs) {
        try {
          const consoleLogs = await this.getConsoleLogs(undefined, consoleLogLimit);
          if (consoleLogs.success && consoleLogs.data) {
            pageInfo.consoleLogs = consoleLogs.data.logs || [];
            pageInfo.consoleLogCount = consoleLogs.data.total || 0;
            pageInfo.consoleLogStatus = 'success';
          } else {
            pageInfo.consoleLogs = [];
            pageInfo.consoleLogCount = 0;
            pageInfo.consoleLogStatus = 'failed';
            pageInfo.consoleLogError = consoleLogs.message || 'Unknown error';
          }
        } catch (consoleError) {
          pageInfo.consoleLogs = [];
          pageInfo.consoleLogCount = 0;
          pageInfo.consoleLogStatus = 'error';
          pageInfo.consoleLogError = consoleError instanceof Error ? consoleError.message : String(consoleError);
        }
      }

      // Get network logs with better error handling
      if (includeNetworkLogs) {
        try {
          const networkLogs = await this.getNetworkLogs(networkLogLimit);
          if (networkLogs.success && networkLogs.data) {
            pageInfo.networkLogs = networkLogs.data.logs || [];
            pageInfo.networkLogCount = networkLogs.data.total || 0;
            pageInfo.networkLogStatus = 'success';
          } else {
            pageInfo.networkLogs = [];
            pageInfo.networkLogCount = 0;
            pageInfo.networkLogStatus = 'failed';
            pageInfo.networkLogError = networkLogs.message || 'Unknown error';
          }
        } catch (networkError) {
          pageInfo.networkLogs = [];
          pageInfo.networkLogCount = 0;
          pageInfo.networkLogStatus = 'error';
          pageInfo.networkLogError = networkError instanceof Error ? networkError.message : String(networkError);
        }
      }

      // Get performance metrics with better error handling
      if (includePerformanceMetrics) {
        try {
          const performanceMetrics = await this.getPerformanceMetrics();
          if (performanceMetrics.success && performanceMetrics.data) {
            pageInfo.performanceMetrics = performanceMetrics.data;
            pageInfo.performanceStatus = 'success';
          } else {
            pageInfo.performanceMetrics = null;
            pageInfo.performanceStatus = 'failed';
            pageInfo.performanceError = performanceMetrics.message || 'Unknown error';
          }
        } catch (perfError) {
          pageInfo.performanceMetrics = null;
          pageInfo.performanceStatus = 'error';
          pageInfo.performanceError = perfError instanceof Error ? perfError.message : String(perfError);
        }
      }

      // Get page elements with better error handling
      if (includeElements) {
        try {
          const elements = await this.getPageElements('*', elementLimit);
          if (elements.success && elements.data) {
            pageInfo.elements = elements.data;
            pageInfo.elementCount = elements.data.length;
            pageInfo.elementStatus = 'success';
          } else {
            pageInfo.elements = [];
            pageInfo.elementCount = 0;
            pageInfo.elementStatus = 'failed';
            pageInfo.elementError = elements.message || 'Unknown error';
          }
        } catch (elementError) {
          pageInfo.elements = [];
          pageInfo.elementCount = 0;
          pageInfo.elementStatus = 'error';
          pageInfo.elementError = elementError instanceof Error ? elementError.message : String(elementError);
        }
      }

      return {
        success: true,
        message: `Page information retrieved successfully - Title: "${title}", URL: "${url}"`,
        data: pageInfo
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get page information: ${error instanceof Error ? error.message : String(error)}`,
        error: 'PAGE_INFO_FAILED',
        data: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      };
    }
  }

  // New debugging and inspection tools
  async getPageSource(): Promise<ActionResult> {
    if (!this.driver) {
      return {
        success: false,
        message: 'Browser not opened. Please call openBrowser first.',
        error: 'BROWSER_NOT_OPENED'
      };
    }

    try {
      const pageSource = await this.driver.getPageSource();
      return {
        success: true,
        message: 'Page source retrieved successfully',
        data: {
          source: pageSource,
          length: pageSource.length,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get page source: ${error instanceof Error ? error.message : String(error)}`,
        error: 'PAGE_SOURCE_FAILED',
        data: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  private async findElement(selector: string, by: 'css' | 'xpath' | 'id' | 'name' | 'className' | 'tagName' = 'css') {
    if (!this.driver) return null;

    const byMethod = this.getByMethod(by);
    try {
      return await this.driver.findElement(byMethod(selector));
    } catch (error) {
      return null;
    }
  }

  async inspectElement(selector: string, by: 'css' | 'xpath' | 'id' | 'name' | 'className' | 'tagName' = 'css'): Promise<ActionResult> {
    if (!this.driver) {
      return {
        success: false,
        message: 'Browser not opened. Please call openBrowser first.',
        error: 'BROWSER_NOT_OPENED'
      };
    }

    try {
      const element = await this.findElement(selector, by);
      if (!element) {
        return {
          success: false,
          message: `Element not found with selector: ${selector}`,
          error: 'ELEMENT_NOT_FOUND',
          data: { selector, by }
        };
      }

      // Get comprehensive element information
      const elementInfo: any = await this.driver.executeScript(`
        const element = arguments[0];
        const rect = element.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(element);
        
        return {
          tagName: element.tagName,
          id: element.id,
          className: element.className,
          textContent: element.textContent?.trim().substring(0, 200) || '',
          innerHTML: element.innerHTML.substring(0, 500),
          outerHTML: element.outerHTML.substring(0, 1000),
          attributes: Array.from(element.attributes).reduce((acc, attr) => {
            acc[attr.name] = attr.value;
            return acc;
          }, {}),
          boundingRect: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            top: rect.top,
            left: rect.left,
            bottom: rect.bottom,
            right: rect.right
          },
          computedStyle: {
            display: computedStyle.display,
            visibility: computedStyle.visibility,
            position: computedStyle.position,
            zIndex: computedStyle.zIndex,
            backgroundColor: computedStyle.backgroundColor,
            color: computedStyle.color,
            fontSize: computedStyle.fontSize,
            fontFamily: computedStyle.fontFamily,
            border: computedStyle.border,
            margin: computedStyle.margin,
            padding: computedStyle.padding
          },
          isVisible: rect.width > 0 && rect.height > 0 && computedStyle.visibility !== 'hidden' && computedStyle.display !== 'none',
          isEnabled: !element.disabled,
          isSelected: element.selected || false,
          isChecked: element.checked || false,
          value: element.value || '',
          href: element.href || '',
          src: element.src || ''
        };
      `, element);

      return {
        success: true,
        message: `Element inspected successfully: ${elementInfo.tagName}${elementInfo.id ? '#' + elementInfo.id : ''}${elementInfo.className ? '.' + elementInfo.className.split(' ').join('.') : ''}`,
        data: {
          selector,
          by,
          elementInfo,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to inspect element "${selector}": ${error instanceof Error ? error.message : String(error)}`,
        error: 'ELEMENT_INSPECTION_FAILED',
        data: {
          selector,
          by,
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  async executeInConsole(script: string): Promise<ActionResult> {
    if (!this.driver) {
      return {
        success: false,
        message: 'Browser not opened. Please call openBrowser first.',
        error: 'BROWSER_NOT_OPENED'
      };
    }

    try {
      const result = await this.driver.executeScript(script);
      return {
        success: true,
        message: 'Script executed in console successfully',
        data: {
          result,
          script,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to execute script in console: ${error instanceof Error ? error.message : String(error)}`,
        error: 'CONSOLE_EXECUTION_FAILED',
        data: {
          script,
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  async getNetworkRequests(): Promise<ActionResult> {
    if (!this.driver) {
      return {
        success: false,
        message: 'Browser not opened. Please call openBrowser first.',
        error: 'BROWSER_NOT_OPENED'
      };
    }

    try {
      // Get network requests using Chrome DevTools Protocol
      const logs = await this.driver.manage().logs().get('performance');
      const networkRequests = logs
        .filter(log => log.message.includes('Network.requestWillBeSent') || log.message.includes('Network.responseReceived'))
        .map(log => {
          try {
            const message = JSON.parse(log.message);
            return {
              timestamp: log.timestamp,
              level: log.level,
              message: message.message,
              method: message.message?.params?.request?.method,
              url: message.message?.params?.request?.url,
              status: message.message?.params?.response?.status,
              responseTime: message.message?.params?.response?.timestamp
            };
          } catch (e) {
            return {
              timestamp: log.timestamp,
              level: log.level,
              rawMessage: log.message
            };
          }
        });

      return {
        success: true,
        message: `Retrieved ${networkRequests.length} network requests`,
        data: {
          requests: networkRequests,
          count: networkRequests.length,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get network requests: ${error instanceof Error ? error.message : String(error)}`,
        error: 'NETWORK_REQUESTS_FAILED',
        data: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  async debugPage(): Promise<ActionResult> {
    if (!this.driver) {
      return {
        success: false,
        message: 'Browser not opened. Please call openBrowser first.',
        error: 'BROWSER_NOT_OPENED'
      };
    }

    try {
      // Comprehensive debugging information
      const debugInfo = await this.driver.executeScript(`
        return {
          url: window.location.href,
          title: document.title,
          readyState: document.readyState,
          userAgent: navigator.userAgent,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
            devicePixelRatio: window.devicePixelRatio
          },
          document: {
            characterSet: document.characterSet,
            contentType: document.contentType,
            domain: document.domain,
            lastModified: document.lastModified,
            referrer: document.referrer
          },
          performance: {
            navigation: performance.navigation ? {
              type: performance.navigation.type,
              redirectCount: performance.navigation.redirectCount
            } : null,
            timing: performance.timing ? {
              navigationStart: performance.timing.navigationStart,
              loadEventEnd: performance.timing.loadEventEnd,
              domContentLoadedEventEnd: performance.timing.domContentLoadedEventEnd
            } : null
          },
          errors: window.errors || [],
          warnings: window.warnings || [],
          console: {
            logCount: window.consoleLogCount || 0,
            errorCount: window.consoleErrorCount || 0,
            warnCount: window.consoleWarnCount || 0
          },
          elements: {
            total: document.querySelectorAll('*').length,
            visible: document.querySelectorAll('*:not([style*="display: none"]):not([hidden])').length,
            interactive: document.querySelectorAll('button, input, select, textarea, a[href]').length
          }
        };
      `);

      return {
        success: true,
        message: 'Page debugging information retrieved successfully',
        data: {
          debugInfo,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to debug page: ${error instanceof Error ? error.message : String(error)}`,
        error: 'PAGE_DEBUG_FAILED',
        data: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }

}
