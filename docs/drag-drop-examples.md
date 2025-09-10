# 🎯 Drag and Drop Examples

This document provides comprehensive examples of how to use the `drag_and_drop` tool with the MCP Selenium server.

## 📋 Tool Overview

The `drag_and_drop` tool allows you to:

- **Drag** a draggable element (source)
- **Drop** it onto a drop zone element (destination)

## 🎯 Basic Usage

```json
{
  "tool": "drag_and_drop",
  "arguments": {
    "sourceSelector": "selector-for-draggable-element",
    "targetSelector": "selector-for-drop-zone",
    "sourceBy": "css",
    "targetBy": "css",
    "timeout": 10000
  }
}
```

## 🎨 Real-World Examples

### Example 1: Menu Button to Drawflow Area

**Scenario**: Drag a "Mostrar menu" button to a drawflow area

**HTML Structure**:

```html
<!-- Draggable button -->
<div
  class="flex items-center p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm cursor-grab hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors drag-drawflow"
  draggable="true"
  ondragstart="drag(event)"
  data-node="user_menu"
>
  <svg
    class="svg-inline--fa fa-list-ul fa-w-16 text-gray-500 dark:text-gray-400 w-5 text-center"
  >
    <!-- SVG content -->
  </svg>
  <span class="ml-2 text-sm font-medium text-gray-800 dark:text-gray-200"
    >Mostrar menu</span
  >
</div>

<!-- Drop zone -->
<div id="drawflow" class="drawflow-container">
  <!-- Drop zone content -->
</div>
```

**MCP Tool Call**:

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

### Example 2: Using XPath Selectors

**MCP Tool Call with XPath**:

```json
{
  "tool": "drag_and_drop",
  "arguments": {
    "sourceSelector": "//div[@data-node='user_menu']",
    "targetSelector": "//div[@id='drawflow']",
    "sourceBy": "xpath",
    "targetBy": "xpath",
    "timeout": 10000
  }
}
```

### Example 3: Drag File to Upload Area

**HTML Structure**:

```html
<!-- Draggable file -->
<div class="file-item" draggable="true" data-file-id="123">
  <span>document.pdf</span>
</div>

<!-- Upload drop zone -->
<div id="upload-zone" class="upload-area">
  <p>Drop files here</p>
</div>
```

**MCP Tool Call**:

```json
{
  "tool": "drag_and_drop",
  "arguments": {
    "sourceSelector": ".file-item[data-file-id='123']",
    "targetSelector": "#upload-zone",
    "sourceBy": "css",
    "targetBy": "css",
    "timeout": 15000
  }
}
```

### Example 4: Drag Card to Column

**HTML Structure**:

```html
<!-- Draggable card -->
<div class="kanban-card" draggable="true" data-card-id="card-1">
  <h3>Task Title</h3>
  <p>Task description</p>
</div>

<!-- Target column -->
<div class="kanban-column" id="in-progress">
  <h2>In Progress</h2>
  <!-- Cards will be dropped here -->
</div>
```

**MCP Tool Call**:

```json
{
  "tool": "drag_and_drop",
  "arguments": {
    "sourceSelector": "[data-card-id='card-1']",
    "targetSelector": "#in-progress",
    "sourceBy": "css",
    "targetBy": "css",
    "timeout": 10000
  }
}
```

## 🔍 Selector Strategies

### CSS Selectors (Recommended)

| Element Type | CSS Selector                    | Description                                 |
| ------------ | ------------------------------- | ------------------------------------------- |
| By ID        | `#element-id`                   | Target element with specific ID             |
| By Class     | `.class-name`                   | Target element with specific class          |
| By Attribute | `[data-node="value"]`           | Target element with specific data attribute |
| By Draggable | `[draggable="true"]`            | Target all draggable elements               |
| Complex      | `.parent .child[data-id="123"]` | Complex selector with multiple conditions   |

### XPath Selectors

