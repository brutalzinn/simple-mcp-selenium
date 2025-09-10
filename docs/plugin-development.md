# 🔌 Plugin Development Guide

This guide shows you how to create custom plugins for the MCP Selenium Server to extend its functionality.

## 📁 Plugin Structure

Plugins are JavaScript/ES modules placed in the `plugins/` directory. Each plugin should export a default object with the following structure:

```javascript
const myPlugin = {
  name: "my-plugin",
  version: "1.0.0",
  description: "Description of what this plugin does",

  tools: [
    // Array of MCP tools this plugin provides
  ],

  handlers: {
    // Object mapping tool names to handler functions
  },

  initialize: async (browserCore) => {
    // Optional: Called when plugin is loaded
  },

  cleanup: async () => {
    // Optional: Called when plugin is unloaded
  },
};

export default myPlugin;
```

## 🛠️ Creating a Plugin

### 1. Create Plugin File

Create a new `.js` file in the `plugins/` directory:

```bash
touch plugins/my-custom-plugin.js
```

### 2. Define Tools

Each tool must have:

- `name`: Unique tool name
- `description`: What the tool does
- `inputSchema`: JSON schema for input validation

```javascript
tools: [
  {
    name: 'my_custom_tool',
    description: 'Does something useful with the browser',
    inputSchema: {
      type: 'object',
      properties: {
        parameter1: {
          type: 'string',
          description: 'Description of parameter1',
        },
        parameter2: {
          type: 'number',
          description: 'Description of parameter2',
          default: 1000,
        },
      },
      required: ['parameter1'],
    },
  },
],
```

### 3. Implement Handlers

Each tool needs a corresponding handler function:

```javascript
handlers: {
  my_custom_tool: async (args, browserCore) => {
    const { parameter1, parameter2 = 1000 } = args;

    try {
      // Use browserCore to interact with the browser
      const result = await browserCore.executeScript(`
        // Your JavaScript code here
        return document.title;
      `);

      return {
        content: [
          {
            type: 'text',
            text: `Result: ${result}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Tool failed: ${error.message}`);
    }
  },
},
```

## 🎯 Available Browser Core Methods

The `browserCore` object provides these methods:

### Browser Control

- `openBrowser(options)` - Open a new browser instance
- `closeBrowser()` - Close the current browser
- `navigateTo(url)` - Navigate to a URL

### Element Interaction

- `clickElement(selector, options)` - Click an element
- `typeText(selector, text, options)` - Type text into an element
- `hoverElement(selector, options)` - Hover over an element
- `doubleClickElement(selector, options)` - Double-click an element
- `rightClickElement(selector, options)` - Right-click an element
- `dragAndDrop(sourceSelector, targetSelector, options)` - Drag and drop

### Page Information

- `getPageTitle()` - Get page title
- `getPageUrl()` - Get current URL
- `getPageElements(selector, limit)` - Get page elements
- `takeScreenshot(options)` - Take a screenshot

### Advanced Operations

- `executeScript(script, ...args)` - Execute JavaScript
- `waitForElement(selector, options)` - Wait for element to appear
- `executeActionSequence(actions)` - Execute multiple actions

## 📝 Example Plugin - CAPTCHA Solver

Here's a complete example plugin that handles CAPTCHA detection and user interaction:

