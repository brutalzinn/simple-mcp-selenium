export const elementTools = [
  {
    name: 'find_element',
    description: 'Find an element on the page',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector or XPath to find the element',
        },
        by: {
          type: 'string',
          enum: ['css', 'xpath', 'id', 'name', 'className', 'tagName'],
          description: 'Type of selector',
          default: 'css',
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds',
          default: 10000,
        },
      },
      required: ['selector'],
    },
  },
  {
    name: 'click_element',
    description: 'Click on an element',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector or XPath to find the element',
        },
        by: {
          type: 'string',
          enum: ['css', 'xpath', 'id', 'name', 'className', 'tagName'],
          description: 'Type of selector',
          default: 'css',
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds',
          default: 10000,
        },
      },
      required: ['selector'],
    },
  },
  {
    name: 'type_text',
    description: 'Type text into an input field',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector or XPath to find the element',
        },
        text: {
          type: 'string',
          description: 'Text to type',
        },
        by: {
          type: 'string',
          enum: ['css', 'xpath', 'id', 'name', 'className', 'tagName'],
          description: 'Type of selector',
          default: 'css',
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds',
          default: 10000,
        },
      },
      required: ['selector', 'text'],
    },
  },
  {
    name: 'hover_element',
    description: 'Hover over an element',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector or XPath to find the element',
        },
        by: {
          type: 'string',
          enum: ['css', 'xpath', 'id', 'name', 'className', 'tagName'],
          description: 'Type of selector',
          default: 'css',
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds',
          default: 10000,
        },
      },
      required: ['selector'],
    },
  },
  {
    name: 'double_click_element',
    description: 'Double-click on an element',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector or XPath to find the element',
        },
        by: {
          type: 'string',
          enum: ['css', 'xpath', 'id', 'name', 'className', 'tagName'],
          description: 'Type of selector',
          default: 'css',
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds',
          default: 10000,
        },
      },
      required: ['selector'],
    },
  },
  {
    name: 'right_click_element',
    description: 'Right-click on an element',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector or XPath to find the element',
        },
        by: {
          type: 'string',
          enum: ['css', 'xpath', 'id', 'name', 'className', 'tagName'],
          description: 'Type of selector',
          default: 'css',
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds',
          default: 10000,
        },
      },
      required: ['selector'],
    },
  },
  {
    name: 'scroll_to_element',
    description: 'Scroll to a specific element on the page',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector or XPath to find the element',
        },
        by: {
          type: 'string',
          enum: ['css', 'xpath', 'id', 'name', 'className', 'tagName'],
          description: 'Type of selector',
          default: 'css',
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds',
          default: 10000,
        },
      },
      required: ['selector'],
    },
  },
  {
    name: 'wait_for_element',
    description: 'Wait for an element to be present and visible',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector or XPath to find the element',
        },
        by: {
          type: 'string',
          enum: ['css', 'xpath', 'id', 'name', 'className', 'tagName'],
          description: 'Type of selector',
          default: 'css',
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds',
          default: 10000,
        },
      },
      required: ['selector'],
    },
  },
  {
    name: 'get_element_attributes',
    description: 'Get all attributes of an element',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector or XPath to find the element',
        },
        by: {
          type: 'string',
          enum: ['css', 'xpath', 'id', 'name', 'className', 'tagName'],
          description: 'Type of selector',
          default: 'css',
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds',
          default: 10000,
        },
      },
      required: ['selector'],
    },
  },
];