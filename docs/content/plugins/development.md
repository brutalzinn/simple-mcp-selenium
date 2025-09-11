---
title: "Plugin Development"
linkTitle: "Development"
weight: 10
description: "Complete guide for developing MCP Selenium Server plugins"
---

## Overview

MCP Selenium Server supports a powerful plugin system that allows you to extend functionality with custom tools. This guide covers everything you need to know to create, test, and publish plugins.

## Quick Start

### 1. Create Plugin File

Create a new `.js` file in the `plugins/` directory:

```bash
touch plugins/my-awesome-plugin.js
```

### 2. Basic Plugin Structure

```javascript
const myPlugin = {
  name: "my-awesome-plugin",
  version: "1.0.0",
  description: "Does something awesome with the browser",

  tools: [
    // Your tools here
  ],

  handlers: {
    // Your handlers here
  },

  initialize: async (browserManager) => {
    console.log("🚀 My Awesome Plugin loaded");
  },
};

export default myPlugin;
```

### 3. Add Your First Tool

```javascript
tools: [
  {
    name: "my_awesome_tool",
    description: "Does something awesome",
    inputSchema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "Message to display",
        },
      },
      required: ["message"],
    },
  },
];
```

### 4. Implement Handler

```javascript
handlers: {
  my_awesome_tool: async (args, browserManager) => {
    const { message } = args;

    try {
      const browser = browserManager.getBrowser(args.browserId);
      if (!browser) {
        throw new Error('Browser not found');
      }

      const result = await browser.executeScript(`
        alert('${message}');
        return 'Success!';
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

### 5. Test Your Plugin

```bash
# Restart the MCP server
docker-compose restart

# Or for local development
npm run dev
```

## Plugin Architecture

### Core Components

#### 1. Plugin Metadata

```javascript
{
  name: "plugin-name",           // Unique plugin identifier
  version: "1.0.0",              // Semantic version
  description: "What it does",   // Brief description
  author: "Your Name",           // Plugin author
  license: "MIT",                // License type
  homepage: "https://...",       // Plugin homepage
  repository: "https://...",     // Source repository
}
```

#### 2. Tools Definition

```javascript
tools: [
  {
    name: "tool_name", // Tool identifier
    description: "What it does", // Tool description
    inputSchema: {
      // JSON Schema for validation
      type: "object",
      properties: {
        // Parameter definitions
      },
      required: ["param1"],
    },
  },
];
```

#### 3. Handlers Implementation

```javascript
handlers: {
  tool_name: async (args, browserManager) => {
    // Tool implementation
  },
}
```

#### 4. Lifecycle Hooks

```javascript
{
  initialize: async (browserManager) => {
    // Called when plugin loads
  },

  cleanup: async () => {
    // Called when plugin unloads
  },
}
```

## Available APIs

### Browser Manager

The `browserManager` provides these methods:

#### Browser Control

```javascript
// Open a new browser
const result = await browserManager.openBrowser({
  browserId: "custom-id",
  headless: false,
  browserType: "chrome",
});

// Get browser instance
const browser = browserManager.getBrowser("browser-id");

// Close browser
await browserManager.closeBrowser("browser-id");

// List all browsers
const browsers = browserManager.listBrowsers();

// Get browser info
const info = browserManager.getBrowserInfo("browser-id");
```

#### Browser Instance Methods

```javascript
// Navigation
await browser.navigateTo("https://example.com");

// Element interaction
await browser.clickElement({
  selector: "#button",
  by: "css",
  timeout: 5000,
});

await browser.typeText({
  selector: 'input[name="email"]',
  text: "user@example.com",
});

// Advanced interactions
await browser.dragAndDrop(
  { selector: ".source", by: "css" },
  { selector: ".target", by: "css" }
);

// Page information
const title = await browser.getPageTitle();
const url = await browser.getPageUrl();
const elements = await browser.getPageElements("button", 10);

// Screenshots
await browser.takeScreenshot("screenshot.png", true);

// JavaScript execution
const result = await browser.executeScript(`
  return document.title;
