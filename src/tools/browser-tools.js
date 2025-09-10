export const browserTools = [
  {
    name: 'open_browser',
    description: 'Open a new browser instance',
    inputSchema: {
      type: 'object',
      properties: {
        headless: {
          type: 'boolean',
          description: 'Whether to run browser in headless mode',
          default: false,
        },
        width: {
          type: 'number',
          description: 'Browser window width',
          default: 1280,
        },
        height: {
          type: 'number',
          description: 'Browser window height',
          default: 720,
        },
        browserType: {
          type: 'string',
          enum: ['chrome', 'duckduckgo', 'firefox'],
          description: 'Type of browser to use',
          default: 'chrome',
        },
        userAgent: {
          type: 'string',
          description: 'Custom user agent string',
        },
        proxy: {
          type: 'string',
          description: 'Proxy server (format: host:port)',
        },
      },
    },
  },
  {
    name: 'navigate_to',
    description: 'Navigate to a specific URL',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL to navigate to',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'close_browser',
    description: 'Close the current browser instance',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_page_title',
    description: 'Get the current page title',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_page_url',
    description: 'Get the current page URL',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'wait_for_page_load',
    description: 'Wait for page to fully load including all resources',
    inputSchema: {
      type: 'object',
      properties: {
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds',
          default: 30000,
        },
      },
    },
  },
];