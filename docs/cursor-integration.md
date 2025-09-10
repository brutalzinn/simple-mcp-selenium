# Cursor IDE Integration Guide

This guide will help you integrate the MCP Selenium Server with Cursor IDE for powerful browser automation capabilities.

## Prerequisites

- Cursor IDE installed
- Node.js 18+ installed
- Chrome browser installed (for Chrome driver)
- Firefox browser installed (optional, for Firefox support)

## Installation

### 1. Install the MCP Selenium Server

```bash
# Global installation (recommended)
npm install -g mcp-selenium-server

# Or local installation
npm install mcp-selenium-server
```

### 2. Verify Installation

```bash
# Test the server
mcp-selenium --version
```

## Cursor IDE Configuration

### 1. Open Cursor Settings

1. Open Cursor IDE
2. Go to **File** → **Preferences** → **Settings** (or `Ctrl/Cmd + ,`)
3. Search for "MCP" or "Model Context Protocol"

### 2. Configure MCP Servers

Add the following configuration to your Cursor settings:

#### Option A: Global Installation
```json
{
  "mcp.servers": {
    "selenium-browser": {
      "command": "mcp-selenium",
      "args": [],
      "env": {}
    }
  }
}
```

#### Option B: Local Installation
```json
{
  "mcp.servers": {
    "selenium-browser": {
      "command": "node",
      "args": ["/path/to/your/project/node_modules/mcp-selenium-server/dist/index.js"],
      "env": {}
    }
  }
}
```