`);

// Wait for elements
await browser.waitForElement({
  selector: ".loading",
  timeout: 10000,
});
```

## Input Validation

### JSON Schema

Define input validation using JSON Schema:

```javascript
inputSchema: {
  type: 'object',
  properties: {
    url: {
      type: 'string',
      format: 'uri',
      description: 'URL to navigate to',
    },
    timeout: {
      type: 'number',
      minimum: 1000,
      maximum: 60000,
      default: 10000,
      description: 'Timeout in milliseconds',
    },
    options: {
      type: 'object',
      properties: {
        headless: { type: 'boolean', default: false },
        width: { type: 'number', default: 1280 },
        height: { type: 'number', default: 720 },
      },
    },
  },
  required: ['url'],
}
```

### Runtime Validation

Add additional validation in your handlers:

```javascript
handlers: {
  my_tool: async (args, browserManager) => {
    // Validate required parameters
    if (!args.url) {
      throw new Error('URL is required');
    }

    // Validate URL format
    try {
      new URL(args.url);
    } catch {
      throw new Error('Invalid URL format');
    }

    // Validate timeout range
    if (args.timeout && (args.timeout < 1000 || args.timeout > 60000)) {
      throw new Error('Timeout must be between 1000 and 60000 milliseconds');
    }

    // Your tool logic here...
  },
}
```

## Error Handling

### Best Practices

```javascript
handlers: {
  my_tool: async (args, browserManager) => {
    try {
      // Validate inputs
      if (!args.requiredParam) {
        throw new Error('requiredParam is required');
      }

      // Get browser
      const browser = browserManager.getBrowser(args.browserId);
      if (!browser) {
        throw new Error(`Browser '${args.browserId}' not found`);
      }

      // Perform operation
      const result = await browser.executeScript(`
        // Your JavaScript code
      `);

      // Return success
      return {
        content: [
          {
            type: 'text',
            text: `Operation completed: ${result}`,
          },
        ],
      };

    } catch (error) {
      // Log error for debugging
      console.error('Plugin error:', error);

      // Return user-friendly error
      throw new Error(`Tool failed: ${error.message}`);
    }
  },
}
```

### Error Types

```javascript
// Input validation errors
throw new Error("Invalid parameter: parameterName");

// Browser errors
throw new Error("Browser not found or not available");

// Network errors
throw new Error("Network request failed: timeout");

// Element errors
throw new Error("Element not found: selector");

// Permission errors
throw new Error("Insufficient permissions for this operation");
```

## Testing Plugins

### Unit Testing

```javascript
// test-plugin.js
import { describe, it, expect, beforeEach } from "jest";
import myPlugin from "./my-awesome-plugin.js";

describe("My Awesome Plugin", () => {
  let mockBrowserManager;
  let mockBrowser;

  beforeEach(() => {
    mockBrowser = {
      executeScript: jest.fn(),
      navigateTo: jest.fn(),
      clickElement: jest.fn(),
    };

    mockBrowserManager = {
      getBrowser: jest.fn().mockReturnValue(mockBrowser),
    };
  });

  it("should execute script successfully", async () => {
    mockBrowser.executeScript.mockResolvedValue("Success!");

    const result = await myPlugin.handlers.my_awesome_tool(
      { message: "Hello World" },
      mockBrowserManager
    );

    expect(result.content[0].text).toBe("Result: Success!");
    expect(mockBrowser.executeScript).toHaveBeenCalled();
  });

  it("should handle browser not found error", async () => {
    mockBrowserManager.getBrowser.mockReturnValue(null);

    await expect(
      myPlugin.handlers.my_awesome_tool(
        { message: "Hello World" },
        mockBrowserManager
      )
    ).rejects.toThrow("Browser not found");
  });
});
```

### Integration Testing

