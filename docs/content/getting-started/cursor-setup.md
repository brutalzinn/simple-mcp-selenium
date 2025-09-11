---
title: "Cursor IDE Setup"
linkTitle: "Cursor Setup"
weight: 20
description: "Configure MCP Selenium Server with Cursor IDE"
---

## Cursor IDE Configuration

### Prerequisites

- Cursor IDE installed
- MCP Selenium Server installed (see [Installation]({{< relref "installation" >}}))

### Configuration Steps

1. **Open Cursor Settings**

   - Go to **File** → **Preferences** → **Settings** (or `Ctrl/Cmd + ,`)
   - Search for "MCP" or "Model Context Protocol"

2. **Add MCP Server Configuration**

#### For Docker Installation:

```json
{
  "mcp.servers": {
    "selenium-browser": {
      "command": "docker",
      "args": [
        "exec",
        "-i",
        "mcp-selenium-server",
        "node",
        "/app/dist/index.js"
      ],
      "env": {}
    }
  }
}
```

#### For Local Installation:

```json
{
  "mcp.servers": {
    "selenium-browser": {
      "command": "node",
      "args": ["/absolute/path/to/your/project/dist/index.js"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

#### For Development Mode:

```json
{
  "mcp.servers": {
    "selenium-browser": {
      "command": "npx",
      "args": ["tsx", "/path/to/your/project/src/simple-mcp-server.ts"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

3. **Restart Cursor IDE**

After adding the configuration, restart Cursor IDE to load the MCP server.

## Usage in Cursor IDE

### Access Browser Tools

Once configured, you can access browser automation tools through Cursor's MCP interface:

1. Open the **Command Palette** (`Ctrl/Cmd + Shift + P`)
2. Type "MCP" to see available MCP commands
3. Select the selenium-browser server

### Natural Language Commands

You can now use natural language to control browsers:

```
"Open a browser and go to Google"
"Click the login button"
"Type 'admin@example.com' in the email field"
"Take a screenshot of the current page"
"Drag the menu button to the workflow area"
```

### Available Tools

| Tool                | Description             | Example Usage                               |
| ------------------- | ----------------------- | ------------------------------------------- |
| `open_browser`      | Start a browser session | "Open a browser and go to Google"           |
| `navigate_to`       | Navigate to a URL       | "Go to example.com"                         |
| `click_element`     | Click on elements       | "Click the login button"                    |
| `type_text`         | Enter text in fields    | "Type 'admin@demo.com' in the email field"  |
| `drag_and_drop`     | Move elements           | "Drag the menu button to the workflow area" |
| `take_screenshot`   | Capture page state      | "Take a screenshot of the current page"     |
| `get_page_elements` | Inspect page structure  | "Show me all buttons on this page"          |
| `execute_script`    | Run JavaScript          | "Execute some JavaScript on this page"      |
| `wait_for_element`  | Wait for elements       | "Wait for the form to load"                 |
| `close_browser`     | End browser session     | "Close the browser"                         |

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
    "proxy": "your-proxy-server:port"
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

## Next Steps

- 📖 [API Reference]({{< relref "/api-reference" >}}) - Complete tool documentation
- 🎯 [Examples]({{< relref "/examples" >}}) - Real-world use cases
- 🔌 [Plugins]({{< relref "/plugins" >}}) - Extend functionality
