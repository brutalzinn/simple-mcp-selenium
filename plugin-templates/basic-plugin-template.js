/**
 * Basic Plugin Template for MCP Selenium Server
 * 
 * This template provides a starting point for creating new plugins.
 * Copy this file to the plugins/ directory and customize it for your needs.
 */

const basicPluginTemplate = {
  // Plugin metadata
  name: "basic-plugin-template",
  version: "1.0.0",
  description: "A basic plugin template for MCP Selenium Server",
  author: "Your Name",
  license: "MIT",
  homepage: "https://github.com/yourusername/your-plugin",
  repository: "https://github.com/yourusername/your-plugin",
  keywords: ["template", "example", "basic"],

  // Plugin tools
  tools: [
    {
      name: 'example_tool',
      description: 'An example tool that demonstrates basic functionality',
      inputSchema: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'Message to display or process',
            default: 'Hello from the plugin!'
          },
          timeout: {
            type: 'number',
            description: 'Timeout in milliseconds',
            default: 5000,
            minimum: 1000,
            maximum: 60000
          },
          browserId: {
            type: 'string',
            description: 'Optional browser ID to use. If not provided, uses the default browser instance.'
          }
        },
        required: []
      }
    },
    {
      name: 'get_page_info',
      description: 'Get comprehensive information about the current page',
      inputSchema: {
        type: 'object',
        properties: {
          includeElements: {
            type: 'boolean',
            description: 'Whether to include page elements information',
            default: true
          },
          elementLimit: {
            type: 'number',
            description: 'Maximum number of elements to return',
            default: 50,
            minimum: 1,
            maximum: 1000
          },
          browserId: {
            type: 'string',
            description: 'Optional browser ID to use. If not provided, uses the default browser instance.'
          }
        }
      }
    }
  ],

  // Tool handlers
  handlers: {
    example_tool: async (args, browserManager) => {
      const { message = 'Hello from the plugin!', timeout = 5000, browserId } = args;

      try {
        // Get browser instance
        const browser = browserManager.getBrowser(browserId);
        if (!browser) {
          throw new Error(`Browser '${browserId || 'default'}' not found`);
        }

        // Execute JavaScript in the browser
        const result = await browser.executeScript(`
          // Create a temporary element to display the message
          const messageDiv = document.createElement('div');
          messageDiv.style.cssText = \`
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 15px;
            border-radius: 5px;
            z-index: 10000;
            font-family: Arial, sans-serif;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
          \`;
          messageDiv.textContent = '${message}';
          document.body.appendChild(messageDiv);

          // Remove the message after timeout
          setTimeout(() => {
            if (messageDiv.parentNode) {
              messageDiv.parentNode.removeChild(messageDiv);
            }
          }, ${timeout});

          return {
            success: true,
            message: 'Message displayed successfully',
            timeout: ${timeout}
          };
        `);

        return {
          content: [
            {
              type: 'text',
              text: `✅ ${result.message} (Timeout: ${result.timeout}ms)`
            }
          ]
        };

      } catch (error) {
        throw new Error(`Example tool failed: ${error.message}`);
      }
    },

    get_page_info: async (args, browserManager) => {
      const { includeElements = true, elementLimit = 50, browserId } = args;

      try {
        // Get browser instance
        const browser = browserManager.getBrowser(browserId);
        if (!browser) {
          throw new Error(`Browser '${browserId || 'default'}' not found`);
        }

        // Get basic page information
        const pageInfo = await browser.executeScript(`
          const info = {
            title: document.title,
            url: window.location.href,
            domain: window.location.hostname,
            protocol: window.location.protocol,
            pathname: window.location.pathname,
            search: window.location.search,
            hash: window.location.hash,
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            readyState: document.readyState,
            lastModified: document.lastModified,
            referrer: document.referrer,
            characterSet: document.characterSet,
            doctype: document.doctype ? document.doctype.name : null,
            viewport: {
              width: window.innerWidth,
              height: window.innerHeight,
              devicePixelRatio: window.devicePixelRatio
            },
            screen: {
              width: screen.width,
              height: screen.height,
              availWidth: screen.availWidth,
              availHeight: screen.availHeight,
              colorDepth: screen.colorDepth,
              pixelDepth: screen.pixelDepth
            }
          };

          // Add elements information if requested
          if (${includeElements}) {
            const elements = Array.from(document.querySelectorAll('*')).slice(0, ${elementLimit});
            info.elements = elements.map((el, index) => ({
              index: index,
              tagName: el.tagName.toLowerCase(),
              id: el.id || null,
              className: el.className || null,
              textContent: el.textContent ? el.textContent.substring(0, 100) : null,
              innerHTML: el.innerHTML ? el.innerHTML.substring(0, 200) : null,
              attributes: Array.from(el.attributes).reduce((acc, attr) => {
                acc[attr.name] = attr.value;
                return acc;
              }, {}),
              boundingRect: el.getBoundingClientRect(),
              isVisible: el.offsetParent !== null,
              isEnabled: !el.disabled
            }));
          }

          return info;
        `);

        // Format the response
        const response = [
          {
            type: 'text',
            text: `📄 Page Information for: ${pageInfo.title}`
          },
          {
            type: 'text',
            text: `🔗 URL: ${pageInfo.url}`
          },
          {
            type: 'text',
            text: `🌐 Domain: ${pageInfo.domain}`
          },
          {
            type: 'text',
            text: `📱 Viewport: ${pageInfo.viewport.width}x${pageInfo.viewport.height}`
          },
          {
            type: 'text',
            text: `💻 Screen: ${pageInfo.screen.width}x${pageInfo.screen.height}`
          }
        ];

        if (includeElements && pageInfo.elements) {
          response.push({
            type: 'text',
            text: `\n🔍 Found ${pageInfo.elements.length} elements:`
          });

          // Add first few elements as examples
          const exampleElements = pageInfo.elements.slice(0, 5);
          exampleElements.forEach((element, index) => {
            response.push({
              type: 'text',
              text: `  ${index + 1}. <${element.tagName}>${element.id ? '#' + element.id : ''}${element.className ? '.' + element.className.split(' ').join('.') : ''}`
            });
          });

          if (pageInfo.elements.length > 5) {
            response.push({
              type: 'text',
              text: `  ... and ${pageInfo.elements.length - 5} more elements`
            });
          }
        }

        return {
          content: response
        };

      } catch (error) {
        throw new Error(`Get page info failed: ${error.message}`);
      }
    }
  },

  // Plugin lifecycle hooks
  initialize: async (browserManager) => {
    console.log('🚀 Basic Plugin Template loaded successfully');
    console.log('📝 This is a template plugin - customize it for your needs');
    
    // You can perform initialization tasks here
    // For example, set up event listeners, initialize resources, etc.
  },

  cleanup: async () => {
    console.log('🧹 Basic Plugin Template cleanup');
    
    // You can perform cleanup tasks here
    // For example, remove event listeners, close connections, etc.
  }
};

export default basicPluginTemplate;
