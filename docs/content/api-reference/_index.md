---
title: "API Reference"
linkTitle: "API Reference"
weight: 30
description: "Complete reference for all MCP Selenium Server tools"
---

## Overview

MCP Selenium Server provides a comprehensive set of tools for browser automation. All tools support an optional `browserId` parameter for multi-browser management.

## Browser Management Tools

### open_browser

Opens a new browser instance with optional custom ID.

**Parameters:**

- `headless` (boolean, default: false) - Run browser in headless mode
- `width` (number, default: 1280) - Browser window width
- `height` (number, default: 720) - Browser window height
- `browserType` (string, default: 'chrome') - Browser type: 'chrome', 'duckduckgo', 'firefox'
- `userAgent` (string, optional) - Custom user agent string
- `proxy` (string, optional) - Proxy server (format: host:port)
- `browserId` (string, optional) - Custom browser ID. If not provided, generates UUID

**Example:**

```json
{
  "tool": "open_browser",
  "arguments": {
    "browserId": "user1",
    "headless": false,
    "browserType": "chrome",
    "width": 1920,
    "height": 1080
  }
}
```

### close_browser

Closes a browser instance.

**Parameters:**

- `browserId` (string, optional) - Browser ID to close. If not provided, closes default browser

**Example:**

```json
{
  "tool": "close_browser",
  "arguments": {
    "browserId": "user1"
  }
}
```

### list_browsers

Lists all active browser instances.

**Parameters:** None

**Example:**

```json
{
  "tool": "list_browsers",
  "arguments": {}
}
```

### get_browser_info

Gets information about a specific browser instance.

**Parameters:**

- `browserId` (string, optional) - Browser ID to get info for. If not provided, returns default browser info

**Example:**

```json
{
  "tool": "get_browser_info",
  "arguments": {
    "browserId": "user1"
  }
}
```

## Navigation Tools

### navigate_to

Navigates to a specific URL.

**Parameters:**

- `url` (string, required) - The URL to navigate to
- `browserId` (string, optional) - Browser ID to use. If not provided, uses default browser

**Example:**

```json
{
  "tool": "navigate_to",
  "arguments": {
    "url": "https://example.com",
    "browserId": "user1"
  }
}
```

## Element Interaction Tools

### click_element

Clicks on an element.

**Parameters:**

- `selector` (string, required) - CSS selector or XPath to find the element
- `by` (string, default: 'css') - Selector type: 'css', 'xpath', 'id', 'name', 'className', 'tagName'
- `timeout` (number, default: 10000) - Timeout in milliseconds
- `browserId` (string, optional) - Browser ID to use

**Example:**

```json
{
  "tool": "click_element",
  "arguments": {
    "selector": "#login-button",
    "by": "css",
    "timeout": 5000,
    "browserId": "user1"
  }
}
```

### type_text

Types text into an input field.

**Parameters:**

- `selector` (string, required) - CSS selector or XPath to find the element
- `text` (string, required) - Text to type
- `by` (string, default: 'css') - Selector type
- `timeout` (number, default: 10000) - Timeout in milliseconds
- `browserId` (string, optional) - Browser ID to use

**Example:**

```json
{
  "tool": "type_text",
  "arguments": {
    "selector": "input[name='email']",
    "text": "admin@example.com",
    "by": "css",
    "browserId": "user1"
  }
}
```

### hover_element

Hovers over an element.

**Parameters:**

- `selector` (string, required) - CSS selector or XPath to find the element
- `by` (string, default: 'css') - Selector type
- `timeout` (number, default: 10000) - Timeout in milliseconds
- `browserId` (string, optional) - Browser ID to use

### double_click_element

Double-clicks on an element.

**Parameters:**

- `selector` (string, required) - CSS selector or XPath to find the element
- `by` (string, default: 'css') - Selector type
- `timeout` (number, default: 10000) - Timeout in milliseconds
- `browserId` (string, optional) - Browser ID to use

### right_click_element

Right-clicks on an element.

**Parameters:**

- `selector` (string, required) - CSS selector or XPath to find the element
- `by` (string, default: 'css') - Selector type
- `timeout` (number, default: 10000) - Timeout in milliseconds
- `browserId` (string, optional) - Browser ID to use

## Advanced Interaction Tools

### drag_and_drop

Drags a draggable element and drops it onto a drop zone.

**Parameters:**