```javascript
const captchaSolverPlugin = {
  name: "captcha-solver",
  version: "1.0.0",
  description: "CAPTCHA detection and manual solving assistance",

  tools: [
    {
      name: "detect_captcha",
      description: "Detect if there is a CAPTCHA on the current page",
      inputSchema: {
        type: "object",
        properties: {
          timeout: {
            type: "number",
            description:
              "Timeout in milliseconds to wait for CAPTCHA detection",
            default: 5000,
          },
        },
      },
    },
    {
      name: "wait_for_captcha_solve",
      description: "Wait for user to solve CAPTCHA manually",
      inputSchema: {
        type: "object",
        properties: {
          timeout: {
            type: "number",
            description:
              "Maximum time to wait for CAPTCHA solution in milliseconds",
            default: 300000, // 5 minutes
          },
        },
      },
    },
  ],

  handlers: {
    detect_captcha: async (args, browserCore) => {
      const { timeout = 5000 } = args;

      try {
        const captchaSelectors = [
          ".g-recaptcha",
          "#recaptcha",
          ".recaptcha-checkbox",
          'iframe[src*="recaptcha"]',
          ".h-captcha",
          "#hcaptcha",
          'iframe[src*="hcaptcha"]',
          '[class*="captcha"]',
          '[id*="captcha"]',
          'img[alt*="captcha"]',
          'img[src*="captcha"]',
          'input[name*="captcha"]',
          'input[id*="captcha"]',
        ];

        const captchaFound = await browserCore.executeScript(`
          const selectors = ${JSON.stringify(captchaSelectors)};
          for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element && element.offsetParent !== null) {
              return {
                found: true,
                selector: selector,
                type: selector.includes('recaptcha') ? 'recaptcha' : 
                      selector.includes('hcaptcha') ? 'hcaptcha' : 'generic'
              };
            }
          }
          return { found: false };
        `);

        if (captchaFound.found) {
          return {
            content: [
              {
                type: "text",
                text: `🔒 CAPTCHA detected: ${captchaFound.type} (${captchaFound.selector})`,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: "✅ No CAPTCHA detected on the current page",
              },
            ],
          };
        }
      } catch (error) {
        throw new Error(`Failed to detect CAPTCHA: ${error.message}`);
      }
    },

    wait_for_captcha_solve: async (args, browserCore) => {
      const { timeout = 300000 } = args;

      try {
        console.log(
          "🔒 CAPTCHA detected! Please solve it manually in the browser window."
        );
        console.log("⏳ Waiting for CAPTCHA to be solved...");

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
                resolve({
                  content: [
                    {
                      type: "text",
                      text: "✅ CAPTCHA solved successfully! Continuing automation...",
                    },
                  ],
                });
                return;
              }

              if (Date.now() - startTime > timeout) {
                reject(
                  new Error(
                    `Timeout: CAPTCHA not solved within ${
                      timeout / 1000
                    } seconds`
                  )
                );
                return;
              }

              setTimeout(checkCaptcha, 2000);
            } catch (error) {
              reject(
                new Error(`Error checking CAPTCHA status: ${error.message}`)
              );
            }
          };

          checkCaptcha();
        });
      } catch (error) {
        throw new Error(`Failed to wait for CAPTCHA solve: ${error.message}`);
      }
    },
  },

  initialize: async (browserCore) => {
    console.log("🔒 CAPTCHA Solver plugin loaded");
  },
};

export default captchaSolverPlugin;
```

## 🚀 Using Your Plugin

1. **Save your plugin** in the `plugins/` directory
2. **Restart the MCP server** using `./scripts/start.sh` or `docker compose restart`
3. **Use the new tools** in Cursor IDE

The plugin tools will automatically appear in the MCP tool list and can be used just like built-in tools.

### **Plugin Management Commands**

```bash
# Start server with plugins
./scripts/start.sh

# Stop server
./scripts/stop.sh

# Test browser functionality
node scripts/test-docker-browser.js

# View server logs
docker compose logs -f
```

## 🔧 Plugin Development Tips

### Error Handling

Always wrap your code in try-catch blocks and provide meaningful error messages:

```javascript
try {
  // Your code here
} catch (error) {
  throw new Error(`Plugin operation failed: ${error.message}`);
}
```

### Input Validation

Use the input schema to validate inputs, but also add runtime validation:

```javascript
if (!args.requiredParameter) {
  throw new Error("requiredParameter is required");
}
```

### Async Operations

All handlers should be async functions. Use `await` for browser operations:

```javascript
handlers: {
  my_tool: async (args, browserCore) => {
    const result = await browserCore.executeScript('return document.title');
    // Process result...
  },
},
```

### Return Format

Always return results in the MCP format:

```javascript
return {
  content: [
    {
      type: "text",
      text: "Your result here",
    },
  ],
};
```

## 📚 Advanced Examples

### Custom Screenshot Tool

```javascript
{
  name: 'take_element_screenshot',
  description: 'Take a screenshot of a specific element',
  inputSchema: {
    type: 'object',
    properties: {
      selector: { type: 'string' },
      filename: { type: 'string' },
    },
    required: ['selector'],
  },
},
```

### Data Extraction Tool

```javascript
{
  name: 'extract_table_data',
  description: 'Extract data from a table',
  inputSchema: {
    type: 'object',
    properties: {
      tableSelector: { type: 'string', default: 'table' },
    },
  },
},
```

## 🎉 Ready to Create!

You now have everything you need to create powerful custom plugins for the MCP Selenium Server. Start with the example plugin and modify it to suit your needs!

**Happy plugin development!** 🚀
