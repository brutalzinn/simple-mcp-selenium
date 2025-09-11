---
title: "Examples"
linkTitle: "Examples"
weight: 40
description: "Real-world examples and use cases for MCP Selenium Server"
---

## Overview

This section provides practical examples of how to use MCP Selenium Server for various automation scenarios.

## Basic Examples

### Simple Login Flow

**Scenario**: Automate a login process

**Natural Language Command:**

```
"Open a browser, go to the login page, type 'admin@example.com' in the email field, type 'password123' in the password field, click the login button, and take a screenshot"
```

**Step-by-step MCP Calls:**

```json
[
  {
    "tool": "open_browser",
    "arguments": {
      "headless": false,
      "browserType": "chrome"
    }
  },
  {
    "tool": "navigate_to",
    "arguments": {
      "url": "https://example.com/login"
    }
  },
  {
    "tool": "type_text",
    "arguments": {
      "selector": "input[name='email']",
      "text": "admin@example.com"
    }
  },
  {
    "tool": "type_text",
    "arguments": {
      "selector": "input[name='password']",
      "text": "password123"
    }
  },
  {
    "tool": "click_element",
    "arguments": {
      "selector": "button[type='submit']"
    }
  },
  {
    "tool": "take_screenshot",
    "arguments": {
      "filename": "after-login.png"
    }
  }
]
```

### Google Search

**Scenario**: Search on Google and capture results

**Natural Language Command:**

```
"Go to Google, search for 'MCP Selenium automation', and take a screenshot of the results"
```

**MCP Implementation:**

```json
{
  "tool": "execute_action_sequence",
  "arguments": {
    "actions": [
      {
        "action": "navigate_to",
        "value": "https://google.com",
        "description": "Navigate to Google"
      },
      {
        "action": "type",
        "selector": "input[name='q']",
        "value": "MCP Selenium automation",
        "description": "Enter search query"
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
        "description": "Wait for results"
      },
      {
        "action": "take_screenshot",
        "value": "google-search-results.png",
        "description": "Capture results"
      }
    ]
  }
}
```

## Multi-Browser Examples

### Parallel User Testing

**Scenario**: Test multiple user sessions simultaneously

**Setup:**

```json
[
  {
    "tool": "open_browser",
    "arguments": {
      "browserId": "user1",
      "headless": false,
      "browserType": "chrome"
    }
  },
  {
    "tool": "open_browser",
    "arguments": {
      "browserId": "user2",
      "headless": false,
      "browserType": "chrome"
    }
  }
]
```

**User 1 Actions:**

```json
[
  {
    "tool": "navigate_to",
    "arguments": {
      "url": "https://app.example.com/login",
      "browserId": "user1"
    }
  },
  {
    "tool": "type_text",
    "arguments": {
      "selector": "input[name='email']",
      "text": "user1@example.com",
      "browserId": "user1"
    }
  },
  {
    "tool": "type_text",
    "arguments": {
      "selector": "input[name='password']",
      "text": "password1",
      "browserId": "user1"
    }
  },
  {
    "tool": "click_element",
    "arguments": {
      "selector": "button[type='submit']",
      "browserId": "user1"
    }
  }
]
```

**User 2 Actions:**

```json
[
  {
    "tool": "navigate_to",
    "arguments": {
      "url": "https://app.example.com/login",
      "browserId": "user2"
    }
  },
  {
    "tool": "type_text",
    "arguments": {
      "selector": "input[name='email']",
      "text": "user2@example.com",
      "browserId": "user2"
    }
  },
  {
    "tool": "type_text",
    "arguments": {
      "selector": "input[name='password']",
      "text": "password2",
      "browserId": "user2"
    }
  },
  {
    "tool": "click_element",
    "arguments": {
      "selector": "button[type='submit']",
      "browserId": "user2"
    }
  }
]
```

### A/B Testing

**Scenario**: Test different versions of a page

**Version A Testing:**

```json
{
  "tool": "open_browser",
  "arguments": {
    "browserId": "version-a",
    "headless": false
  }
}
```

**Version B Testing:**

```json
{
  "tool": "open_browser",
  "arguments": {
    "browserId": "version-b",
    "headless": false
  }
}
```

## Advanced Examples

### Drag and Drop Workflow

**Scenario**: Drag a menu item to a workflow area

**Natural Language Command:**

```
"Drag the 'Mostrar menu' button to the drawflow area and take a screenshot"
```

**MCP Implementation:**

```json
{
  "tool": "drag_and_drop",
  "arguments": {
    "sourceSelector": "[data-node='user_menu']",
    "targetSelector": "#drawflow",
    "sourceBy": "css",
    "targetBy": "css",
    "timeout": 10000
  }
}
```

### Form Testing

**Scenario**: Test a complex form with validation

**Natural Language Command:**

```
"Fill out the contact form with test data, submit it, and verify the success message"
```

**MCP Implementation:**

