---
title: "Getting Started"
linkTitle: "Getting Started"
weight: 20
description: "Quick start guide for MCP Selenium Server"
---

## 🚀 Quick Start

Get MCP Selenium Server running in your Cursor IDE in just a few minutes!

## Prerequisites

- **Cursor IDE** installed
- **Node.js 18+** installed
- **Chrome browser** installed (for Chrome automation)
- **Docker** (optional, for containerized setup)

## Installation Options

### Option 1: Docker (Recommended)

The easiest way to get started with full browser support:

```bash
# Clone the repository
git clone https://github.com/robertocpaes/mcp-selenium.git
cd mcp-selenium

# Run the simple installation script
./scripts/install-simple.sh
```

This will:

- ✅ Create a Docker container with Chrome browser
- ✅ Install all dependencies automatically
- ✅ Set up automatic restart
- ✅ Provide full browser automation support

### Option 2: Local Installation

For development or custom setups:

```bash
# Clone the repository
git clone https://github.com/robertocpaes/mcp-selenium.git
cd mcp-selenium

# Install dependencies
npm install

# Build the project
npm run build
```

## Cursor IDE Configuration

Add the following to your Cursor IDE settings:

**File → Preferences → Settings → MCP Servers**

### For Docker Installation:

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

### For Local Installation:

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

## Verify Installation

1. **Restart Cursor IDE** after adding the configuration
2. **Open Command Palette** (`Ctrl/Cmd + Shift + P`)
3. **Type "MCP"** to see available MCP commands
4. **Select selenium-browser** from the list

You should now see browser automation tools available in Cursor!

## Your First Automation

Try this simple test in Cursor:

```
"Open a browser, go to Google, search for 'hello world', and take a screenshot"
```

Cursor will automatically:

1. Open a Chrome browser
2. Navigate to Google
3. Type "hello world" in the search box
4. Click search
5. Take a screenshot
6. Close the browser

## Browser Management

### Single Browser Mode (Default)

When you don't specify a browser ID, MCP uses a single default browser instance:

```
"Open a browser and go to example.com"
"Click the login button"
"Type 'admin@example.com' in the email field"
```

### Multiple Browser Mode

For complex scenarios, you can manage multiple browser instances:

```
"Open a browser with ID 'user1' and go to site1.com"
"Open a browser with ID 'user2' and go to site2.com"
"Click the button in browser 'user1'"
"Fill the form in browser 'user2'"
```

## Available Tools

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

## Next Steps

- 📖 [API Reference]({{< relref "/api-reference" >}}) - Complete tool documentation
- 🎯 [Examples]({{< relref "/examples" >}}) - Real-world use cases
- 🔌 [Plugins]({{< relref "/plugins" >}}) - Extend functionality
- 🐛 [Troubleshooting](#troubleshooting) - Common issues and solutions

## Troubleshooting

### Browser Won't Open

- Check if Chrome is installed
- Verify ChromeDriver is available
- Try running in headless mode

### Elements Not Found

- Check if page is fully loaded
- Verify CSS selectors are correct
- Increase timeout values

### MCP Server Not Loading

- Check Cursor IDE logs
- Verify configuration JSON syntax
- Ensure correct file paths

### Docker Issues

```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs -f

# Restart container
docker-compose restart
```

## Need Help?

- 📚 Check the [API Reference]({{< relref "/api-reference" >}})
- 🎯 See [Examples]({{< relref "/examples" >}}) for common patterns
- 🐛 Open an issue on [GitHub](https://github.com/robertocpaes/mcp-selenium/issues)
- 💬 Join the discussion in [GitHub Discussions](https://github.com/robertocpaes/mcp-selenium/discussions)
