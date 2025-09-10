# 🤖 MCP Selenium Browser Automation Server

### Disclaimer: This project build using Cursor and doesnt have a sufficient test coverage. The quality of code is very poor. Soo, keep in mind i can delay to fix somethings. Create a PR if found a problem.

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

### Project Structure

```
mcp-selenium/
├── src/                    # Source code
│   ├── core/              # Browser automation core
│   ├── types/             # TypeScript type definitions
│   ├── simple-mcp-server.ts # Main MCP server
│   └── plugin-manager.ts  # Plugin system
├── plugins/               # Custom plugins
│   ├── example-plugin.js  # Hello World demo
│   └── captcha-plugin.js  # CAPTCHA handling
├── scripts/               # Utility scripts
│   ├── install-simple.sh  # Docker installation
│   ├── start.sh          # Start server
│   ├── stop.sh           # Stop server
│   └── download-chromedriver.js # Chrome driver setup
├── docs/                  # Documentation
├── screenshots/           # Screenshots (accessible to LLM)
├── docker-compose.yml     # Docker configuration
└── Dockerfile            # Container definition
```

### Core Components

- **MCP Server** - Handles communication with AI assistants
- **Browser Automation Core** - Manages Selenium WebDriver interactions
- **Tool Definitions** - Exposes browser capabilities as MCP tools
- **Plugin System** - Allows custom functionality extensions

## ⚠️ Security Disclaimer

**This project is not intended to be used for data capture, scraping confidential information, or any other type of thing that could put the security of other users at risk.**

Please use this tool responsibly and in accordance with:

- Website terms of service
- Local and international laws
- Ethical guidelines for automation
- Respect for user privacy and data protection

## 🚀 Getting Started

### Step 1: Clone the Repository

```bash
git clone https://github.com/brutalzinn/simple-mcp-selenium
cd mcp-selenium
```

### Step 2: Install Dependencies

**Option A: Docker (Recommended)**

```bash
# Simple installation with Docker
./scripts/install-simple.sh
```

**Option B: Manual Installation**

```bash
# Install Node.js dependencies
npm install

# Build the project
npm run build
```

### Step 3: Start the MCP Server

**With Docker:**

```bash
# Start the server
./scripts/start.sh

# Check if it's running
docker compose ps
```

**Without Docker:**

```bash
# Start the server directly
npm start
```

### Step 4: Verify Installation

```bash
# Test browser functionality
node scripts/test-docker-browser.js
```

### Step 5: Configure Cursor IDE

The MCP server is already configured for Cursor IDE! You can start using it immediately with commands like:

- "Open a browser and go to Google"
- "Run the hello world demo"
- "Take a screenshot of the current page"

### Step 6: Troubleshooting

**Common Issues:**

**Docker not starting:**

```bash
# Check Docker status
docker --version
docker compose --version

# Restart Docker service
sudo systemctl restart docker
```

**Browser not working:**

```bash
# Test browser functionality
node scripts/test-docker-browser.js

# Check container logs
docker compose logs -f
```

**MCP server not responding:**

```bash
# Restart the server
./scripts/stop.sh
./scripts/start.sh

# Check if port is available
netstat -tlnp | grep :3000
```

**Need help?**

- Check the [Installation Guide](docs/installation-guide.md)
- Review the [Cursor Usage Guide](docs/cursor-usage-guide.md)
- Test with the [Hello World Demo](plugins/example-plugin.js)

### Step 7: Quick Reference

**Essential Commands:**

```bash
# Start server
./scripts/start.sh

# Stop server
./scripts/stop.sh

# View logs
docker compose logs -f

# Test browser
node scripts/test-docker-browser.js

# Restart everything
./scripts/stop.sh && ./scripts/start.sh
```

**First Test:**

```bash
# Run the hello world demo
node -e "
const { spawn } = require('child_process');
const mcp = spawn('node', ['dist/simple-mcp-server.js']);
mcp.stdin.write(JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: {
    name: 'hello_world_demo',
    arguments: {}
  }
}) + '\n');
"
```

## 🚀 Quick Start

### Installation (Docker - Recommended)

```bash
# Clone the repository
git clone https://github.com/brutalzinn/simple-mcp-selenium
cd mcp-selenium

# Install and start with Docker (includes browser support)
./scripts/install-simple.sh
```

**That's it!** The MCP server will start automatically with full browser support.

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
- **[Plugin Development](docs/plugin-development.md)** - How to create custom plugins
- **[Installation Guide](docs/installation-guide.md)** - Docker setup instructions
- **[Scripts Documentation](scripts/README.md)** - Available utility scripts
- **[Drag & Drop Examples](docs/drag-drop-examples.md)** - Advanced interaction patterns
- **[Performance Optimization](docs/performance-optimization.md)** - Speed optimization guide

## 🔒 Security & Ethics

### Responsible Usage Guidelines

This browser automation tool should be used responsibly and ethically:

#### ✅ **Appropriate Uses:**

- **Testing your own applications** - Automated testing of your own websites and applications
- **Educational purposes** - Learning browser automation and testing techniques
- **Development workflows** - Automating repetitive development tasks
- **Quality assurance** - Testing functionality and user experience
- **Accessibility testing** - Ensuring applications work for all users

#### ❌ **Inappropriate Uses:**

- **Data scraping** - Extracting data from websites without permission
- **Confidential information** - Accessing or capturing sensitive user data
- **Bypassing security measures** - Circumventing authentication or protection systems
- **Spam or abuse** - Automated actions that could harm other users
- **Terms of service violations** - Actions that violate website policies

#### 🛡️ **Security Considerations:**

- Always respect website terms of service
- Obtain proper authorization before testing
- Use appropriate rate limiting and delays
- Protect any credentials or sensitive data
- Follow data protection regulations (GDPR, CCPA, etc.)

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
- **Cross-Platform** - Works on Windows and Linux ( no tested at mac osx yet but i think works. Just make sure the xcode build tools is ready. )
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
- **Model Context Protocol** - For Anthropic
- **TypeScript** - For type-safe development
- **Node.js** - For runtime environment

---

**Ready to automate your web testing with AI?** 🚀

Get started by integrating this MCP server with your favorite AI assistant and experience the future of intelligent browser automation!