```javascript
// integration-test.js
import { BrowserManager } from "../src/browser-manager.js";
import myPlugin from "./my-awesome-plugin.js";

async function testPlugin() {
  const browserManager = new BrowserManager();

  try {
    // Initialize plugin
    await myPlugin.initialize(browserManager);

    // Open browser
    await browserManager.openBrowser({
      browserId: "test-browser",
      headless: true,
    });

    // Test tool
    const result = await myPlugin.handlers.my_awesome_tool(
      { message: "Integration test" },
      browserManager
    );

    console.log("Test result:", result);
  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    // Cleanup
    await browserManager.closeAllBrowsers();
  }
}

testPlugin();
```

## Publishing Plugins

### 1. Prepare for Publication

```javascript
// Add metadata
const myPlugin = {
  name: "my-awesome-plugin",
  version: "1.0.0",
  description: "Does something awesome",
  author: "Your Name",
  license: "MIT",
  homepage: "https://github.com/yourusername/my-awesome-plugin",
  repository: "https://github.com/yourusername/my-awesome-plugin",
  keywords: ["automation", "testing", "browser"],

  // ... rest of plugin
};
```

### 2. Create Documentation

Create a `README.md` for your plugin:

````markdown
# My Awesome Plugin

A powerful plugin for MCP Selenium Server that does awesome things.

## Installation

```bash
cp my-awesome-plugin.js plugins/
```
````

## Usage

### Basic Usage

```json
{
  "tool": "my_awesome_tool",
  "arguments": {
    "message": "Hello World"
  }
}
```

## API Reference

### my_awesome_tool

Does something awesome.

**Parameters:**

- `message` (string, required) - Message to display

**Example:**

```json
{
  "tool": "my_awesome_tool",
  "arguments": {
    "message": "Hello World"
  }
}
```

## License

MIT

````

### 3. Submit to Community Gallery

Follow the [Community Plugins Guide]({{< relref "community-plugins" >}}) to submit your plugin to the documentation.

## Advanced Topics

### Plugin Dependencies

```javascript
const myPlugin = {
  name: "my-plugin",
  dependencies: {
    "axios": "^1.0.0",
    "lodash": "^4.17.21"
  },

  initialize: async (browserManager) => {
    // Load dependencies
    const axios = await import('axios');
    const _ = await import('lodash');

    // Use dependencies
    this.axios = axios.default;
    this._ = _.default;
  },
};
````

### Plugin Configuration

```javascript
const myPlugin = {
  name: "my-plugin",

  config: {
    defaultTimeout: 10000,
    retryAttempts: 3,
    debugMode: false,
  },

  handlers: {
    my_tool: async (args, browserManager) => {
      const timeout = args.timeout || this.config.defaultTimeout;
      const retries = this.config.retryAttempts;

      // Use configuration...
    },
  },
};
```

### Plugin Events

```javascript
const myPlugin = {
  name: "my-plugin",

  events: {
    onBrowserOpen: (browserId) => {
      console.log(`Browser ${browserId} opened`);
    },

    onBrowserClose: (browserId) => {
      console.log(`Browser ${browserId} closed`);
    },
  },

  initialize: async (browserManager) => {
    // Subscribe to events
    browserManager.on("browser:open", this.events.onBrowserOpen);
    browserManager.on("browser:close", this.events.onBrowserClose);
  },
};
```

## Resources

### Documentation

- [API Reference]({{< relref "/api-reference" >}})
- [Examples]({{< relref "/examples" >}})
- [Community Plugins]({{< relref "community-plugins" >}})

### Tools

- [Plugin Template](https://github.com/robertocpaes/mcp-selenium/tree/main/plugin-templates)
- [Example Plugins](https://github.com/robertocpaes/mcp-selenium/tree/main/plugins)
- [Development Scripts](https://github.com/robertocpaes/mcp-selenium/tree/main/scripts)

### Community

- [GitHub Discussions](https://github.com/robertocpaes/mcp-selenium/discussions)
- [Plugin Showcase](https://github.com/robertocpaes/mcp-selenium/discussions/categories/plugin-showcase)
- [Discord Server](https://discord.gg/mcp-selenium)

---

**Happy plugin developing!** 🚀
