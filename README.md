# 🤖 MCP Selenium Browser Automation Server

> **A powerful Model Context Protocol (MCP) server that enables AI assistants to control web browsers through Selenium WebDriver, making automated testing and web interaction seamless and intelligent.**

## 🎯 What This Project Does

This MCP server bridges the gap between AI assistants (like Cursor, Claude, or ChatGPT) and web browsers, allowing them to:

- **Automate browser interactions** - Click buttons, fill forms, navigate pages
- **Perform complex testing** - Drag & drop, hover, double-click, right-click
- **Capture visual feedback** - Take screenshots, inspect page elements
- **Handle dynamic content** - Wait for elements, execute JavaScript
- **Support multiple browsers** - Chrome, Firefox, DuckDuckGo (headless or visible)

## 🚀 Why This Exists

### The Problem

- **Manual testing is time-consuming** - Repetitive browser interactions slow down development
- **AI assistants lack browser control** - They can't directly interact with web applications
- **Complex automation requires coding** - Setting up Selenium scripts for every test case is tedious
- **Integration complexity** - Connecting AI tools with browser automation is challenging

### The Solution

This MCP server provides:

1. **Natural Language Browser Control** - Tell the AI what to do in plain English
2. **Zero-Code Testing** - No need to write complex automation scripts
3. **Intelligent Web Interaction** - AI can see, understand, and interact with web pages
4. **Seamless Integration** - Works directly with Cursor IDE and other MCP-compatible tools

## 🛠️ What Solutions This Provides

### For Developers

- **Automated Testing** - Test your web applications without writing test code
- **UI Validation** - Verify that user interfaces work as expected
- **Regression Testing** - Ensure changes don't break existing functionality
- **Cross-Browser Testing** - Test on multiple browsers with the same commands

### For QA Engineers

- **Rapid Test Creation** - Create test scenarios using natural language
- **Visual Verification** - Take screenshots and compare results
- **Complex Interactions** - Handle drag & drop, form filling, multi-step workflows
- **Error Detection** - Capture console errors and page issues

### For AI Assistants

- **Web Intelligence** - Understand and interact with web content
- **User Simulation** - Perform actions like a real user would
- **Data Extraction** - Gather information from web pages
- **Task Automation** - Complete complex web-based workflows

## 🎨 Key Features

### 🌐 Browser Management

- Open/close browsers (Chrome, Firefox, DuckDuckGo)
- Headless or visible mode
- Custom window sizes and configurations
- Automatic ChromeDriver management

### 🎯 Element Interaction

- **Click** - Buttons, links, checkboxes, radio buttons
- **Type** - Text inputs, textareas, search fields
- **Hover** - Mouse hover effects and tooltips
- **Drag & Drop** - Move elements between containers
- **Multi-click** - Double-click, right-click actions

### 🔍 Page Inspection

- **Element Discovery** - Find and list page elements
- **DOM Analysis** - Inspect page structure and content
- **Script Detection** - Identify loaded JavaScript files
- **Console Monitoring** - Capture browser console logs

### 📸 Visual Feedback

- **Screenshots** - Full page or element-specific captures
- **Before/After** - Visual comparison of changes
- **Error Documentation** - Visual proof of issues

### ⚡ Advanced Capabilities

- **XPath & CSS Selectors** - Precise element targeting
- **Wait Strategies** - Smart waiting for dynamic content
- **JavaScript Execution** - Run custom scripts in browser context
- **Action Sequences** - Chain multiple actions together
- **Plugin System** - Extend functionality with custom plugins

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   AI Assistant  │◄──►│   MCP Server     │◄──►│   Web Browser   │
│   (Cursor/Claude)│    │   (This Project) │    │   (Selenium)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Core Components

- **MCP Server** - Handles communication with AI assistants
- **Browser Automation Core** - Manages Selenium WebDriver interactions
- **Tool Definitions** - Exposes browser capabilities as MCP tools
- **Plugin System** - Allows custom functionality extensions

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd mcp-selenium

