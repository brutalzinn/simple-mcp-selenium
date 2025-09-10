# MCP Selenium Server

### DISCLAIMER: this tool is created under less than 30 minutes using cursor just to test features of my own project SaaS. Keep in mind that errors can be throw. In this case, create a issue while we dont have a ideal test coverage ( less than 5% is tested)

A powerful Model Context Protocol (MCP) server that provides comprehensive browser automation capabilities using Selenium WebDriver. This tool enables AI assistants like Cursor to perform automated browser testing, form filling, element interaction, and much more.

## 🚀 Features

### Core Browser Automation

- **Multi-browser support**: Chrome, Firefox, DuckDuckGo
- **Headless & headed modes**: Test with or without visible browser
- **Cross-platform**: Works on Windows, macOS, and Linux
- **Auto-driver management**: Automatically downloads and manages Chrome driver

### Advanced Interactions

- **Element manipulation**: Click, type, hover, double-click, right-click
- **Form handling**: Auto-fill forms, select options, check boxes
- **File operations**: Upload files, take screenshots
- **JavaScript execution**: Run custom scripts in browser context
- **Action sequences**: Execute complex multi-step workflows

### Testing Capabilities

- **Page inspection**: Analyze DOM structure and elements
- **Console monitoring**: Capture and analyze browser console logs
- **Error detection**: Identify JavaScript errors and validation issues
- **Responsive testing**: Test different screen sizes and orientations

## 📦 Installation

### Prerequisites

- Node.js 18+
- Chrome browser (for Chrome automation)
- Git

### Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd mcp-selenium

# Install dependencies
npm install

# Build the project
npm run build

# Test the server
npm test
```

### Global Installation (Optional)

```bash
# Install globally for npx usage
npm install -g .
```

## 🛠️ Usage

### With Cursor IDE

1. **Configure MCP Server**
   Add to your `~/.cursor/mcp.json`:

   ```json
   {
     "mcpServers": {
       "selenium-browser-automation": {
         "command": "node",
         "args": ["/path/to/mcp-selenium/dist/simple-mcp-server.js"],
         "env": {
           "NODE_ENV": "production"
         }
       }
     }
   }
   ```

2. **Restart Cursor** to load the MCP server

3. **Use in Chat**
   ```
   Open a browser and navigate to https://example.com
   Fill the login form with test credentials
   Take a screenshot of the results
   ```

### Direct Usage

```bash
# Run the MCP server directly
node dist/simple-mcp-server.js

# Or use npx (if installed globally)
npx mcp-selenium-server
```

## 🔧 Available Tools

### Browser Management

- `open_browser` - Open browser instance
- `close_browser` - Close browser
- `navigate_to` - Navigate to URL
- `get_current_url` - Get current page URL
- `get_page_title` - Get page title

### Element Interaction

- `click_element` - Click on elements
- `type_text` - Type text into inputs
- `hover_element` - Hover over elements
- `double_click_element` - Double-click elements
- `right_click_element` - Right-click elements

### Form Operations

- `fill_form` - Auto-fill entire forms
- `get_form_elements` - Get form structure
- `select_option` - Select dropdown options
- `check_checkbox` - Check/uncheck boxes
- `select_radio_button` - Select radio buttons

### Advanced Features

- `drag_and_drop` - Drag and drop elements
- `upload_file` - Upload files
- `take_screenshot` - Capture screenshots
- `execute_javascript` - Run custom JavaScript
- `get_console_logs` - Get browser console logs
- `execute_action_sequence` - Execute action sequences

## 📚 Documentation

- [Cursor Integration Guide](docs/cursor-integration.md)
- [Testing with Cursor](docs/testing-with-cursor.md)
- [Laravel Chat Testing](docs/laravel-chat-testing.md)

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run tests with coverage
npm run test:coverage

# Run integration tests
npm run test:integration
```

## 🏗️ Project Structure

```
mcp-selenium/
├── src/                    # Source code
│   ├── core/              # Core browser automation
│   ├── tools/             # MCP tool implementations
│   └── types/             # TypeScript type definitions
├── dist/                  # Compiled JavaScript
├── test/                  # Test files
├── docs/                  # Documentation
├── plugins/               # Plugin system
└── screenshots/           # Generated screenshots
```

## 🔌 Plugin System

The server supports a plugin system for extending functionality:

1. Create a plugin in the `plugins/` directory
2. Export tools using the MCP plugin interface
3. Plugins are automatically loaded at startup

Example plugin:

```javascript
// plugins/my-plugin.js
export default {
  name: "my-plugin",
  tools: [
    {
      name: "custom_action",
      description: "Custom browser action",
      inputSchema: {
        type: "object",
        properties: {
          selector: { type: "string" },
        },
      },
    },
  ],
  handlers: {
    custom_action: async (args, browserManager) => {
      // Your custom logic here
    },
  },
};
```

## 🐛 Troubleshooting

### Common Issues

**Chrome driver not found**

```bash
npm run postinstall  # Downloads Chrome driver
```

**Permission denied**

```bash
chmod +x dist/simple-mcp-server.js
```

**MCP server not loading in Cursor**

- Check `~/.cursor/mcp.json` configuration
- Restart Cursor IDE
- Verify file paths are correct

### Debug Mode

```bash
DEBUG=* node dist/simple-mcp-server.js
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

- [Selenium WebDriver](https://selenium.dev/) for browser automation
- [Model Context Protocol](https://modelcontextprotocol.io/) for AI integration
- [Cursor IDE](https://cursor.sh/) for the development environment

---

**Made with ❤️ for automated browser testing**
