---
title: "Examples"
description: "Practical examples of using MCP Selenium Server"
---

# Examples

Practical examples demonstrating how to use the MCP Selenium Server for various automation tasks.

## Docker Usage

### Starting with Docker Compose

```bash
# Start the MCP server
docker compose up --build

# Run in background
docker compose up -d --build

# View logs
docker compose logs -f

# Stop the server
docker compose down
```

### Testing Docker Installation

```bash
# Test MCP communication
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}' | docker exec -i <container_name> node dist/index.js

# Open a browser
echo '{"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": "open_browser", "arguments": {"browserId": "docker-test", "headless": true}}}' | docker exec -i <container_name> node dist/index.js
```

### Docker Benefits

- **No Local Dependencies**: Chrome and ChromeDriver are included
- **Consistent Environment**: Same setup across different systems
- **Easy Updates**: Simple `docker compose pull` and restart
- **Isolation**: No conflicts with local browser installations

## Basic Browser Automation

### Simple Navigation

```json
{
  "tool": "open_browser",
  "arguments": {
    "browserId": "example1",
    "headless": false
  }
}
```

```json
{
  "tool": "navigate_to",
  "arguments": {
    "url": "https://example.com",
    "browserId": "example1"
  }
}
```

```json
{
  "tool": "get_page_title",
  "arguments": {
    "browserId": "example1"
  }
}
```

### Form Interaction

```json
{
  "tool": "type_text",
  "arguments": {
    "selector": "#username",
    "text": "myusername",
    "browserId": "example1"
  }
}
```

```json
{
  "tool": "type_text",
  "arguments": {
    "selector": "#password",
    "text": "mypassword",
    "browserId": "example1"
  }
}
```

```json
{
  "tool": "click_element",
  "arguments": {
    "selector": "#login-button",
    "browserId": "example1"
  }
}
```

## Multi-Browser Scenarios

### User Session Management

```json
{
  "tool": "open_browser",
  "arguments": {
    "browserId": "user1",
    "headless": false
  }
}
```

```json
{
  "tool": "open_browser",
  "arguments": {
    "browserId": "user2",
    "headless": false
  }
}
```

```json
{
  "tool": "navigate_to",
  "arguments": {
    "url": "https://app.example.com",
    "browserId": "user1"
  }
}
```

```json
{
  "tool": "navigate_to",
  "arguments": {
    "url": "https://app.example.com",
    "browserId": "user2"
  }
}
```

### Parallel Testing

```json
{
  "tool": "list_browsers",
  "arguments": {}
}
```

## Advanced Operations

### Screenshot Capture

```json
{
  "tool": "take_screenshot",
  "arguments": {
    "filename": "page-screenshot.png",
    "fullPage": true,
    "browserId": "example1"
  }
}
```

### JavaScript Execution

```json
{
  "tool": "execute_script",
  "arguments": {
    "script": "return document.title;",
    "browserId": "example1"
  }
}
```

### Action Sequences

```json
{
  "tool": "execute_action_sequence",
  "arguments": {
    "actions": [
      {
        "action": "navigate_to",
        "value": "https://example.com"
      },
      {
        "action": "click",
        "selector": "#button1"
      },
      {
        "action": "type",
        "selector": "#input1",
        "text": "Hello World"
      }
    ],
    "browserId": "example1"
  }
}
```

### Drag and Drop

```json
{
  "tool": "drag_and_drop",
  "arguments": {
    "sourceSelector": "#draggable-item",
    "targetSelector": "#drop-zone",
    "browserId": "example1"
  }
}
```

## Console Monitoring

### Capture Console Logs

```json
{
  "tool": "get_console_logs",
  "arguments": {
    "level": "error",
    "limit": 10,
    "browserId": "example1"
  }
}
```

### Clear Console

```json
{
  "tool": "clear_console_logs",
  "arguments": {
    "browserId": "example1"
  }
}
```

## Error Handling

### Check Browser Status

```json
{
  "tool": "get_browser_info",
  "arguments": {
    "browserId": "example1"
  }
}
```

### List Active Browsers

```json
{
  "tool": "list_browsers",
  "arguments": {}
}
```

### Close Specific Browser

```json
{
  "tool": "close_browser",
  "arguments": {
    "browserId": "example1"
  }
}
```

## Real-World Use Cases

### Web Scraping

1. Open browser with custom ID
2. Navigate to target website
3. Extract data using JavaScript execution
4. Take screenshots for verification
5. Close browser when done

### Automated Testing

1. Open multiple browser instances for different test scenarios
2. Run parallel tests across different browsers
3. Capture screenshots and console logs for debugging
4. Clean up all browser instances after testing

### User Journey Simulation

1. Open browser for each user persona
2. Navigate through different user flows
3. Interact with forms and buttons
4. Monitor console for errors
5. Generate reports with screenshots

### Performance Monitoring

1. Open browser and navigate to application
2. Execute performance measurement scripts
3. Capture console logs for analysis
4. Take screenshots at key points
5. Generate performance reports
