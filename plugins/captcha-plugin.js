
const captchaPlugin = {
  name: 'captcha-plugin',
  version: '1.0.0',
  description: 'CAPTCHA detection and user interaction plugin',
  
  tools: [
    {
      name: 'handle_captcha_workflow',
      description: 'Automatically detect CAPTCHA and wait for user to solve it',
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
          takeScreenshot: {
            type: 'boolean',
            description: 'Take a screenshot when CAPTCHA is detected',
            default: true,
          },
        },
      },
    },
    {
      name: 'check_captcha_status',
      description: 'Check if there is currently a CAPTCHA on the page',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
  ],

  handlers: {
    handle_captcha_workflow: async (args, browserCore) => {
      const { timeout = 300000, checkInterval = 2000, takeScreenshot = true } = args;
      
      try {
        const captchaStatus = await browserCore.executeScript(`
          const captchaSelectors = [
            '.g-recaptcha', '#recaptcha', '.recaptcha-checkbox', 'iframe[src*="recaptcha"]',
            '.h-captcha', '#hcaptcha', 'iframe[src*="hcaptcha"]',
            '[class*="captcha"]', '[id*="captcha"]', 'img[alt*="captcha"]', 'img[src*="captcha"]',
            'input[name*="captcha"]', 'input[id*="captcha"]'
          ];
          
          for (const selector of captchaSelectors) {
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

        if (!captchaStatus.found) {
          return {
            content: [
              {
                type: 'text',
                text: '✅ No CAPTCHA detected on the current page. Continuing...',
              },
            ],
          };
        }

        console.log('🔒 CAPTCHA DETECTED!');
        console.log(`📋 Type: ${captchaStatus.type}`);
        console.log(`🎯 Selector: ${captchaStatus.selector}`);
        console.log('👤 Please solve the CAPTCHA manually in the browser window...');
        console.log('⏳ Waiting for you to solve it...');
        console.log('💡 You can close this terminal or press Ctrl+C to cancel.');

        if (takeScreenshot) {
          try {
            await browserCore.takeScreenshot({
              filename: `captcha-detected-${Date.now()}.png`,
              fullPage: true,
            });
            console.log('📸 Screenshot taken of CAPTCHA page');
          } catch (screenshotError) {
            console.log('⚠️ Could not take screenshot:', screenshotError.message);
          }
        }

        const startTime = Date.now();
        
        return new Promise((resolve, reject) => {
          const checkCaptcha = async () => {
            try {
              const captchaStillPresent = await browserCore.executeScript(`
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
                const solveTime = Date.now() - startTime;
                console.log(`✅ CAPTCHA solved successfully in ${Math.round(solveTime / 1000)} seconds!`);
                
                resolve({
                  content: [
                    {
                      type: 'text',
                      text: `✅ CAPTCHA solved successfully! Continuing automation...\n⏱️ Solve time: ${Math.round(solveTime / 1000)} seconds`,
                    },
                  ],
                });
                return;
              }

              if (Date.now() - startTime > timeout) {
                const timeoutMinutes = Math.round(timeout / 60000);
                reject(new Error(`Timeout: CAPTCHA not solved within ${timeoutMinutes} minutes`));
                return;
              }

              const elapsed = Math.round((Date.now() - startTime) / 1000);
              const remaining = Math.round((timeout - (Date.now() - startTime)) / 1000);
              console.log(`⏳ Still waiting... (${elapsed}s elapsed, ${remaining}s remaining)`);

              setTimeout(checkCaptcha, checkInterval);
            } catch (error) {
              reject(new Error(`Error checking CAPTCHA status: ${error.message}`));
            }
          };

          checkCaptcha();
        });
      } catch (error) {
        throw new Error(`CAPTCHA workflow failed: ${error.message}`);
      }
    },

    check_captcha_status: async (args, browserCore) => {
      try {
        const captchaStatus = await browserCore.executeScript(`
          const captchaSelectors = [
            '.g-recaptcha', '#recaptcha', '.recaptcha-checkbox', 'iframe[src*="recaptcha"]',
            '.h-captcha', '#hcaptcha', 'iframe[src*="hcaptcha"]',
            '[class*="captcha"]', '[id*="captcha"]', 'img[alt*="captcha"]', 'img[src*="captcha"]',
            'input[name*="captcha"]', 'input[id*="captcha"]'
          ];
          
          const foundCaptchas = [];
          for (const selector of captchaSelectors) {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
              if (element.offsetParent !== null) {
                foundCaptchas.push({
                  selector: selector,
                  type: selector.includes('recaptcha') ? 'recaptcha' : 
                        selector.includes('hcaptcha') ? 'hcaptcha' : 'generic',
                  element: {
                    tagName: element.tagName,
                    className: element.className,
                    id: element.id
                  }
                });
              }
            });
          }
          
          return {
            found: foundCaptchas.length > 0,
            count: foundCaptchas.length,
            captchas: foundCaptchas
          };
        `);

        if (captchaStatus.found) {
          return {
            content: [
              {
                type: 'text',
                text: `🔒 CAPTCHA Status: ${captchaStatus.count} CAPTCHA(s) detected\n${captchaStatus.captchas.map(c => `- ${c.type} (${c.selector})`).join('\n')}`,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: 'text',
                text: '✅ No CAPTCHAs detected on the current page',
              },
            ],
          };
        }
      } catch (error) {
        throw new Error(`Failed to check CAPTCHA status: ${error.message}`);
      }
    },
  },

  initialize: async (browserCore) => {
    console.log('🔒 CAPTCHA plugin initialized');
  },

  cleanup: async () => {
    console.log('🔒 CAPTCHA plugin cleaned up');
  },
};

export default captchaPlugin;
