import { Builder, By, WebDriver, until, Key, Actions, Button } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { promises as fs } from 'fs';
import { join, resolve } from 'path';

export class BrowserManager {
  private driver: WebDriver | null = null;
  private consoleLogs: any[] = [];

  async openBrowser(options: {
    headless?: boolean;
    width?: number;
    height?: number;
    browserType?: 'chrome' | 'duckduckgo' | 'firefox';
    userAgent?: string;
    proxy?: string;
  } = {}): Promise<{ content: Array<{ type: string; text: string }> }> {
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
        chromeOptions.addArguments('--remote-debugging-port=9222');
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
        // DuckDuckGo uses Chrome engine but with specific settings
        const chromeOptions = new chrome.Options();
        
        if (isHeadless) {
          chromeOptions.addArguments('--headless=new');
          chromeOptions.addArguments('--disable-gpu');
        }
        
        chromeOptions.addArguments(`--window-size=${options.width || 1280},${options.height || 720}`);
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

      // Set up console log capture for Chrome-based browsers
      if (browserType === 'chrome' || browserType === 'duckduckgo') {
        await this.setupConsoleLogCapture();
      }

      const modeText = isHeadless ? 'headless' : 'headed';
      const browserText = browserType === 'duckduckgo' ? 'DuckDuckGo (Chrome)' : browserType;

      return {
        content: [
          {
            type: 'text',
            text: `Browser opened successfully: ${browserText} in ${modeText} mode`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to open browser: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async setupConsoleLogCapture() {
    if (!this.driver) return;

    try {
      // Execute script to capture console logs
      await this.driver.executeScript(`
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;
        const originalInfo = console.info;
        
        window.capturedLogs = [];
        
        function captureLog(level, args) {
          window.capturedLogs.push({
            level: level,
            message: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '),
            timestamp: new Date().toISOString()
          });
        }
        
        console.log = function(...args) {
          captureLog('log', args);
          originalLog.apply(console, args);
        };
        
        console.error = function(...args) {
          captureLog('error', args);
          originalError.apply(console, args);
        };
        
        console.warn = function(...args) {
          captureLog('warn', args);
          originalWarn.apply(console, args);
        };
        
        console.info = function(...args) {
          captureLog('info', args);
          originalInfo.apply(console, args);
        };
      `);
    } catch (error) {
      console.warn('Failed to setup console log capture:', error);
    }
  }

  async navigateTo(url: string): Promise<{ content: Array<{ type: string; text: string }> }> {
    if (!this.driver) {
      throw new Error('Browser not opened. Please call open_browser first.');
    }

    try {
      await this.driver.get(url);
      return {
        content: [
          {
            type: 'text',
            text: `Navigated to: ${url}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to navigate to ${url}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async findElement(
    selector: string,
    by: string = 'css',
    timeout: number = 10000
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    if (!this.driver) {
      throw new Error('Browser not opened. Please call open_browser first.');
    }

    try {
      const byMethod = this.getByMethod(by);
      const element = await this.driver.wait(until.elementLocated(byMethod(selector)), timeout);
      const isDisplayed = await element.isDisplayed();
      const isEnabled = await element.isEnabled();
      const tagName = await element.getTagName();
      const text = await element.getText();

      return {
        content: [
          {
            type: 'text',
            text: `Element found: ${selector}\nTag: ${tagName}\nText: ${text}\nDisplayed: ${isDisplayed}\nEnabled: ${isEnabled}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Element not found: ${selector} (${by}): ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async clickElement(
    selector: string,
    by: string = 'css',
    timeout: number = 10000
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    if (!this.driver) {
      throw new Error('Browser not opened. Please call open_browser first.');
    }

    try {
      const byMethod = this.getByMethod(by);
      const element = await this.driver.wait(until.elementLocated(byMethod(selector)), timeout);
      await this.driver.wait(until.elementIsVisible(element), timeout);
      await element.click();

      return {
        content: [
          {
            type: 'text',
            text: `Clicked element: ${selector}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to click element: ${selector} (${by}): ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async typeText(
    selector: string,
    text: string,
    by: string = 'css',
    timeout: number = 10000
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    if (!this.driver) {
      throw new Error('Browser not opened. Please call open_browser first.');
    }

    try {
      const byMethod = this.getByMethod(by);
      const element = await this.driver.wait(until.elementLocated(byMethod(selector)), timeout);
      await this.driver.wait(until.elementIsVisible(element), timeout);
      await element.clear();
      await element.sendKeys(text);

      return {
        content: [
          {
            type: 'text',
            text: `Typed "${text}" into element: ${selector}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to type text into element: ${selector} (${by}): ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getPageTitle(): Promise<{ content: Array<{ type: string; text: string }> }> {
    if (!this.driver) {
      throw new Error('Browser not opened. Please call open_browser first.');
    }

    try {
      const title = await this.driver.getTitle();
      return {
        content: [
          {
            type: 'text',
            text: `Page title: ${title}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to get page title: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getPageUrl(): Promise<{ content: Array<{ type: string; text: string }> }> {
    if (!this.driver) {
      throw new Error('Browser not opened. Please call open_browser first.');
    }

    try {
      const url = await this.driver.getCurrentUrl();
      return {
        content: [
          {
            type: 'text',
            text: `Current URL: ${url}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to get page URL: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getConsoleLogs(level: string = 'all'): Promise<{ content: Array<{ type: string; text: string }> }> {
    if (!this.driver) {
      throw new Error('Browser not opened. Please call open_browser first.');
    }

    try {
      const logs = await this.driver.executeScript('return window.capturedLogs || [];');
      const filteredLogs = level === 'all' 
        ? logs 
        : logs.filter((log: any) => log.level === level);

      const logText = filteredLogs.length > 0 
        ? filteredLogs.map((log: any) => `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`).join('\n')
        : 'No console logs found';

      return {
        content: [
          {
            type: 'text',
            text: `Console logs (${level}):\n${logText}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to get console logs: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async takeScreenshot(filename?: string, fullPage: boolean = false): Promise<{ content: Array<{ type: string; text: string }> }> {
    if (!this.driver) {
      throw new Error('Browser not opened. Please call open_browser first.');
    }

    try {
      const screenshot = await this.driver.takeScreenshot();
      const finalFilename = filename || `screenshot-${Date.now()}.png`;
      const filepath = join(process.cwd(), 'screenshots', finalFilename);
      
      // Ensure screenshots directory exists
      await fs.mkdir(join(process.cwd(), 'screenshots'), { recursive: true });
      
      await fs.writeFile(filepath, screenshot, 'base64');

      return {
        content: [
          {
            type: 'text',
            text: `Screenshot saved to: ${filepath}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to take screenshot: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async waitForElement(
    selector: string,
    by: string = 'css',
    timeout: number = 10000
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    if (!this.driver) {
      throw new Error('Browser not opened. Please call open_browser first.');
    }

    try {
      const byMethod = this.getByMethod(by);
      await this.driver.wait(until.elementLocated(byMethod(selector)), timeout);
      const element = this.driver.findElement(byMethod(selector));
      await this.driver.wait(until.elementIsVisible(element), timeout);

      return {
        content: [
          {
            type: 'text',
            text: `Element appeared and is visible: ${selector}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Element did not appear within timeout: ${selector} (${by}): ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async executeScript(script: string, args: string[] = []): Promise<{ content: Array<{ type: string; text: string }> }> {
    if (!this.driver) {
      throw new Error('Browser not opened. Please call open_browser first.');
    }

    try {
      const result = await this.driver.executeScript(script, ...args);
      return {
        content: [
          {
            type: 'text',
            text: `Script executed successfully. Result: ${JSON.stringify(result)}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to execute script: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getPageElements(
    includeText: boolean = true,
    includeAttributes: boolean = true
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    if (!this.driver) {
      throw new Error('Browser not opened. Please call open_browser first.');
    }

    try {
      const elements = await this.driver.executeScript(`
        const interactiveSelectors = [
          'input', 'button', 'select', 'textarea', 'a[href]', 
          '[onclick]', '[role="button"]', '[tabindex]',
          'form', 'fieldset', 'legend'
        ];
        
        const elements = [];
        const allElements = document.querySelectorAll('*');
        
        for (let el of allElements) {
          const tagName = el.tagName.toLowerCase();
          const isInteractive = interactiveSelectors.some(selector => {
            try {
              return el.matches(selector);
            } catch (e) {
              return false;
            }
          });
          
          if (isInteractive || el.offsetParent !== null) {
            const elementInfo = {
              tagName: tagName,
              id: el.id || null,
              className: el.className || null,
              type: el.type || null,
              name: el.name || null,
              value: el.value || null,
              placeholder: el.placeholder || null,
              text: ${includeText} ? el.textContent?.trim().substring(0, 100) || null : null,
              attributes: ${includeAttributes} ? {} : null,
              selector: el.id ? '#' + el.id : 
                       el.className ? '.' + el.className.split(' ')[0] : 
                       tagName,
              visible: el.offsetParent !== null,
              enabled: !el.disabled
            };
            
            if (${includeAttributes}) {
              for (let attr of el.attributes) {
                elementInfo.attributes[attr.name] = attr.value;
              }
            }
            
            elements.push(elementInfo);
          }
        }
        
        return elements;
      `);

      const elementsText = elements.length > 0 
        ? elements.map((el: any) => 
            `${el.selector} (${el.tagName})${el.id ? ` #${el.id}` : ''}${el.className ? ` .${el.className}` : ''}${el.text ? ` - "${el.text}"` : ''}${el.type ? ` [${el.type}]` : ''}${el.visible ? ' ✓' : ' ✗'}`
          ).join('\n')
        : 'No interactive elements found';

      return {
        content: [
          {
            type: 'text',
            text: `Found ${elements.length} interactive elements:\n${elementsText}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to get page elements: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getFormElements(formSelector?: string): Promise<{ content: Array<{ type: string; text: string }> }> {
    if (!this.driver) {
      throw new Error('Browser not opened. Please call open_browser first.');
    }

    try {
      const forms = await this.driver.executeScript(`
        const forms = formSelector ? 
          document.querySelectorAll(formSelector) : 
          document.querySelectorAll('form');
        
        const formData = [];
        
        for (let form of forms) {
          const formInfo = {
            id: form.id || null,
            className: form.className || null,
            action: form.action || null,
            method: form.method || 'get',
            elements: []
          };
          
          const inputs = form.querySelectorAll('input, select, textarea, button');
          for (let input of inputs) {
            const inputInfo = {
              tagName: input.tagName.toLowerCase(),
              type: input.type || null,
              name: input.name || null,
              id: input.id || null,
              placeholder: input.placeholder || null,
              value: input.value || null,
              required: input.required || false,
              disabled: input.disabled || false,
              visible: input.offsetParent !== null
            };
            formInfo.elements.push(inputInfo);
          }
          
          formData.push(formInfo);
        }
        
        return formData;
      `, formSelector);

      const formsText = forms.length > 0 
        ? forms.map((form: any, index: number) => 
            `Form ${index + 1}${form.id ? ` (#${form.id})` : ''}${form.className ? ` .${form.className}` : ''} (${form.method.toUpperCase()}) - ${form.elements.length} elements:\n` +
            form.elements.map((el: any) => 
              `  ${el.tagName}${el.type ? `[${el.type}]` : ''}${el.name ? ` name="${el.name}"` : ''}${el.id ? ` id="${el.id}"` : ''}${el.required ? ' *required' : ''}${el.disabled ? ' *disabled' : ''}${el.visible ? ' ✓' : ' ✗'}`
            ).join('\n')
          ).join('\n\n')
        : 'No forms found';

      return {
        content: [
          {
            type: 'text',
            text: `Found ${forms.length} form(s):\n${formsText}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to get form elements: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async fillForm(
    formData: Record<string, string>,
    formSelector?: string
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    if (!this.driver) {
      throw new Error('Browser not opened. Please call open_browser first.');
    }

    try {
      const filledFields = [];
      
      for (const [fieldName, value] of Object.entries(formData)) {
        try {
          // Try different selectors for the field
          const selectors = [
            `input[name="${fieldName}"]`,
            `input[id="${fieldName}"]`,
            `select[name="${fieldName}"]`,
            `select[id="${fieldName}"]`,
            `textarea[name="${fieldName}"]`,
            `textarea[id="${fieldName}"]`,
            `#${fieldName}`,
            `[name="${fieldName}"]`
          ];

          let element = null;
          for (const selector of selectors) {
            try {
              element = await this.driver.findElement(By.css(selector));
              break;
            } catch (e) {
              continue;
            }
          }

          if (!element) {
            filledFields.push(`${fieldName}: NOT FOUND`);
            continue;
          }

          await this.driver.wait(until.elementIsVisible(element), 5000);
          
          const tagName = await element.getTagName();
          const inputType = await element.getAttribute('type');

          if (tagName === 'select') {
            // Handle select elements
            await element.click();
            const option = await this.driver.findElement(By.css(`option[value="${value}"]`));
            await option.click();
          } else if (inputType === 'checkbox' || inputType === 'radio') {
            // Handle checkboxes and radio buttons
            const isChecked = await element.isSelected();
            if (value.toLowerCase() === 'true' && !isChecked) {
              await element.click();
            } else if (value.toLowerCase() === 'false' && isChecked) {
              await element.click();
            }
          } else {
            // Handle text inputs, textareas, etc.
            await element.clear();
            await element.sendKeys(value);
          }

          filledFields.push(`${fieldName}: "${value}" ✓`);
        } catch (error) {
          filledFields.push(`${fieldName}: ERROR - ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: `Form filling completed:\n${filledFields.join('\n')}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to fill form: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getPageInfo(): Promise<{ content: Array<{ type: string; text: string }> }> {
    if (!this.driver) {
      throw new Error('Browser not opened. Please call open_browser first.');
    }

    try {
      const pageInfo = await this.driver.executeScript(`
        return {
          title: document.title,
          url: window.location.href,
          domain: window.location.hostname,
          protocol: window.location.protocol,
          pathname: window.location.pathname,
          search: window.location.search,
          hash: window.location.hash,
          userAgent: navigator.userAgent,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          },
          meta: Array.from(document.querySelectorAll('meta')).map(meta => ({
            name: meta.name || meta.property,
            content: meta.content
          })).filter(meta => meta.name),
          links: Array.from(document.querySelectorAll('link[rel]')).map(link => ({
            rel: link.rel,
            href: link.href,
            type: link.type
          })),
          scripts: Array.from(document.querySelectorAll('script[src]')).map(script => ({
            src: script.src,
            type: script.type || 'text/javascript'
          })),
          images: Array.from(document.querySelectorAll('img')).length,
          forms: document.querySelectorAll('form').length,
          inputs: document.querySelectorAll('input, select, textarea').length,
          links: document.querySelectorAll('a').length,
          buttons: document.querySelectorAll('button').length
        };
      `);

      const infoText = `Page Information:
Title: ${pageInfo.title}
URL: ${pageInfo.url}
Domain: ${pageInfo.domain}
Protocol: ${pageInfo.protocol}
Viewport: ${pageInfo.viewport.width}x${pageInfo.viewport.height}

Content Summary:
- Images: ${pageInfo.images}
- Forms: ${pageInfo.forms}
- Input fields: ${pageInfo.inputs}
- Links: ${pageInfo.links}
- Buttons: ${pageInfo.buttons}
- Scripts: ${pageInfo.scripts.length}
- Meta tags: ${pageInfo.meta.length}

Meta Tags:
${pageInfo.meta.map((meta: any) => `  ${meta.name}: ${meta.content}`).join('\n')}

Scripts:
${pageInfo.scripts.map((script: any) => `  ${script.src} (${script.type})`).join('\n')}`;

      return {
        content: [
          {
            type: 'text',
            text: infoText,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to get page info: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getLoadedScripts(): Promise<{ content: Array<{ type: string; text: string }> }> {
    if (!this.driver) {
      throw new Error('Browser not opened. Please call open_browser first.');
    }

    try {
      const scripts = await this.driver.executeScript(`
        const scripts = Array.from(document.querySelectorAll('script'));
        return scripts.map(script => ({
          src: script.src || 'inline',
          type: script.type || 'text/javascript',
          async: script.async,
          defer: script.defer,
          content: script.src ? null : script.textContent?.substring(0, 200) + '...'
        }));
      `);

      const scriptsText = scripts.length > 0 
        ? scripts.map((script: any, index: number) => 
            `${index + 1}. ${script.src} (${script.type})${script.async ? ' [async]' : ''}${script.defer ? ' [defer]' : ''}${script.content ? `\n   Content: ${script.content}` : ''}`
          ).join('\n')
        : 'No scripts found';

      return {
        content: [
          {
            type: 'text',
            text: `Loaded Scripts (${scripts.length}):\n${scriptsText}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to get loaded scripts: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getDomStructure(
    maxDepth: number = 3,
    includeText: boolean = false
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    if (!this.driver) {
      throw new Error('Browser not opened. Please call open_browser first.');
    }

    try {
      const domStructure = await this.driver.executeScript(`
        function getElementInfo(el, depth = 0) {
          if (depth > ${maxDepth}) return null;
          
          const info = {
            tag: el.tagName.toLowerCase(),
            id: el.id || null,
            className: el.className || null,
            children: []
          };
          
          if (${includeText}) {
            const text = el.textContent?.trim();
            if (text && text.length > 0 && text.length < 100) {
              info.text = text;
            }
          }
          
          for (let child of el.children) {
            const childInfo = getElementInfo(child, depth + 1);
            if (childInfo) {
              info.children.push(childInfo);
            }
          }
          
          return info;
        }
        
        return getElementInfo(document.documentElement);
      `);

      function formatDomStructure(node: any, indent = 0): string {
        const spaces = '  '.repeat(indent);
        let result = `${spaces}<${node.tag}`;
        
        if (node.id) result += ` id="${node.id}"`;
        if (node.className) result += ` class="${node.className}"`;
        if (node.text) result += ` text="${node.text}"`;
        
        result += '>';
        
        if (node.children && node.children.length > 0) {
          result += '\n';
          for (const child of node.children) {
            result += formatDomStructure(child, indent + 1) + '\n';
          }
          result += spaces;
        }
        
        result += `</${node.tag}>`;
        return result;
      }

      const domText = formatDomStructure(domStructure);

      return {
        content: [
          {
            type: 'text',
            text: `DOM Structure (max depth: ${maxDepth}):\n${domText}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to get DOM structure: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async waitForPageLoad(timeout: number = 30000): Promise<{ content: Array<{ type: string; text: string }> }> {
    if (!this.driver) {
      throw new Error('Browser not opened. Please call open_browser first.');
    }

    try {
      await this.driver.executeAsyncScript(`
        const callback = arguments[arguments.length - 1];
        if (document.readyState === 'complete') {
          callback(true);
        } else {
          window.addEventListener('load', () => callback(true));
          setTimeout(() => callback(false), ${timeout});
        }
      `);

      return {
        content: [
          {
            type: 'text',
            text: 'Page load completed successfully',
          },
        ],
      };
    } catch (error) {
      throw new Error(`Page load timeout after ${timeout}ms: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async scrollToElement(
    selector: string,
    by: string = 'css',
    timeout: number = 10000
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    if (!this.driver) {
      throw new Error('Browser not opened. Please call open_browser first.');
    }

    try {
      const byMethod = this.getByMethod(by);
      const element = await this.driver.wait(until.elementLocated(byMethod(selector)), timeout);
      await this.driver.executeScript('arguments[0].scrollIntoView(true);', element);

      return {
        content: [
          {
            type: 'text',
            text: `Scrolled to element: ${selector}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to scroll to element: ${selector} (${by}): ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async dragAndDrop(
    sourceSelector: string,
    targetSelector: string,
    sourceBy: string = 'css',
    targetBy: string = 'css',
    timeout: number = 10000
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    if (!this.driver) {
      throw new Error('Browser not opened. Please call open_browser first.');
    }

    try {
      const sourceByMethod = this.getByMethod(sourceBy);
      const targetByMethod = this.getByMethod(targetBy);
      
      const sourceElement = await this.driver.wait(until.elementLocated(sourceByMethod(sourceSelector)), timeout);
      const targetElement = await this.driver.wait(until.elementLocated(targetByMethod(targetSelector)), timeout);
      
      await this.driver.wait(until.elementIsVisible(sourceElement), timeout);
      await this.driver.wait(until.elementIsVisible(targetElement), timeout);

      const actions = this.driver.actions();
      await actions.dragAndDrop(sourceElement, targetElement).perform();

      return {
        content: [
          {
            type: 'text',
            text: `Successfully dragged element ${sourceSelector} to ${targetSelector}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to drag and drop: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async hoverElement(
    selector: string,
    by: string = 'css',
    timeout: number = 10000
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    if (!this.driver) {
      throw new Error('Browser not opened. Please call open_browser first.');
    }

    try {
      const byMethod = this.getByMethod(by);
      const element = await this.driver.wait(until.elementLocated(byMethod(selector)), timeout);
      await this.driver.wait(until.elementIsVisible(element), timeout);

      const actions = this.driver.actions();
      await actions.move({ origin: element }).perform();

      return {
        content: [
          {
            type: 'text',
            text: `Hovered over element: ${selector}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to hover over element: ${selector} (${by}): ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async doubleClickElement(
    selector: string,
    by: string = 'css',
    timeout: number = 10000
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    if (!this.driver) {
      throw new Error('Browser not opened. Please call open_browser first.');
    }

    try {
      const byMethod = this.getByMethod(by);
      const element = await this.driver.wait(until.elementLocated(byMethod(selector)), timeout);
      await this.driver.wait(until.elementIsVisible(element), timeout);

      const actions = this.driver.actions();
      await actions.doubleClick(element).perform();

      return {
        content: [
          {
            type: 'text',
            text: `Double-clicked element: ${selector}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to double-click element: ${selector} (${by}): ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async rightClickElement(
    selector: string,
    by: string = 'css',
    timeout: number = 10000
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    if (!this.driver) {
      throw new Error('Browser not opened. Please call open_browser first.');
    }

    try {
      const byMethod = this.getByMethod(by);
      const element = await this.driver.wait(until.elementLocated(byMethod(selector)), timeout);
      await this.driver.wait(until.elementIsVisible(element), timeout);

      const actions = this.driver.actions();
      await actions.contextClick(element).perform();

      return {
        content: [
          {
            type: 'text',
            text: `Right-clicked element: ${selector}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to right-click element: ${selector} (${by}): ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async selectOption(
    selectSelector: string,
    optionValue?: string,
    optionText?: string,
    by: string = 'css',
    timeout: number = 10000
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    if (!this.driver) {
      throw new Error('Browser not opened. Please call open_browser first.');
    }

    try {
      const byMethod = this.getByMethod(by);
      const selectElement = await this.driver.wait(until.elementLocated(byMethod(selectSelector)), timeout);
      await this.driver.wait(until.elementIsVisible(selectElement), timeout);

      let optionElement;
      if (optionValue) {
        optionElement = await selectElement.findElement(By.css(`option[value="${optionValue}"]`));
      } else if (optionText) {
        optionElement = await selectElement.findElement(By.xpath(`//option[text()="${optionText}"]`));
      } else {
        throw new Error('Either optionValue or optionText must be provided');
      }

      await optionElement.click();

      const selectedText = await optionElement.getText();
      const selectedValue = await optionElement.getAttribute('value');

      return {
        content: [
          {
            type: 'text',
            text: `Selected option: "${selectedText}" (value: "${selectedValue}") from select: ${selectSelector}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to select option: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async checkCheckbox(
    selector: string,
    checked: boolean = true,
    by: string = 'css',
    timeout: number = 10000
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    if (!this.driver) {
      throw new Error('Browser not opened. Please call open_browser first.');
    }

    try {
      const byMethod = this.getByMethod(by);
      const element = await this.driver.wait(until.elementLocated(byMethod(selector)), timeout);
      await this.driver.wait(until.elementIsVisible(element), timeout);

      const isCurrentlyChecked = await element.isSelected();
      
      if (checked !== isCurrentlyChecked) {
        await element.click();
      }

      return {
        content: [
          {
            type: 'text',
            text: `Checkbox ${checked ? 'checked' : 'unchecked'}: ${selector}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to ${checked ? 'check' : 'uncheck'} checkbox: ${selector} (${by}): ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async selectRadioButton(
    selector: string,
    by: string = 'css',
    timeout: number = 10000
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    if (!this.driver) {
      throw new Error('Browser not opened. Please call open_browser first.');
    }

    try {
      const byMethod = this.getByMethod(by);
      const element = await this.driver.wait(until.elementLocated(byMethod(selector)), timeout);
      await this.driver.wait(until.elementIsVisible(element), timeout);

      await element.click();

      return {
        content: [
          {
            type: 'text',
            text: `Selected radio button: ${selector}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to select radio button: ${selector} (${by}): ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async uploadFile(
    selector: string,
    filePath: string,
    by: string = 'css',
    timeout: number = 10000
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    if (!this.driver) {
      throw new Error('Browser not opened. Please call open_browser first.');
    }

    try {
      const byMethod = this.getByMethod(by);
      const element = await this.driver.wait(until.elementLocated(byMethod(selector)), timeout);
      await this.driver.wait(until.elementIsVisible(element), timeout);

      const absolutePath = resolve(filePath);
      
      // Check if file exists
      try {
        await fs.access(absolutePath);
      } catch (error) {
        throw new Error(`File not found: ${absolutePath}`);
      }

      await element.sendKeys(absolutePath);

      return {
        content: [
          {
            type: 'text',
            text: `File uploaded: ${absolutePath} to element: ${selector}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async switchToFrame(
    selector: string,
    by: string = 'css',
    timeout: number = 10000
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    if (!this.driver) {
      throw new Error('Browser not opened. Please call open_browser first.');
    }

    try {
      const byMethod = this.getByMethod(by);
      const frameElement = await this.driver.wait(until.elementLocated(byMethod(selector)), timeout);
      await this.driver.wait(until.elementIsVisible(frameElement), timeout);

      await this.driver.switchTo().frame(frameElement);

      return {
        content: [
          {
            type: 'text',
            text: `Switched to frame: ${selector}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to switch to frame: ${selector} (${by}): ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async switchToDefaultContent(): Promise<{ content: Array<{ type: string; text: string }> }> {
    if (!this.driver) {
      throw new Error('Browser not opened. Please call open_browser first.');
    }

    try {
      await this.driver.switchTo().defaultContent();

      return {
        content: [
          {
            type: 'text',
            text: 'Switched back to default content',
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to switch to default content: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getElementAttributes(
    selector: string,
    by: string = 'css',
    timeout: number = 10000
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    if (!this.driver) {
      throw new Error('Browser not opened. Please call open_browser first.');
    }

    try {
      const byMethod = this.getByMethod(by);
      const element = await this.driver.wait(until.elementLocated(byMethod(selector)), timeout);

      const attributes = await this.driver.executeScript(`
        const element = arguments[0];
        const attrs = {};
        for (let attr of element.attributes) {
          attrs[attr.name] = attr.value;
        }
        return attrs;
      `, element);

      const attributesText = Object.keys(attributes).length > 0 
        ? Object.entries(attributes).map(([key, value]) => `  ${key}: "${value}"`).join('\n')
        : 'No attributes found';

      return {
        content: [
          {
            type: 'text',
            text: `Element attributes for ${selector}:\n${attributesText}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to get element attributes: ${selector} (${by}): ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async executeActionSequence(
    actions: any[],
    continueOnError: boolean = false,
    stopOnError: boolean = true
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    if (!this.driver) {
      throw new Error('Browser not opened. Please call open_browser first.');
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
            await this.clickElement(action.selector, action.by || 'css', action.timeout || 10000);
            result = `✓ Clicked ${action.selector}`;
            break;

          case 'double_click':
            await this.doubleClickElement(action.selector, action.by || 'css', action.timeout || 10000);
            result = `✓ Double-clicked ${action.selector}`;
            break;

          case 'right_click':
            await this.rightClickElement(action.selector, action.by || 'css', action.timeout || 10000);
            result = `✓ Right-clicked ${action.selector}`;
            break;

          case 'hover':
            await this.hoverElement(action.selector, action.by || 'css', action.timeout || 10000);
            result = `✓ Hovered over ${action.selector}`;
            break;

          case 'type':
            await this.typeText(action.selector, action.value || '', action.by || 'css', action.timeout || 10000);
            result = `✓ Typed "${action.value}" into ${action.selector}`;
            break;

          case 'clear':
            const clearElement = await this.driver!.wait(until.elementLocated(this.getByMethod(action.by || 'css')(action.selector)), action.timeout || 10000);
            await clearElement.clear();
            result = `✓ Cleared ${action.selector}`;
            break;

          case 'select_option':
            await this.selectOption(action.selector, action.value, action.text, action.by || 'css', action.timeout || 10000);
            result = `✓ Selected option in ${action.selector}`;
            break;

          case 'check_checkbox':
            await this.checkCheckbox(action.selector, action.checked !== false, action.by || 'css', action.timeout || 10000);
            result = `✓ ${action.checked ? 'Checked' : 'Unchecked'} checkbox ${action.selector}`;
            break;

          case 'select_radio':
            await this.selectRadioButton(action.selector, action.by || 'css', action.timeout || 10000);
            result = `✓ Selected radio button ${action.selector}`;
            break;

          case 'upload_file':
            await this.uploadFile(action.selector, action.filePath, action.by || 'css', action.timeout || 10000);
            result = `✓ Uploaded file to ${action.selector}`;
            break;

          case 'drag_and_drop':
            await this.dragAndDrop(action.selector, action.targetSelector, action.by || 'css', action.targetBy || 'css', action.timeout || 10000);
            result = `✓ Dragged ${action.selector} to ${action.targetSelector}`;
            break;

          case 'scroll_to':
            await this.scrollToElement(action.selector, action.by || 'css', action.timeout || 10000);
            result = `✓ Scrolled to ${action.selector}`;
            break;

          case 'wait_for_element':
            await this.waitForElement(action.selector, action.by || 'css', action.timeout || 10000);
            result = `✓ Waited for element ${action.selector}`;
            break;

          case 'wait_for_text':
            await this.driver!.wait(until.elementTextContains(
              this.driver!.findElement(this.getByMethod(action.by || 'css')(action.selector)),
              action.text
            ), action.timeout || 10000);
            result = `✓ Waited for text "${action.text}" in ${action.selector}`;
            break;

          case 'wait_for_url':
            await this.driver!.wait(until.urlContains(action.value), action.timeout || 10000);
            result = `✓ Waited for URL containing "${action.value}"`;
            break;

          case 'execute_script':
            await this.executeScript(action.script, action.args || []);
            result = `✓ Executed script`;
            break;

          case 'switch_to_frame':
            await this.switchToFrame(action.selector, action.by || 'css', action.timeout || 10000);
            result = `✓ Switched to frame ${action.selector}`;
            break;

          case 'switch_to_default':
            await this.switchToDefaultContent();
            result = `✓ Switched to default content`;
            break;

          case 'navigate_to':
            await this.navigateTo(action.value);
            result = `✓ Navigated to ${action.value}`;
            break;

          case 'go_back':
            await this.driver!.navigate().back();
            result = `✓ Navigated back`;
            break;

          case 'go_forward':
            await this.driver!.navigate().forward();
            result = `✓ Navigated forward`;
            break;

          case 'refresh':
            await this.driver!.navigate().refresh();
            result = `✓ Refreshed page`;
            break;

          case 'take_screenshot':
            const screenshotResult = await this.takeScreenshot(action.value, action.checked);
            result = `✓ ${screenshotResult.content[0].text}`;
            break;

          case 'get_text':
            const textElement = await this.driver!.wait(until.elementLocated(this.getByMethod(action.by || 'css')(action.selector)), action.timeout || 10000);
            const text = await textElement.getText();
            result = `✓ Got text from ${action.selector}: "${text}"`;
            break;

          case 'get_attribute':
            const attrElement = await this.driver!.wait(until.elementLocated(this.getByMethod(action.by || 'css')(action.selector)), action.timeout || 10000);
            const attribute = await attrElement.getAttribute(action.value);
            result = `✓ Got attribute "${action.value}" from ${action.selector}: "${attribute}"`;
            break;

          case 'is_displayed':
            const displayElement = await this.driver!.wait(until.elementLocated(this.getByMethod(action.by || 'css')(action.selector)), action.timeout || 10000);
            const isDisplayed = await displayElement.isDisplayed();
            result = `✓ Element ${action.selector} is ${isDisplayed ? 'displayed' : 'not displayed'}`;
            break;

          case 'is_enabled':
            const enabledElement = await this.driver!.wait(until.elementLocated(this.getByMethod(action.by || 'css')(action.selector)), action.timeout || 10000);
            const isEnabled = await enabledElement.isEnabled();
            result = `✓ Element ${action.selector} is ${isEnabled ? 'enabled' : 'disabled'}`;
            break;

          case 'is_selected':
            const selectedElement = await this.driver!.wait(until.elementLocated(this.getByMethod(action.by || 'css')(action.selector)), action.timeout || 10000);
            const isSelected = await selectedElement.isSelected();
            result = `✓ Element ${action.selector} is ${isSelected ? 'selected' : 'not selected'}`;
            break;

          default:
            throw new Error(`Unknown action: ${action.action}`);
        }

        results.push(`Step ${stepNumber}: ${result}`);
        successCount++;

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
      ...(errors.length > 0 ? ['', 'Errors:', ...errors] : [])
    ].join('\n');

    return {
      content: [
        {
          type: 'text',
          text: allResults,
        },
      ],
    };
  }

  async closeBrowser(): Promise<{ content: Array<{ type: string; text: string }> }> {
    if (!this.driver) {
      return {
        content: [
          {
            type: 'text',
            text: 'No browser instance to close',
          },
        ],
      };
    }

    try {
      await this.driver.quit();
      this.driver = null;
      this.consoleLogs = [];

      return {
        content: [
          {
            type: 'text',
            text: 'Browser closed successfully',
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to close browser: ${error instanceof Error ? error.message : String(error)}`);
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
}