| Element Type | XPath Selector                             | Description                              |
| ------------ | ------------------------------------------ | ---------------------------------------- |
| By ID        | `//div[@id='element-id']`                  | Target div with specific ID              |
| By Attribute | `//div[@data-node='value']`                | Target div with specific data attribute  |
| By Text      | `//span[text()='Mostrar menu']`            | Target element by text content           |
| By Class     | `//div[contains(@class, 'drag-drawflow')]` | Target element containing specific class |

## ⚠️ Common Issues and Solutions

### Issue 1: Element Not Found

**Error**: `Element not found: [data-node='user_menu']`
**Solution**:

- Verify the selector is correct
- Check if element is visible and loaded
- Use `wait_for_element` before drag and drop

### Issue 2: Drop Zone Not Found

**Error**: `Target element not found: #drawflow`
**Solution**:

- Ensure the drop zone exists on the page
- Check if the ID is correct
- Verify the element is visible

### Issue 3: Drag and Drop Not Working

**Error**: `Drag and drop operation failed`
**Solution**:

- Ensure source element has `draggable="true"`
- Check if target element accepts drops
- Increase timeout value
- Verify elements are not covered by other elements

## 🧪 Testing Your Drag and Drop

### Step 1: Identify Elements

```json
{
  "tool": "get_page_elements",
  "arguments": {
    "selector": "[draggable='true']",
    "limit": 10
  }
}
```

### Step 2: Wait for Elements

```json
{
  "tool": "wait_for_element",
  "arguments": {
    "selector": "[data-node='user_menu']",
    "by": "css",
    "timeout": 10000
  }
}
```

### Step 3: Perform Drag and Drop

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

### Step 4: Take Screenshot

```json
{
  "tool": "take_screenshot",
  "arguments": {
    "filename": "after-drag-drop.png",
    "fullPage": true
  }
}
```

## 🎯 Best Practices

1. **Always wait for elements** before attempting drag and drop
2. **Use specific selectors** to avoid ambiguity
3. **Test with screenshots** to verify the operation
4. **Handle errors gracefully** with appropriate timeouts
5. **Use CSS selectors** when possible (faster than XPath)
6. **Verify both source and target** elements exist before operation

## 🚀 Complete Test Sequence

Here's a complete test sequence for your "Mostrar menu" button:

```json
[
  {
    "tool": "open_browser",
    "arguments": {
      "headless": false,
      "width": 1280,
      "height": 720
    }
  },
  {
    "tool": "navigate_to",
    "arguments": {
      "url": "your-app-url/login"
    }
  },
  {
    "tool": "type_text",
    "arguments": {
      "selector": "input[type='email']",
      "text": "admin@demo.com",
      "by": "css"
    }
  },
  {
    "tool": "type_text",
    "arguments": {
      "selector": "input[type='password']",
      "text": "123",
      "by": "css"
    }
  },
  {
    "tool": "click_element",
    "arguments": {
      "selector": "button[type='submit']",
      "by": "css"
    }
  },
  {
    "tool": "navigate_to",
    "arguments": {
      "url": "your-app-url/company/settings"
    }
  },
  {
    "tool": "wait_for_element",
    "arguments": {
      "selector": "[data-node='user_menu']",
      "by": "css",
      "timeout": 10000
    }
  },
  {
    "tool": "take_screenshot",
    "arguments": {
      "filename": "before-drag.png",
      "fullPage": true
    }
  },
  {
    "tool": "drag_and_drop",
    "arguments": {
      "sourceSelector": "[data-node='user_menu']",
      "targetSelector": "#drawflow",
      "sourceBy": "css",
      "targetBy": "css",
      "timeout": 10000
    }
  },
  {
    "tool": "take_screenshot",
    "arguments": {
      "filename": "after-drag.png",
      "fullPage": true
    }
  },
  {
    "tool": "close_browser",
    "arguments": {}
  }
]
```

This comprehensive guide should help you use the drag and drop functionality effectively with your "Mostrar menu" button and drawflow area!
