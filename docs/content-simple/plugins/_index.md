---
title: "Plugins"
description: "Extend MCP Selenium Server with custom plugins"
---

# Plugins

Extend the MCP Selenium Server with custom plugins to add new functionality and tools.

## Plugin System

The MCP Selenium Server includes a powerful plugin system that allows you to:

- Add custom MCP tools
- Extend browser automation capabilities
- Integrate with external services
- Create reusable automation components

## Creating a Plugin

### Basic Plugin Structure

```javascript
// plugins/my-plugin.js
module.exports = {
  name: "my-plugin",
  version: "1.0.0",
  description: "My custom plugin",

  tools: [
    {
      name: "my_custom_tool",
      description: "Performs a custom operation",
      inputSchema: {
        type: "object",
        properties: {
          parameter1: {
            type: "string",
            description: "First parameter",
          },
          parameter2: {
            type: "number",
            description: "Second parameter",
          },
        },
        required: ["parameter1"],
      },
    },
  ],

  handlers: {
    my_custom_tool: async (args, browserManager) => {
      // Your custom logic here
      const browser = browserManager.getBrowser(args.browserId);

      // Perform operations using the browser instance
      // Return result in MCP format
      return {
        success: true,
        message: "Custom operation completed",
        result: "Operation result",
      };
    },
  },
};
```

### Plugin Registration

Plugins are automatically loaded from the `plugins/` directory. Simply place your plugin file there and restart the server.

## Available Plugins

### Data Extractor Plugin

Extract structured data from web pages.

**Tools:**

- `extract_data`: Extract data using CSS selectors
- `extract_table`: Extract table data
- `extract_links`: Extract all links from a page

**Example:**

```json
{
  "tool": "extract_data",
  "arguments": {
    "selectors": {
      "title": "h1",
      "description": ".description",
      "price": ".price"
    },
    "browserId": "my-browser"
  }
}
```

### Screenshot Plugin

Advanced screenshot capabilities.

**Tools:**

- `screenshot_element`: Screenshot specific elements
- `screenshot_compare`: Compare screenshots
- `screenshot_annotate`: Add annotations to screenshots

### Form Automation Plugin

Automate form interactions.

**Tools:**

- `fill_form`: Fill forms with data
- `submit_form`: Submit forms
- `validate_form`: Validate form data

## Plugin Development

### Getting Started

1. Create a new file in the `plugins/` directory
2. Follow the plugin structure above
3. Implement your custom tools
4. Test your plugin
5. Share with the community

### Best Practices

- **Error Handling**: Always handle errors gracefully
- **Input Validation**: Validate all input parameters
- **Documentation**: Document your plugin and tools
- **Testing**: Test your plugin thoroughly
- **Performance**: Consider performance implications

### Plugin API

#### Browser Manager

Access to browser instances and management:

```javascript
// Get a browser instance
const browser = browserManager.getBrowser(browserId);

// List all browsers
const browsers = browserManager.listBrowsers();

// Check if browser exists
const exists = browserManager.hasBrowser(browserId);
```

#### Browser Automation Core

Access to Selenium WebDriver functionality:

```javascript
// Navigate to URL
await browser.navigateTo("https://example.com");

// Click element
await browser.clickElement({ selector: "#button" });

// Type text
await browser.typeText({ selector: "#input", text: "Hello" });

// Execute JavaScript
const result = await browser.executeScript("return document.title;");

// Take screenshot
await browser.takeScreenshot({ filename: "screenshot.png" });
```

### Example Plugin: Web Scraper

```javascript
// plugins/web-scraper.js
module.exports = {
  name: "web-scraper",
  version: "1.0.0",
  description: "Web scraping utilities",

  tools: [
    {
      name: "scrape_products",
      description: "Scrape product information from e-commerce sites",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "URL to scrape" },
          selectors: {
            type: "object",
            properties: {
              product: { type: "string" },
              price: { type: "string" },
              image: { type: "string" },
            },
          },
          browserId: { type: "string", description: "Browser ID to use" },
        },
        required: ["url", "selectors"],
      },
    },
  ],

  handlers: {
    scrape_products: async (args, browserManager) => {
      try {
        const browser = browserManager.getBrowser(args.browserId);

        // Navigate to the page
        await browser.navigateTo(args.url);

        // Extract product data
        const products = await browser.executeScript(`
          const products = [];
          const productElements = document.querySelectorAll('${args.selectors.product}');
          
          productElements.forEach(element => {
            const product = {
              name: element.querySelector('${args.selectors.name}')?.textContent?.trim(),
              price: element.querySelector('${args.selectors.price}')?.textContent?.trim(),
              image: element.querySelector('${args.selectors.image}')?.src
            };
            products.push(product);
          });
          
          return products;
        `);

        return {
          success: true,
          message: `Scraped ${products.length} products`,
          data: products,
        };
      } catch (error) {
        return {
          success: false,
          message: `Scraping failed: ${error.message}`,
        };
      }
    },
  },
};
```

## Community Plugins

### Contributing

- Fork the repository
- Create your plugin
- Add documentation
- Submit a pull request

### Plugin Gallery

- [Data Extractor](plugins/community/data-extractor.md) - Extract structured data
- [Form Automation](plugins/community/form-automation.md) - Automate form interactions
- [Performance Monitor](plugins/community/performance-monitor.md) - Monitor page performance

## Troubleshooting

### Common Issues

**Plugin not loading:**

- Check file is in `plugins/` directory
- Verify JavaScript syntax
- Check server logs for errors

**Tool not available:**

- Ensure tool is defined in `tools` array
- Check handler is implemented
- Restart server after changes

**Browser access issues:**

- Verify browser ID is valid
- Check browser is still open
- Handle browser errors gracefully

### Debug Mode

Enable debug mode to see detailed plugin logs:

```bash
DEBUG=mcp-selenium:plugins npm start
```

## Resources

- [Plugin Development Guide](plugins/development.md)
- [API Reference](../api-reference/)
- [Examples](../examples/)
- [GitHub Repository](https://github.com/brutalzinn/simple-mcp-selenium)

## Credits

This plugin system was designed and implemented by [@brutalzinn](https://github.com/brutalzinn) as part of the MCP Selenium Server project.