```json
{
  "tool": "execute_action_sequence",
  "arguments": {
    "actions": [
      {
        "action": "navigate_to",
        "value": "https://example.com/contact",
        "description": "Go to contact page"
      },
      {
        "action": "type",
        "selector": "input[name='name']",
        "value": "John Doe",
        "description": "Enter name"
      },
      {
        "action": "type",
        "selector": "input[name='email']",
        "value": "john@example.com",
        "description": "Enter email"
      },
      {
        "action": "type",
        "selector": "textarea[name='message']",
        "value": "This is a test message",
        "description": "Enter message"
      },
      {
        "action": "click",
        "selector": "button[type='submit']",
        "description": "Submit form"
      },
      {
        "action": "wait_for_element",
        "selector": ".success-message",
        "timeout": 10000,
        "description": "Wait for success message"
      },
      {
        "action": "take_screenshot",
        "value": "form-submission-success.png",
        "description": "Capture success state"
      }
    ]
  }
}
```

### E-commerce Testing

**Scenario**: Complete purchase flow

**Natural Language Command:**

```
"Add a product to cart, proceed to checkout, fill shipping information, and complete the purchase"
```

**MCP Implementation:**

```json
{
  "tool": "execute_action_sequence",
  "arguments": {
    "actions": [
      {
        "action": "navigate_to",
        "value": "https://shop.example.com/products/laptop",
        "description": "Go to product page"
      },
      {
        "action": "click",
        "selector": ".add-to-cart-button",
        "description": "Add to cart"
      },
      {
        "action": "click",
        "selector": ".cart-icon",
        "description": "View cart"
      },
      {
        "action": "click",
        "selector": ".checkout-button",
        "description": "Proceed to checkout"
      },
      {
        "action": "type",
        "selector": "input[name='shipping_name']",
        "value": "John Doe",
        "description": "Enter shipping name"
      },
      {
        "action": "type",
        "selector": "input[name='shipping_address']",
        "value": "123 Main St",
        "description": "Enter address"
      },
      {
        "action": "type",
        "selector": "input[name='shipping_city']",
        "value": "New York",
        "description": "Enter city"
      },
      {
        "action": "type",
        "selector": "input[name='shipping_zip']",
        "value": "10001",
        "description": "Enter ZIP code"
      },
      {
        "action": "click",
        "selector": ".payment-button",
        "description": "Proceed to payment"
      },
      {
        "action": "take_screenshot",
        "value": "checkout-complete.png",
        "description": "Capture checkout state"
      }
    ]
  }
}
```

## Plugin Examples

### CAPTCHA Handling

**Scenario**: Detect and handle CAPTCHAs

**Natural Language Command:**

```
"Check if there's a CAPTCHA on this page and wait for me to solve it"
```

**MCP Implementation:**

```json
[
  {
    "tool": "detect_captcha",
    "arguments": {
      "timeout": 5000
    }
  },
  {
    "tool": "wait_for_captcha_solve",
    "arguments": {
      "timeout": 300000
    }
  }
]
```

### Google Search Plugin

**Scenario**: Use the Google search plugin

**Natural Language Command:**

```
"Search for 'MCP Selenium automation' on Google"
```

**MCP Implementation:**

```json
{
  "tool": "google_search",
  "arguments": {
    "query": "MCP Selenium automation"
  }
}
```

## Performance Examples

### Fast Testing

**Scenario**: Quick validation with minimal overhead

**Configuration:**

```json
{
  "tool": "open_browser",
  "arguments": {
    "headless": true,
    "browserType": "chrome"
  }
}
```

**Fast Actions:**

```json
{
  "tool": "execute_action_sequence",
  "arguments": {
    "actions": [
      {
        "action": "navigate_to",
        "value": "https://example.com",
        "timeout": 3000
      },
      {
        "action": "click",
        "selector": "#main-button",
        "timeout": 2000
      },
      {
        "action": "take_screenshot",
        "value": "quick-test.png"
      }
    ]
  }
}
```

## Error Handling Examples

### Robust Testing

**Scenario**: Handle potential errors gracefully

**MCP Implementation:**

```json
{
  "tool": "execute_action_sequence",
  "arguments": {
    "actions": [
      {
        "action": "navigate_to",
        "value": "https://example.com",
        "description": "Navigate to site"
      },
      {
        "action": "wait_for_element",
        "selector": "#main-content",
        "timeout": 10000,
        "description": "Wait for page load"
      },
      {
        "action": "click",
        "selector": "#login-button",
        "timeout": 5000,
        "description": "Click login"
      }
    ],
    "continueOnError": false,
    "stopOnError": true
  }
}
```

## Best Practices

1. **Use action sequences** for complex workflows
2. **Handle errors gracefully** with proper error checking
3. **Take screenshots** at key points for debugging
4. **Use appropriate timeouts** for different operations
5. **Test with multiple browsers** for cross-browser compatibility
6. **Clean up resources** by closing browsers when done
7. **Use meaningful browser IDs** for multi-browser scenarios
8. **Validate elements exist** before interacting with them
