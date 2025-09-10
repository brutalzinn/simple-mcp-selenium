# Testing MCP Selenium Server with Cursor IDE

This guide will help you test the MCP Selenium Server with Cursor IDE to automate Google Brazil search.

## Prerequisites

- Cursor IDE installed
- Node.js 18+ installed
- Chrome browser installed
- Git installed

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Build the Project

```bash
npm run build
```

### 3. Configure Cursor IDE

Add the following to your Cursor IDE settings (File → Preferences → Settings):

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

Or use the provided configuration file:

```bash
cp cursor-mcp-config.json ~/.cursor/settings.json
```

## Testing Google Brazil Search

### Method 1: Using Cursor IDE MCP Interface

1. Open Cursor IDE
2. Open Command Palette (`Ctrl/Cmd + Shift + P`)
3. Type "MCP" to see available MCP commands
4. Select the selenium-browser server

#### Step-by-Step Test:

1. **Open Browser**

   ```json
   {
     "tool": "open_browser",
     "parameters": {
       "headless": false,
       "browserType": "chrome",
       "width": 1280,
       "height": 720
     }
   }
   ```

2. **Navigate to Google Brazil**

   ```json
   {
     "tool": "navigate_to",
     "parameters": {
       "url": "https://www.google.com.br"
     }
   }
   ```

3. **Type "hello world"**

   ```json
   {
     "tool": "type_text",
     "parameters": {
       "selector": "input[name='q']",
       "text": "hello world"
     }
   }
   ```

4. **Press Enter or Click Search**

   ```json
   {
     "tool": "click_element",
     "parameters": {
       "selector": "input[type='submit']"
     }
   }
   ```

5. **Take Screenshot**

   ```json
   {
     "tool": "take_screenshot",
     "parameters": {
       "filename": "google-search-results.png"
     }
   }
   ```

6. **Close Browser**
   ```json
   {
     "tool": "close_browser",
     "parameters": {}
   }
   ```

### Method 2: Using Action Sequence

Execute all steps in one command:

```json
{
  "tool": "execute_action_sequence",
  "parameters": {
    "actions": [
      {
        "action": "navigate_to",
        "value": "https://www.google.com.br",
        "description": "Navigate to Google Brazil"
      },
      {
        "action": "wait_for_element",
        "selector": "input[name='q']",
        "timeout": 10000,
        "description": "Wait for search input"
      },
      {
        "action": "type",
        "selector": "input[name='q']",
        "value": "hello world",
        "description": "Type search query"
      },
      {
        "action": "click",
        "selector": "input[type='submit']",
        "description": "Click search button"
      },
      {
        "action": "wait_for_element",
        "selector": "#search",
        "timeout": 10000,
        "description": "Wait for search results"
      },
      {
        "action": "take_screenshot",
        "value": "google-search-results.png",
        "description": "Take screenshot of results"
      }
    ],
    "continueOnError": false,
    "stopOnError": true
  }
}
```

### Method 3: Using Test Scripts

Run the provided test scripts:

```bash
# Simple test
node test-simple.js

# Advanced test with error handling
node test-google.js
```

## Available Tools

### Browser Management

- `open_browser` - Open browser instance
- `navigate_to` - Navigate to URL
- `close_browser` - Close browser
- `get_page_title` - Get page title
- `get_page_url` - Get current URL

### Element Interactions

- `click_element` - Click on elements
- `type_text` - Type text into inputs
- `hover_element` - Hover over elements
- `double_click_element` - Double-click elements
- `right_click_element` - Right-click elements
- `scroll_to_element` - Scroll to elements

### Form Operations

- `fill_form` - Fill forms with data
- `select_option` - Select dropdown options
- `check_checkbox` - Check/uncheck checkboxes
- `select_radio_button` - Select radio buttons
- `upload_file` - Upload files

### Advanced Operations

- `drag_and_drop` - Drag and drop elements
- `execute_script` - Execute JavaScript
- `take_screenshot` - Take screenshots
- `execute_action_sequence` - Execute workflows

### Page Analysis

- `get_page_elements` - Get all interactive elements
- `get_form_elements` - Get form structure
- `get_page_info` - Get comprehensive page info
- `get_console_logs` - Get browser console logs

## Troubleshooting

### Common Issues

1. **Browser won't open**

   - Check if Chrome is installed
   - Verify ChromeDriver is available
   - Try running in headless mode

2. **Elements not found**

   - Check if page is fully loaded
   - Verify CSS selectors
   - Increase timeout values

3. **MCP server not loading**
   - Check Cursor IDE logs
   - Verify configuration JSON syntax
   - Ensure correct file paths

### Debug Mode

Enable debug logging:

```json
{
  "mcp.servers": {
    "selenium-browser": {
      "command": "node",
      "args": ["dist/index.js"],
      "env": {
        "DEBUG": "true",
        "NODE_ENV": "development"
      }
    }
  }
}
```

## Expected Results

When testing Google Brazil search, you should see:

1. ✅ Browser opens in Chrome
2. ✅ Navigates to https://www.google.com.br
3. ✅ Types "hello world" in search box
4. ✅ Clicks search button or presses Enter
5. ✅ Shows search results page
6. ✅ Takes screenshot of results
7. ✅ Closes browser

## Next Steps

- Try different websites
- Test form filling
- Experiment with drag and drop
- Use the CAPTCHA handler plugin
- Create custom plugins

## Support

For issues and questions:

- Check the [main documentation](../README.md)
- Review [Cursor integration guide](./cursor-integration.md)
- Open an issue on GitHub
