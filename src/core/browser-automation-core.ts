import { Builder, By, WebDriver, until, Key, Actions, Button } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { promises as fs } from 'fs';
import { join, resolve } from 'path';

export interface BrowserOptions {
  headless?: boolean;
  width?: number;
  height?: number;
  browserType?: 'chrome' | 'duckduckgo' | 'firefox';
  userAgent?: string;
  proxy?: string;
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
}

export interface ConsoleLogEntry {
  level: 'log' | 'error' | 'warn' | 'info' | 'debug';
  message: string;
  timestamp: string;
  source?: string;
  line?: number;
  column?: number;
}

export class BrowserAutomationCore {
  private driver: WebDriver | null = null;
  private consoleLogs: ConsoleLogEntry[] = [];
  private debugPort: number | null = null;

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

        chromeOptions.addArguments(`--window-size=${options.width || 1280},${options.height || 720}`);
        
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
        };

        builder = builder
          .forBrowser('chrome')
          .setChromeOptions(chromeOptions)
          .setLoggingPrefs(loggingPrefs);
      } else if (browserType === 'duckduckgo') {
        const chromeOptions = new chrome.Options();

        if (isHeadless) {
          chromeOptions.addArguments('--headless=new');
          chromeOptions.addArguments('--disable-gpu');
        }

        chromeOptions.addArguments(`--window-size=${options.width || 1280},${options.height || 720}`);
        
        this.debugPort = 9222 + Math.floor(Math.random() * 1000);
        chromeOptions.addArguments(`--remote-debugging-port=${this.debugPort}`);
        chromeOptions.addArguments(`--user-data-dir=/tmp/.org.chromium.DuckDuckGo.${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
        chromeOptions.addArguments('--disable-blink-features=AutomationControlled');
        chromeOptions.addArguments('--disable-web-security');
        chromeOptions.addArguments('--user-agent=Mozilla/5.0 (compatible; DuckDuckGoBot/1.0; +http://duckduckgo.com/duckduckbot.html)');

        if (options.proxy) {
          chromeOptions.addArguments(`--proxy-server=${options.proxy}`);
        }

        builder = builder
          .forBrowser('chrome')
          .setChromeOptions(chromeOptions);
      } else if (browserType === 'firefox') {
        const firefoxOptions = new (require('selenium-webdriver/firefox').Options)();

        if (isHeadless) {
          firefoxOptions.addArguments('--headless');
        }

        firefoxOptions.addArguments(`--width=${options.width || 1280}`);
        firefoxOptions.addArguments(`--height=${options.height || 720}`);

        if (options.userAgent) {
          firefoxOptions.setPreference('general.useragent.override', options.userAgent);
        }

        if (options.proxy) {
          const [host, port] = options.proxy.split(':');
          firefoxOptions.setPreference('network.proxy.type', 1);
          firefoxOptions.setPreference('network.proxy.http', host);
          firefoxOptions.setPreference('network.proxy.http_port', parseInt(port));
        }

        builder = builder
          .forBrowser('firefox')
          .setFirefoxOptions(firefoxOptions);
      }

      this.driver = await builder.build();

      if (browserType === 'chrome' || browserType === 'duckduckgo') {
        await this.setupConsoleLogCapture();
      }

      const modeText = isHeadless ? 'headless' : 'headed';
      const browserText = browserType === 'duckduckgo' ? 'DuckDuckGo (Chrome)' : browserType;

      return {
        success: true,
        message: `Browser opened successfully: ${browserText} in ${modeText} mode`,
        data: { browserType, isHeadless },
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
      await this.driver.quit();
      this.driver = null;
      this.consoleLogs = [];

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
      const filepath = join(process.cwd(), 'screenshots', finalFilename);

      await fs.mkdir(join(process.cwd(), 'screenshots'), { recursive: true });
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
      const logs = await this.driver.executeScript('return window.capturedLogs || [];') as ConsoleLogEntry[];
      
      let filteredLogs = logs;
      if (level) {
        filteredLogs = logs.filter((log: ConsoleLogEntry) => log.level === level);
      }
      
      if (limit && limit > 0) {
        filteredLogs = filteredLogs.slice(-limit);
      }
      
      this.consoleLogs = logs;
      
      return {
        success: true,
        message: `Retrieved ${filteredLogs.length} console log entries${level ? ` (filtered by level: ${level})` : ''}`,
        data: {
          logs: filteredLogs,
          total: logs.length,
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
}
