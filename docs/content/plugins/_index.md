---
title: "Plugins"
linkTitle: "Plugins"
weight: 50
description: "Extend MCP Selenium Server functionality with custom plugins"
---

## Overview

MCP Selenium Server supports a powerful plugin system that allows you to extend functionality with custom tools. Plugins are JavaScript/ES modules that integrate seamlessly with the server.

## Built-in Plugins

### CAPTCHA Solver Plugin

Handles CAPTCHA detection and manual solving assistance.

**Tools:**

- `detect_captcha` - Detect if there is a CAPTCHA on the current page
- `wait_for_captcha_solve` - Wait for user to solve CAPTCHA manually

**Example:**

```json
{
  "tool": "detect_captcha",
  "arguments": {
    "timeout": 5000
  }
}
```

### Google Search Plugin

Provides Google search functionality.

**Tools:**

- `google_search` - Search on Google with custom queries

**Example:**

```json
{
  "tool": "google_search",
  "arguments": {
    "query": "MCP Selenium automation"
  }
}
```

### Hello World Demo Plugin

Simple demonstration plugin.

**Tools:**

- `hello_world_demo` - Run a hello world demonstration

## Creating Custom Plugins

### Plugin Structure

Create a new `.js` file in the `plugins/` directory:

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

  initialize: async (browserManager) => {
    // Optional: Called when plugin is loaded
  },

  cleanup: async () => {
    // Optional: Called when plugin is unloaded
  },
};

