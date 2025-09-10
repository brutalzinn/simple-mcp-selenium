# Laravel Chat App Testing with Selenium MCP Server

This guide shows how to use the Selenium MCP Server to test your Laravel chat application.

## Available MCP Tools for Chat App Testing

### 1. Browser Management

- `open_browser` - Open browser (headless or visible)
- `close_browser` - Close browser
- `navigate_to` - Navigate to specific URL
- `get_current_url` - Get current page URL
- `get_page_title` - Get page title

### 2. Element Interaction

- `click_element` - Click on elements (buttons, links, etc.)
- `type_text` - Type text into input fields
- `hover_element` - Hover over elements
- `double_click_element` - Double-click elements
- `right_click_element` - Right-click elements

### 3. Form Testing

- `fill_form` - Fill entire forms automatically
- `get_form_elements` - Get all form elements
- `select_option` - Select dropdown options
- `check_checkbox` - Check/uncheck checkboxes
- `select_radio_button` - Select radio buttons

### 4. Chat-Specific Testing

- `get_page_elements` - Inspect all page elements
- `get_dom_structure` - Get DOM structure
- `execute_javascript` - Execute custom JavaScript
- `wait_for_element` - Wait for elements to appear
- `scroll_to_element` - Scroll to specific elements

### 5. Advanced Features

- `drag_and_drop` - Drag and drop elements
- `upload_file` - Upload files
- `take_screenshot` - Take screenshots
- `get_console_logs` - Get browser console logs
- `execute_action_sequence` - Execute complex action sequences

## Common Chat App Test Scenarios

### 1. User Registration/Login Flow

```javascript
// Open browser and navigate to login page
await open_browser({ headless: false });
await navigate_to("http://localhost:8000/login");

// Fill login form
await fill_form({
  email: "test@example.com",
  password: "password123",
});

// Click login button
await click_element({ selector: "button[type='submit']" });

// Wait for redirect to chat
await wait_for_element({ selector: ".chat-container" });
```

### 2. Send Message Test

```javascript
// Navigate to chat page
await navigate_to("http://localhost:8000/chat");

// Type message
await type_text({
  selector: "textarea[name='message']",
  text: "Hello, this is a test message!",
});

// Send message
await click_element({ selector: "button[type='submit']" });

// Verify message appears
await wait_for_element({ selector: ".message:last-child" });
```

### 3. Real-time Message Testing

```javascript
// Open two browser instances for testing real-time features
await open_browser({ headless: false });
await navigate_to("http://localhost:8000/chat");

// Send message from first browser
await type_text({ selector: "textarea[name='message']", text: "Message 1" });
await click_element({ selector: "button[type='submit']" });

// Open second browser (simulate another user)
await open_browser({ headless: false });
await navigate_to("http://localhost:8000/chat");

// Verify message appears in second browser
await wait_for_element({ selector: ".message:contains('Message 1')" });
```

### 4. File Upload Testing

```javascript
// Navigate to chat
await navigate_to("http://localhost:8000/chat");

// Upload file
await upload_file({
  selector: "input[type='file']",
  filePath: "/path/to/test-file.jpg",
});

// Verify file appears in chat
await wait_for_element({ selector: ".file-message" });
```

### 5. Error Handling Testing

```javascript
// Test with invalid credentials
await navigate_to("http://localhost:8000/login");
await fill_form({
  email: "invalid@example.com",
  password: "wrongpassword",
});
await click_element({ selector: "button[type='submit']" });

// Check for error message
await wait_for_element({ selector: ".error-message" });
const errorText = await get_element_text({ selector: ".error-message" });
console.log("Error message:", errorText);
```

### 6. Mobile Responsiveness Testing

```javascript
// Test mobile view
await open_browser({
  headless: false,
  width: 375,
  height: 667,
});
await navigate_to("http://localhost:8000/chat");

// Test mobile-specific elements
await click_element({ selector: ".mobile-menu-toggle" });
await wait_for_element({ selector: ".mobile-menu" });
```

## Testing Workflow

1. **Setup**: Start your Laravel chat app (`php artisan serve`)
2. **Configure**: Ensure MCP server is configured in Cursor
3. **Test**: Use MCP tools to automate browser interactions
4. **Verify**: Check console logs, take screenshots, inspect elements
5. **Debug**: Use element inspection tools to troubleshoot issues

## Best Practices

- Always wait for elements to load before interacting
- Take screenshots at key points for debugging
- Check console logs for JavaScript errors
- Test both headless and visible browser modes
- Test different screen sizes for responsiveness
- Use action sequences for complex multi-step interactions

## Debugging Tips

- Use `get_page_elements` to see all available elements
- Use `get_console_logs` to check for JavaScript errors
- Use `take_screenshot` to capture current state
- Use `execute_javascript` to run custom debugging code
- Use `get_dom_structure` to understand page layout