# Install dependencies
npm install

# Build the project
npm run build
```

### Cursor IDE Integration ✅ **READY TO USE!**

Your Cursor IDE is already configured with the MCP Selenium server! Simply start using it:

**Example Prompts for Cursor:**

- "Open a browser and go to Google"
- "Test the login form on my website"
- "Drag the menu button to the workflow area"
- "Take a screenshot of the current page"

### Basic Usage with Cursor

```
You: "Open a browser and test my Laravel chat application"
Cursor: Uses MCP tools to:
1. Open browser
2. Navigate to your app
3. Perform automated testing
4. Take screenshots
5. Close browser
```

## 📚 Documentation

- **[Cursor Usage Guide](docs/cursor-usage-guide.md)** - Complete guide for using with Cursor IDE
- **[Cursor Integration Guide](docs/cursor-integration.md)** - Technical setup instructions
- **[Testing with Cursor](docs/testing-with-cursor.md)** - How to use with Cursor IDE
- **[Drag & Drop Examples](docs/drag-drop-examples.md)** - Advanced interaction patterns
- **[Performance Optimization](docs/performance-optimization.md)** - Speed optimization guide

## 🎯 Use Cases

### Web Application Testing

- **Login Flows** - Test authentication processes
- **Form Submissions** - Validate form handling
- **Navigation** - Ensure proper page routing
- **User Workflows** - Complete end-to-end user journeys

### E-commerce Testing

- **Product Search** - Test search functionality
- **Shopping Cart** - Validate cart operations
- **Checkout Process** - Test payment flows
- **User Registration** - Validate signup processes

### Content Management

- **Page Editing** - Test CMS functionality
- **Media Upload** - Validate file handling
- **Content Publishing** - Test publishing workflows
- **User Management** - Test admin functions

### API Testing

- **Form Submissions** - Test API endpoints
- **Data Validation** - Verify data handling
- **Error Scenarios** - Test error conditions
- **Performance** - Monitor response times

## 🔧 Available Tools

| Tool                | Description             | Use Case             |
| ------------------- | ----------------------- | -------------------- |
| `open_browser`      | Start a browser session | Initialize testing   |
| `navigate_to`       | Go to a specific URL    | Page navigation      |
| `click_element`     | Click on elements       | Button interactions  |
| `type_text`         | Enter text in fields    | Form filling         |
| `drag_and_drop`     | Move elements           | Complex interactions |
| `take_screenshot`   | Capture page state      | Visual verification  |
| `get_page_elements` | Inspect page structure  | Element discovery    |
| `execute_script`    | Run JavaScript          | Custom operations    |
| `wait_for_element`  | Wait for elements       | Dynamic content      |
| `close_browser`     | End browser session     | Cleanup              |

## 🌟 Why Choose This Solution

### ✅ Advantages

- **No Code Required** - Use natural language to control browsers
- **AI-Powered** - Leverage AI intelligence for smart interactions
- **Extensible** - Plugin system for custom functionality
- **Cross-Platform** - Works on Windows, macOS, and Linux
- **Multiple Browsers** - Support for Chrome, Firefox, and more
- **Visual Feedback** - Screenshots and visual verification
- **Error Handling** - Robust error detection and reporting

### 🎯 Perfect For

- **Developers** who want to test without writing test code
- **QA Engineers** who need rapid test creation
- **AI Enthusiasts** who want to extend AI capabilities
- **Teams** looking for intelligent automation solutions

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines for details on:

- Code style and standards
- Testing requirements
- Documentation updates
- Plugin development

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Selenium WebDriver** - For browser automation capabilities
- **Model Context Protocol** - For AI assistant integration
- **TypeScript** - For type-safe development
- **Node.js** - For runtime environment

---

**Ready to automate your web testing with AI?** 🚀

Get started by integrating this MCP server with your favorite AI assistant and experience the future of intelligent browser automation!