#### Option C: Development Mode
```json
{
  "mcp.servers": {
    "selenium-browser": {
      "command": "npx",
      "args": ["tsx", "/path/to/your/project/src/index.ts"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

### 3. Restart Cursor IDE

After adding the configuration, restart Cursor IDE to load the MCP server.

## Usage in Cursor IDE

### 1. Access Browser Tools

Once configured, you can access browser automation tools through Cursor's MCP interface:

1. Open the **Command Palette** (`Ctrl/Cmd + Shift + P`)
2. Type "MCP" to see available MCP commands
3. Select the selenium-browser server

### 2. Available Tools

The following tools are available for browser automation:

#### Basic Browser Operations
- `open_browser` - Open a new browser instance
- `navigate_to` - Navigate to a URL
- `close_browser` - Close the browser
- `get_page_title` - Get current page title
- `get_page_url` - Get current page URL

#### Element Interactions
- `click_element` - Click on elements
- `type_text` - Type text into input fields
- `hover_element` - Hover over elements
- `scroll_to_element` - Scroll to specific elements

#### Form Operations
- `fill_form` - Fill forms with data
- `select_option` - Select dropdown options
- `check_checkbox` - Check/uncheck checkboxes
- `upload_file` - Upload files

#### Advanced Operations
- `drag_and_drop` - Drag and drop elements
- `execute_script` - Execute JavaScript
- `take_screenshot` - Take screenshots
- `execute_action_sequence` - Execute complex workflows

### 3. Example Usage

#### Open Browser and Navigate
```json
{
  "tool": "open_browser",
  "parameters": {
    "headless": false,
    "browserType": "chrome",
    "width": 1920,
    "height": 1080
  }
}
```

```json
{
  "tool": "navigate_to",
  "parameters": {
    "url": "https://example.com"
  }
}
```

#### Execute Action Sequence
```json
{
  "tool": "execute_action_sequence",
  "parameters": {
    "actions": [
      {
        "action": "navigate_to",
        "value": "https://example.com",
        "description": "Navigate to website"
      },
      {
        "action": "click",
        "selector": "#login-button",
        "description": "Click login button"
      },
      {
        "action": "type",
        "selector": "#username",
        "value": "myusername",
        "description": "Enter username"
      },
      {
        "action": "type",
        "selector": "#password",
        "value": "mypassword",
        "description": "Enter password"
      },
      {
        "action": "click",
        "selector": "#submit",
        "description": "Submit form"
      }
    ],
    "continueOnError": false
  }
}
```

## Browser Types

### Chrome (Default)
- **Type**: `chrome`
- **Features**: Full feature support, console logging, screenshots
- **Best for**: General web automation, testing

### DuckDuckGo
- **Type**: `duckduckgo`
- **Features**: Privacy-focused, Chrome engine
- **Best for**: Search automation, privacy-sensitive tasks

### Firefox
- **Type**: `firefox`
- **Features**: Cross-browser testing
- **Best for**: Cross-browser compatibility testing

## Headless Mode

### Enable Headless Mode
```json
{
  "tool": "open_browser",
  "parameters": {
    "headless": true,
    "browserType": "chrome"
  }
}
```

### Headless Benefits
- Faster execution
- Lower resource usage
- Server environments
- CI/CD pipelines

## Advanced Configuration

### Custom User Agent
```json
{
  "tool": "open_browser",
  "parameters": {
    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
  }
}
```

### Proxy Support
```json
{
  "tool": "open_browser",
  "parameters": {
    "proxy": "proxy.example.com:8080"
  }
}
```

## Troubleshooting

### Common Issues

#### 1. ChromeDriver Not Found
```bash
# Reinstall ChromeDriver
npm install -g chromedriver
# Or
npx chromedriver --version
```

#### 2. Permission Denied
```bash
# Make sure the script is executable
chmod +x /path/to/mcp-selenium
```

#### 3. Browser Won't Open
- Check if Chrome/Firefox is installed
- Verify ChromeDriver version compatibility
- Try running in headless mode

#### 4. MCP Server Not Loading
- Check Cursor IDE logs
- Verify the configuration JSON syntax
- Ensure the server path is correct

### Debug Mode

Enable debug logging by setting environment variables:

```json
{
  "mcp.servers": {
    "selenium-browser": {
      "command": "mcp-selenium",
      "args": [],
      "env": {
        "DEBUG": "true",
        "NODE_ENV": "development"
      }
    }
  }
}
```

## Best Practices

### 1. Error Handling
Always use `continueOnError: false` for critical workflows to stop on first error.

### 2. Timeouts
Set appropriate timeouts for different actions:
- Page loads: 30 seconds
- Element interactions: 10 seconds
- Network requests: 15 seconds

### 3. Resource Management
- Always close browsers when done
- Use headless mode for automated tasks
- Clean up temporary files

### 4. Security
- Be careful with credentials in action sequences
- Use environment variables for sensitive data
- Validate user inputs

## Examples

### Web Scraping
```json
{
  "tool": "execute_action_sequence",
  "parameters": {
    "actions": [
      {
        "action": "navigate_to",
        "value": "https://news.ycombinator.com"
      },
      {
        "action": "get_page_elements",
        "description": "Get all article links"
      },
      {
        "action": "take_screenshot",
        "value": "hackernews.png"
      }
    ]
  }
}
```

### Form Testing
```json
{
  "tool": "execute_action_sequence",
  "parameters": {
    "actions": [
      {
        "action": "navigate_to",
        "value": "https://example.com/contact"
      },
      {
        "action": "fill_form",
        "formData": {
          "name": "John Doe",
          "email": "john@example.com",
          "message": "Test message"
        }
      },
      {
        "action": "click",
        "selector": "#submit-button"
      },
      {
        "action": "wait_for_text",
        "selector": ".success-message",
        "text": "Thank you"
      }
    ]
  }
}
```

### E2E Testing
```json
{
  "tool": "execute_action_sequence",
  "parameters": {
    "actions": [
      {
        "action": "navigate_to",
        "value": "https://myapp.com"
      },
      {
        "action": "click",
        "selector": "#signup-link"
      },
      {
        "action": "type",
        "selector": "#email",
        "value": "test@example.com"
      },
      {
        "action": "type",
        "selector": "#password",
        "value": "securepassword123"
      },
      {
        "action": "click",
        "selector": "#signup-button"
      },
      {
        "action": "wait_for_url",
        "value": "dashboard"
      },
      {
        "action": "take_screenshot",
        "value": "signup-success.png"
      }
    ]
  }
}
```

## Support

For issues and questions:
- Check the [GitHub repository](https://github.com/your-repo/mcp-selenium-server)
- Review the [main documentation](../README.md)
- Open an issue for bugs or feature requests