- `sourceSelector` (string, required) - CSS selector or XPath for the draggable element
- `targetSelector` (string, required) - CSS selector or XPath for the drop zone
- `sourceBy` (string, default: 'css') - Selector type for source element
- `targetBy` (string, default: 'css') - Selector type for target element
- `timeout` (number, default: 10000) - Timeout in milliseconds
- `browserId` (string, optional) - Browser ID to use

**Example:**

```json
{
  "tool": "drag_and_drop",
  "arguments": {
    "sourceSelector": "[data-node='user_menu']",
    "targetSelector": "#drawflow",
    "sourceBy": "css",
    "targetBy": "css",
    "browserId": "user1"
  }
}
```

### execute_script

Executes JavaScript in the browser.

**Parameters:**

- `script` (string, required) - JavaScript code to execute
- `args` (array, optional) - Arguments to pass to the script
- `browserId` (string, optional) - Browser ID to use

**Example:**

```json
{
  "tool": "execute_script",
  "arguments": {
    "script": "return document.title;",
    "args": [],
    "browserId": "user1"
  }
}
```

### execute_action_sequence

Executes a sequence of actions in order.

**Parameters:**

- `actions` (array, required) - Array of action objects
- `continueOnError` (boolean, default: false) - Continue if an action fails
- `stopOnError` (boolean, default: true) - Stop on first error
- `browserId` (string, optional) - Browser ID to use

**Action Types:**

- `navigate_to` - Navigate to URL
- `click` - Click element
- `type` - Type text
- `execute_script` - Execute JavaScript
- `take_screenshot` - Take screenshot
- `wait` - Wait for element

**Example:**

```json
{
  "tool": "execute_action_sequence",
  "arguments": {
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
        "selector": "input[name='email']",
        "value": "admin@example.com",
        "description": "Enter email"
      }
    ],
    "continueOnError": false,
    "browserId": "user1"
  }
}
```

## Page Information Tools

### get_page_title

Gets the current page title.

**Parameters:**

- `browserId` (string, optional) - Browser ID to use

### get_page_url

Gets the current page URL.

**Parameters:**

- `browserId` (string, optional) - Browser ID to use

### get_page_elements

Gets all elements on the current page.

**Parameters:**

- `selector` (string, default: '\*') - CSS selector to filter elements
- `limit` (number, default: 100) - Maximum number of elements to return
- `browserId` (string, optional) - Browser ID to use

### wait_for_element

Waits for an element to appear and be visible.

**Parameters:**

- `selector` (string, required) - CSS selector or XPath to find the element
- `by` (string, default: 'css') - Selector type
- `timeout` (number, default: 10000) - Timeout in milliseconds
- `browserId` (string, optional) - Browser ID to use

## Screenshot Tools

### take_screenshot

Takes a screenshot of the current page.

**Parameters:**

- `filename` (string, optional) - Filename for the screenshot
- `fullPage` (boolean, default: false) - Whether to capture the full page
- `browserId` (string, optional) - Browser ID to use

**Example:**

```json
{
  "tool": "take_screenshot",
  "arguments": {
    "filename": "login-page.png",
    "fullPage": true,
    "browserId": "user1"
  }
}
```

## Error Handling

All tools return a standardized response format:

**Success Response:**

```json
{
  "content": [
    {
      "type": "text",
      "text": "Operation completed successfully"
    }
  ],
  "isError": false
}
```

**Error Response:**

```json
{
  "content": [
    {
      "type": "text",
      "text": "Error: Element not found"
    }
  ],
  "isError": true
}
```

## Browser ID Management

### Single Browser Mode (Default)

When no `browserId` is provided, tools use the default browser instance:

```json
{
  "tool": "navigate_to",
  "arguments": {
    "url": "https://example.com"
  }
}
```

### Multiple Browser Mode

When `browserId` is provided, tools use the specified browser instance:

```json
{
  "tool": "navigate_to",
  "arguments": {
    "url": "https://example.com",
    "browserId": "user1"
  }
}
```

### Browser Lifecycle

1. **Create**: Use `open_browser` with custom ID
2. **Use**: Pass `browserId` to any tool
3. **Close**: Use `close_browser` with the same ID
4. **List**: Use `list_browsers` to see all active instances

## Best Practices

1. **Always specify browserId** for multi-browser scenarios
2. **Use appropriate timeouts** - don't over-wait
3. **Handle errors gracefully** with proper error checking
4. **Close browsers** when done to free resources
5. **Use CSS selectors** when possible (faster than XPath)
6. **Test selectors** with `get_page_elements` first
