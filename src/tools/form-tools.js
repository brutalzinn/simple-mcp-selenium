export const formTools = [
  {
    name: 'get_form_elements',
    description: 'Get all form elements and their details',
    inputSchema: {
      type: 'object',
      properties: {
        formSelector: {
          type: 'string',
          description: 'CSS selector for specific form (optional)',
        },
      },
    },
  },
  {
    name: 'fill_form',
    description: 'Fill a form with provided data',
    inputSchema: {
      type: 'object',
      properties: {
        formData: {
          type: 'object',
          description: 'Object with field names as keys and values as form data',
          additionalProperties: {
            type: 'string',
          },
        },
        formSelector: {
          type: 'string',
          description: 'CSS selector for the form (optional)',
        },
      },
      required: ['formData'],
    },
  },
  {
    name: 'select_option',
    description: 'Select an option from a select dropdown',
    inputSchema: {
      type: 'object',
      properties: {
        selectSelector: {
          type: 'string',
          description: 'CSS selector or XPath for the select element',
        },
        optionValue: {
          type: 'string',
          description: 'Value of the option to select',
        },
        optionText: {
          type: 'string',
          description: 'Text of the option to select (alternative to optionValue)',
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
      required: ['selectSelector'],
    },
  },
  {
    name: 'check_checkbox',
    description: 'Check or uncheck a checkbox',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector or XPath to find the checkbox',
        },
        checked: {
          type: 'boolean',
          description: 'Whether to check (true) or uncheck (false) the checkbox',
          default: true,
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
    name: 'select_radio_button',
    description: 'Select a radio button from a group',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector or XPath to find the radio button',
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
    name: 'upload_file',
    description: 'Upload a file to a file input element',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector or XPath for the file input element',
        },
        filePath: {
          type: 'string',
          description: 'Path to the file to upload',
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
      required: ['selector', 'filePath'],
    },
  },
];
