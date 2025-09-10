import { readline } from 'readline';

const captchaHandlerPlugin = {
  name: 'captcha-handler',
  version: '1.0.0',
  description: 'Plugin for handling CAPTCHA challenges in browser automation',
  
  tools: [
    {
      name: 'detect_captcha',
      description: 'Detect if there is a CAPTCHA on the current page',
      inputSchema: {
        type: 'object',
        properties: {
          timeout: {
            type: 'number',
            description: 'Timeout in milliseconds to wait for CAPTCHA detection',
            default: 5000,
          },
        },
      },
    },
    {
      name: 'wait_for_captcha_solve',
      description: 'Wait for user to solve CAPTCHA manually',
      inputSchema: {
        type: 'object',
        properties: {
          timeout: {
            type: 'number',
            description: 'Maximum time to wait for CAPTCHA solution in milliseconds',
            default: 300000, // 5 minutes
          },
          checkInterval: {
            type: 'number',
            description: 'Interval in milliseconds to check if CAPTCHA is solved',
            default: 2000,
          },
        },
      },
    },
    {
      name: 'solve_captcha_automatically',
      description: 'Attempt to solve CAPTCHA automatically using various methods',
      inputSchema: {
        type: 'object',
        properties: {
          method: {
            type: 'string',
            enum: ['recaptcha', 'hcaptcha', 'image', 'text'],
            description: 'Type of CAPTCHA to solve',
            default: 'recaptcha',
          },
          apiKey: {
            type: 'string',
            description: 'API key for CAPTCHA solving service (optional)',
          },
        },
      },
    },
    {
      name: 'skip_captcha_page',
      description: 'Skip pages that contain CAPTCHAs',
      inputSchema: {
        type: 'object',
        properties: {
          redirectUrl: {
            type: 'string',
            description: 'URL to redirect to when CAPTCHA is detected',
          },
        },
      },
    },
  ],

  handlers: {
    detect_captcha: async (args) => {
      const { timeout = 5000 } = args;
      const browserManager = this.browserManager;
      
      if (!browserManager.driver) {
        throw new Error('Browser not opened. Please call open_browser first.');
      }

      try {
        const captchaSelectors = [
          // reCAPTCHA
          '.g-recaptcha',
          '#recaptcha',
          '.recaptcha-checkbox',
          'iframe[src*="recaptcha"]',
          
          // hCaptcha
          '.h-captcha',
          '#hcaptcha',
          'iframe[src*="hcaptcha"]',
          
          // Generic CAPTCHA
          '[class*="captcha"]',
          '[id*="captcha"]',
          'img[alt*="captcha"]',
          'img[src*="captcha"]',
          
          // Text-based CAPTCHA
          'input[name*="captcha"]',
          'input[id*="captcha"]',
        ];

        const captchaFound = await browserManager.driver.executeScript(`
          const selectors = ${JSON.stringify(captchaSelectors)};
          for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element && element.offsetParent !== null) {
              return {
                found: true,
                selector: selector,
                type: selector.includes('recaptcha') ? 'recaptcha' : 
                      selector.includes('hcaptcha') ? 'hcaptcha' : 'generic',
                element: {
                  tagName: element.tagName,
                  className: element.className,
                  id: element.id
                }
              };
            }
          }
          return { found: false };
        `);

        if (captchaFound.found) {
          return {
            content: [
              {
                type: 'text',
                text: `CAPTCHA detected: ${captchaFound.type} (${captchaFound.selector})\nElement: ${captchaFound.element.tagName}${captchaFound.element.id ? `#${captchaFound.element.id}` : ''}${captchaFound.element.className ? `.${captchaFound.element.className}` : ''}`,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: 'text',
                text: 'No CAPTCHA detected on the current page',
              },
            ],
          };
        }
      } catch (error) {
        throw new Error(`Failed to detect CAPTCHA: ${error.message}`);
      }
    },

    wait_for_captcha_solve: async (args) => {
      const { timeout = 300000, checkInterval = 2000 } = args;
      const browserManager = this.browserManager;
      
      if (!browserManager.driver) {
        throw new Error('Browser not opened. Please call open_browser first.');
      }

      console.error('🔒 CAPTCHA detected! Please solve it manually in the browser window.');
      console.error('⏳ Waiting for CAPTCHA to be solved...');
      console.error('💡 You can close this terminal or press Ctrl+C to cancel.');

      const startTime = Date.now();
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      return new Promise((resolve, reject) => {
        const checkCaptcha = async () => {
          try {
            // Check if CAPTCHA is still present
            const captchaStillPresent = await browserManager.driver.executeScript(`
              const selectors = [
                '.g-recaptcha', '#recaptcha', '.recaptcha-checkbox',
                '.h-captcha', '#hcaptcha',
                '[class*="captcha"]', '[id*="captcha"]'
              ];
              for (const selector of selectors) {
                const element = document.querySelector(selector);
                if (element && element.offsetParent !== null) {
                  return true;
                }
              }
              return false;
            `);

            if (!captchaStillPresent) {
              rl.close();
              resolve({
                content: [
                  {
                    type: 'text',
                    text: '✅ CAPTCHA solved successfully! Continuing automation...',
                  },
                ],
              });
              return;
            }

            // Check timeout
            if (Date.now() - startTime > timeout) {
              rl.close();
              reject(new Error(`Timeout: CAPTCHA not solved within ${timeout / 1000} seconds`));
              return;
            }

            // Continue checking
            setTimeout(checkCaptcha, checkInterval);
          } catch (error) {
            rl.close();
            reject(new Error(`Error checking CAPTCHA status: ${error.message}`));
          }
        };

        // Start checking
        checkCaptcha();

        // Handle user cancellation
        rl.on('SIGINT', () => {
          rl.close();
          reject(new Error('CAPTCHA solving cancelled by user'));
        });
      });
    },

    solve_captcha_automatically: async (args) => {
      const { method = 'recaptcha', apiKey } = args;
      const browserManager = this.browserManager;
      
      if (!browserManager.driver) {
        throw new Error('Browser not opened. Please call open_browser first.');
      }

      try {
        if (method === 'recaptcha') {
          // Try to solve reCAPTCHA automatically
          const result = await browserManager.driver.executeScript(`
            // Look for reCAPTCHA checkbox
            const checkbox = document.querySelector('.recaptcha-checkbox');
            if (checkbox) {
              checkbox.click();
              return { success: true, method: 'checkbox_click' };
            }
            
            // Look for reCAPTCHA iframe
            const iframe = document.querySelector('iframe[src*="recaptcha"]');
            if (iframe) {
              return { success: false, method: 'iframe_found', message: 'reCAPTCHA iframe detected - manual solving required' };
            }
            
            return { success: false, method: 'not_found', message: 'No reCAPTCHA elements found' };
          `);

          if (result.success) {
            return {
              content: [
                {
                  type: 'text',
                  text: `✅ reCAPTCHA solved automatically using ${result.method}`,
                },
              ],
            };
          } else {
            return {
              content: [
                {
                  type: 'text',
                  text: `❌ Automatic reCAPTCHA solving failed: ${result.message}`,
                },
              ],
            };
          }
        } else if (method === 'hcaptcha') {
          // Try to solve hCaptcha automatically
          const result = await browserManager.driver.executeScript(`
            const checkbox = document.querySelector('.h-captcha');
            if (checkbox) {
              checkbox.click();
              return { success: true, method: 'checkbox_click' };
            }
            return { success: false, method: 'not_found', message: 'No hCaptcha elements found' };
          `);

          if (result.success) {
            return {
              content: [
                {
                  type: 'text',
                  text: `✅ hCaptcha solved automatically using ${result.method}`,
                },
              ],
            };
          } else {
            return {
              content: [
                {
                  type: 'text',
                  text: `❌ Automatic hCaptcha solving failed: ${result.message}`,
                },
              ],
            };
          }
        } else {
          return {
            content: [
              {
                type: 'text',
                text: `❌ Automatic solving not implemented for ${method} CAPTCHA type`,
              },
            ],
          };
        }
      } catch (error) {
        throw new Error(`Failed to solve CAPTCHA automatically: ${error.message}`);
      }
    },

    skip_captcha_page: async (args) => {
      const { redirectUrl } = args;
      const browserManager = this.browserManager;
      
      if (!browserManager.driver) {
        throw new Error('Browser not opened. Please call open_browser first.');
      }

      try {
        // First detect if CAPTCHA is present
        const captchaDetection = await this.handlers.detect_captcha.call(this, {});
        
        if (captchaDetection.content[0].text.includes('CAPTCHA detected')) {
          if (redirectUrl) {
            await browserManager.navigateTo(redirectUrl);
            return {
              content: [
                {
                  type: 'text',
                  text: `🔄 CAPTCHA page detected, redirected to: ${redirectUrl}`,
                },
              ],
            };
          } else {
            // Go back to previous page
            await browserManager.driver.navigate().back();
            return {
              content: [
                {
                  type: 'text',
                  text: '🔄 CAPTCHA page detected, navigated back to previous page',
                },
              ],
            };
          }
        } else {
          return {
            content: [
              {
                type: 'text',
                text: 'ℹ️ No CAPTCHA detected on current page, no action taken',
              },
            ],
          };
        }
      } catch (error) {
        throw new Error(`Failed to skip CAPTCHA page: ${error.message}`);
      }
    },
  },

  initialize: async (browserManager) => {
    this.browserManager = browserManager;
    console.error('🔒 CAPTCHA Handler plugin initialized');
  },

  cleanup: async () => {
    console.error('🔒 CAPTCHA Handler plugin cleaned up');
  },
};

export default captchaHandlerPlugin;
