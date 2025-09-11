---
title: "API Reference"
description: "Complete API reference for MCP Selenium Server tools"
---

# API Reference

Complete reference for all MCP tools provided by the Selenium Server.

## Browser Management

### open_browser

Opens a new browser instance with optional custom ID.

**Parameters:**

- `browserId` (string, optional): Custom browser ID. If not provided, a UUID is generated.
- `headless` (boolean, optional): Run in headless mode. Default: false.
- `width` (number, optional): Browser window width. Default: 1280.
- `height` (number, optional): Browser window height. Default: 720.
- `browserType` (string, optional): Browser type. Options: chrome, firefox, duckduckgo. Default: chrome.
- `userAgent` (string, optional): Custom user agent string.
- `proxy` (string, optional): Proxy server (format: host:port).

**Returns:**

- `success` (boolean): Whether the operation succeeded.
- `message` (string): Status message.
- `browserId` (string): The browser ID (provided or generated).

### close_browser

Closes a specific browser instance.

**Parameters:**

- `browserId` (string, optional): Browser ID to close. If not provided, closes default browser.

**Returns:**

- `success` (boolean): Whether the operation succeeded.
- `message` (string): Status message.

### list_browsers

Lists all active browser instances.

**Returns:**

- `success` (boolean): Whether the operation succeeded.
- `browsers` (array): Array of browser instances with id, createdAt, lastUsed.

## Navigation

### navigate_to

Navigates to a specific URL.

**Parameters:**

- `url` (string, required): The URL to navigate to.
- `browserId` (string, optional): Browser ID to use. If not provided, uses default browser.

**Returns:**

- `success` (boolean): Whether the operation succeeded.
- `message` (string): Status message.

## Interaction

### click_element

Clicks on an element.

**Parameters:**

- `selector` (string, required): CSS selector or XPath to find the element.
- `by` (string, optional): Selector type. Options: css, xpath, id, name, className, tagName. Default: css.
- `timeout` (number, optional): Timeout in milliseconds. Default: 10000.
- `browserId` (string, optional): Browser ID to use. If not provided, uses default browser.

**Returns:**

- `success` (boolean): Whether the operation succeeded.
- `message` (string): Status message.

### type_text

Types text into an input field.

**Parameters:**

- `selector` (string, required): CSS selector or XPath to find the element.
- `text` (string, required): Text to type.
- `by` (string, optional): Selector type. Options: css, xpath, id, name, className, tagName. Default: css.
- `timeout` (number, optional): Timeout in milliseconds. Default: 10000.
- `browserId` (string, optional): Browser ID to use. If not provided, uses default browser.

**Returns:**

- `success` (boolean): Whether the operation succeeded.
- `message` (string): Status message.

### hover_element

Hovers over an element.

**Parameters:**

- `selector` (string, required): CSS selector or XPath to find the element.
- `by` (string, optional): Selector type. Options: css, xpath, id, name, className, tagName. Default: css.
- `timeout` (number, optional): Timeout in milliseconds. Default: 10000.
- `browserId` (string, optional): Browser ID to use. If not provided, uses default browser.

**Returns:**

- `success` (boolean): Whether the operation succeeded.
- `message` (string): Status message.

### double_click_element

Double-clicks on an element.

**Parameters:**

- `selector` (string, required): CSS selector or XPath to find the element.
- `by` (string, optional): Selector type. Options: css, xpath, id, name, className, tagName. Default: css.
- `timeout` (number, optional): Timeout in milliseconds. Default: 10000.
- `browserId` (string, optional): Browser ID to use. If not provided, uses default browser.

**Returns:**

- `success` (boolean): Whether the operation succeeded.
- `message` (string): Status message.

### right_click_element

Right-clicks on an element.

**Parameters:**

- `selector` (string, required): CSS selector or XPath to find the element.
- `by` (string, optional): Selector type. Options: css, xpath, id, name, className, tagName. Default: css.
- `timeout` (number, optional): Timeout in milliseconds. Default: 10000.
- `browserId` (string, optional): Browser ID to use. If not provided, uses default browser.

**Returns:**

- `success` (boolean): Whether the operation succeeded.
- `message` (string): Status message.

## Screenshots and Information

### take_screenshot

Takes a screenshot of the current page.

**Parameters:**

- `filename` (string, optional): Filename for the screenshot.
- `fullPage` (boolean, optional): Whether to capture the full page. Default: false.
- `browserId` (string, optional): Browser ID to use. If not provided, uses default browser.

**Returns:**

- `success` (boolean): Whether the operation succeeded.
- `message` (string): Status message.
- `filename` (string): Screenshot filename.

### get_page_title

Gets the current page title.

**Parameters:**

- `browserId` (string, optional): Browser ID to use. If not provided, uses default browser.

**Returns:**

- `success` (boolean): Whether the operation succeeded.
- `title` (string): Page title.

### get_page_url

Gets the current page URL.

**Parameters:**

- `browserId` (string, optional): Browser ID to use. If not provided, uses default browser.

**Returns:**

- `success` (boolean): Whether the operation succeeded.
- `url` (string): Current page URL.

## Advanced Operations

### execute_script

Executes JavaScript in the browser.

**Parameters:**

- `script` (string, required): JavaScript code to execute.
- `args` (array, optional): Arguments to pass to the script.
- `browserId` (string, optional): Browser ID to use. If not provided, uses default browser.

**Returns:**

- `success` (boolean): Whether the operation succeeded.
- `result` (any): Script execution result.

### execute_action_sequence

Executes a sequence of actions.

**Parameters:**

- `actions` (array, required): Array of action objects.
- `continueOnError` (boolean, optional): Whether to continue on error. Default: false.
- `stopOnError` (boolean, optional): Whether to stop on first error. Default: true.
- `browserId` (string, optional): Browser ID to use. If not provided, uses default browser.

**Returns:**

- `success` (boolean): Whether the operation succeeded.
- `message` (string): Status message.

### drag_and_drop

Drags an element and drops it onto another element.

**Parameters:**

- `sourceSelector` (string, required): CSS selector for the draggable element.
- `targetSelector` (string, required): CSS selector for the drop zone element.
- `sourceBy` (string, optional): Source selector type. Default: css.
- `targetBy` (string, optional): Target selector type. Default: css.
- `timeout` (number, optional): Timeout in milliseconds. Default: 10000.
- `browserId` (string, optional): Browser ID to use. If not provided, uses default browser.

**Returns:**

- `success` (boolean): Whether the operation succeeded.
- `message` (string): Status message.

## Console Logging

### get_console_logs

Gets browser console logs.

**Parameters:**

- `level` (string, optional): Log level filter. Options: debug, info, warn, error, log.
- `limit` (number, optional): Maximum number of logs to return.
- `browserId` (string, optional): Browser ID to use. If not provided, uses default browser.

**Returns:**

- `success` (boolean): Whether the operation succeeded.
- `logs` (array): Array of console log entries.

### clear_console_logs

Clears browser console logs.

**Parameters:**

- `browserId` (string, optional): Browser ID to use. If not provided, uses default browser.

**Returns:**

- `success` (boolean): Whether the operation succeeded.
- `message` (string): Status message.

### get_console_log_count

Gets the number of console logs.

**Parameters:**

- `browserId` (string, optional): Browser ID to use. If not provided, uses default browser.

**Returns:**

- `success` (boolean): Whether the operation succeeded.
- `count` (number): Number of console logs.