export default myPlugin;
```

### Tool Definition

Each tool must have:

```javascript
tools: [
  {
    name: "my_custom_tool",
    description: "Does something useful with the browser",
    inputSchema: {
      type: "object",
      properties: {
        parameter1: {
          type: "string",
          description: "Description of parameter1",
        },
        parameter2: {
          type: "number",
          description: "Description of parameter2",
          default: 1000,
        },
      },
      required: ["parameter1"],
    },
  },
];
```

### Handler Implementation

Each tool needs a corresponding handler function:

```javascript
handlers: {
  my_custom_tool: async (args, browserManager) => {
    const { parameter1, parameter2 = 1000 } = args;

    try {
      // Get browser instance
      const browser = browserManager.getBrowser(args.browserId);
      if (!browser) {
        throw new Error('Browser not found');
      }

      // Use browser to interact with the page
      const result = await browser.executeScript(`
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
}
```

## Available Browser Manager Methods

The `browserManager` object provides these methods:

### Browser Control

- `openBrowser(options)` - Open a new browser instance
- `closeBrowser(browserId)` - Close a specific browser
- `closeAllBrowsers()` - Close all browsers
- `getBrowser(browserId)` - Get browser instance
- `listBrowsers()` - List all active browsers
- `getBrowserInfo(browserId)` - Get browser information

### Browser Instance Methods

Once you have a browser instance, you can use:

- `navigateTo(url)` - Navigate to URL
- `clickElement(options)` - Click element
- `typeText(options)` - Type text
- `hoverElement(options)` - Hover over element
- `dragAndDrop(sourceOptions, targetOptions)` - Drag and drop
- `executeScript(script, args)` - Execute JavaScript
- `takeScreenshot(filename, fullPage)` - Take screenshot
- `getPageTitle()` - Get page title
- `getPageUrl()` - Get page URL
- `getPageElements(selector, limit)` - Get page elements
- `waitForElement(options)` - Wait for element

## Example Plugin - Data Extractor

Here's a complete example plugin that extracts data from tables:

```javascript
const dataExtractorPlugin = {
  name: "data-extractor",
  version: "1.0.0",
  description: "Extract data from HTML tables",

  tools: [
    {
      name: "extract_table_data",
      description: "Extract data from a table on the current page",
      inputSchema: {
        type: "object",
        properties: {
          tableSelector: {
            type: "string",
            description: "CSS selector for the table",
            default: "table",
          },
          includeHeaders: {
            type: "boolean",
            description: "Whether to include table headers",
            default: true,
          },
          browserId: {
            type: "string",
            description: "Browser ID to use",
          },
        },
      },
    },
  ],

  handlers: {
    extract_table_data: async (args, browserManager) => {
      const {
        tableSelector = "table",
        includeHeaders = true,
        browserId,
      } = args;

      try {
        const browser = browserManager.getBrowser(browserId);
        if (!browser) {
          throw new Error("Browser not found");
        }

        const tableData = await browser.executeScript(`
          const table = document.querySelector('${tableSelector}');
          if (!table) {
            return { error: 'Table not found' };
          }

          const rows = Array.from(table.querySelectorAll('tr'));
          const data = [];

          rows.forEach((row, rowIndex) => {
            if (rowIndex === 0 && !${includeHeaders}) return;

            const cells = Array.from(row.querySelectorAll('td, th'));
            const rowData = cells.map(cell => cell.textContent.trim());
            data.push(rowData);
          });

          return {
            success: true,
            data: data,
            rowCount: data.length,
            columnCount: data[0] ? data[0].length : 0
          };
        `);

        if (tableData.error) {
          throw new Error(tableData.error);
        }

        return {
          content: [
            {
              type: "text",
              text: `Extracted ${tableData.rowCount} rows with ${tableData.columnCount} columns`,
            },
            {
              type: "text",
              text: JSON.stringify(tableData.data, null, 2),
            },
          ],
        };
      } catch (error) {
        throw new Error(`Failed to extract table data: ${error.message}`);
      }
    },
  },

  initialize: async (browserManager) => {
    console.log("📊 Data Extractor plugin loaded");
  },
};

export default dataExtractorPlugin;
```

## Example Plugin - Screenshot Manager

Advanced screenshot plugin with multiple capture modes:

```javascript
const screenshotManagerPlugin = {
  name: "screenshot-manager",
  version: "1.0.0",
  description: "Advanced screenshot management",

  tools: [
    {
      name: "take_element_screenshot",
      description: "Take a screenshot of a specific element",
      inputSchema: {
        type: "object",
        properties: {
          selector: {
            type: "string",
            description: "CSS selector for the element",
          },
          filename: {
            type: "string",
            description: "Filename for the screenshot",
          },
          browserId: {
            type: "string",
            description: "Browser ID to use",
          },
        },
        required: ["selector"],
      },
    },
    {
      name: "take_full_page_screenshot",
      description: "Take a full page screenshot",
      inputSchema: {
        type: "object",
        properties: {
          filename: {
            type: "string",
            description: "Filename for the screenshot",
          },
          browserId: {
            type: "string",
            description: "Browser ID to use",
          },
        },
      },
    },
  ],

  handlers: {
    take_element_screenshot: async (args, browserManager) => {
      const { selector, filename, browserId } = args;

      try {
        const browser = browserManager.getBrowser(browserId);
        if (!browser) {
          throw new Error("Browser not found");
        }

        // Wait for element to be visible
        await browser.waitForElement({
          selector,
          timeout: 5000,
        });

        // Take screenshot
        const result = await browser.takeScreenshot(
          filename || `element-${Date.now()}.png`,
          false
        );

        return {
          content: [
            {
              type: "text",
              text: `Element screenshot saved: ${result.data?.filepath}`,
            },
          ],
        };
      } catch (error) {
        throw new Error(`Failed to take element screenshot: ${error.message}`);
      }
    },

    take_full_page_screenshot: async (args, browserManager) => {
      const { filename, browserId } = args;

      try {
        const browser = browserManager.getBrowser(browserId);
        if (!browser) {
          throw new Error("Browser not found");
        }

        const result = await browser.takeScreenshot(
          filename || `fullpage-${Date.now()}.png`,
          true
        );

        return {
          content: [
            {
              type: "text",
              text: `Full page screenshot saved: ${result.data?.filepath}`,
            },
          ],
        };
      } catch (error) {
        throw new Error(
          `Failed to take full page screenshot: ${error.message}`
        );
      }
    },
  },

  initialize: async (browserManager) => {
    console.log("📸 Screenshot Manager plugin loaded");
  },
};

export default screenshotManagerPlugin;
```

## Plugin Development Tips

### Error Handling

Always wrap your code in try-catch blocks:

```javascript
try {
  // Your code here
} catch (error) {
  throw new Error(`Plugin operation failed: ${error.message}`);
}
```

### Input Validation

Validate inputs at runtime:

```javascript
if (!args.requiredParameter) {
  throw new Error("requiredParameter is required");
}
```

### Async Operations

All handlers should be async functions:

```javascript
handlers: {
  my_tool: async (args, browserManager) => {
    const browser = browserManager.getBrowser(args.browserId);
    const result = await browser.executeScript('return document.title');
    // Process result...
  },
}
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

## Using Plugins

1. **Save your plugin** in the `plugins/` directory
2. **Restart the MCP server** using `./scripts/start.sh` or `docker compose restart`
3. **Use the new tools** in Cursor IDE

The plugin tools will automatically appear in the MCP tool list and can be used just like built-in tools.

## Plugin Management

### Development Commands

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

### Debugging Plugins

Enable debug logging in your plugin:

```javascript
console.log("Plugin debug info:", debugData);
```

Check server logs for plugin output:

```bash
docker compose logs -f | grep "Plugin"
```

## Advanced Plugin Examples

### Form Filler Plugin

Automatically fill forms with test data:

```javascript
{
  name: "fill_form_with_test_data",
  description: "Fill a form with predefined test data",
  inputSchema: {
    type: "object",
    properties: {
      formSelector: { type: "string", default: "form" },
      testData: { type: "object" },
    },
  },
}
```

### Performance Monitor Plugin

Monitor page performance:

```javascript
{
  name: "get_page_performance",
  description: "Get page performance metrics",
  inputSchema: {
    type: "object",
    properties: {
      browserId: { type: "string" },
    },
  },
}
```

## Contributing Plugins

We welcome community contributions! To contribute a plugin:

1. Create your plugin following the structure above
2. Add comprehensive documentation
3. Include example usage
4. Test thoroughly
5. Submit a pull request

## Plugin Gallery

Visit our [Plugin Gallery](https://github.com/robertocpaes/mcp-selenium/discussions/categories/plugins) to see community-contributed plugins and share your own!
