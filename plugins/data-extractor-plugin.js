/**
 * Data Extractor Plugin for MCP Selenium Server
 * 
 * Provides powerful tools for extracting structured data from web pages.
 * Supports tables, lists, forms, and custom selectors with multiple output formats.
 */

const dataExtractorPlugin = {
  name: "data-extractor",
  version: "1.0.0",
  description: "Extract structured data from web pages and tables",
  author: "MCP Selenium Team",
  license: "MIT",
  homepage: "https://github.com/robertocpaes/mcp-selenium",
  repository: "https://github.com/robertocpaes/mcp-selenium",
  keywords: ["data-extraction", "scraping", "automation", "tables"],

  tools: [
    {
      name: "extract_table_data",
      description: "Extract data from HTML tables",
      inputSchema: {
        type: "object",
        properties: {
          tableSelector: {
            type: "string",
            description: "CSS selector for the table",
            default: "table"
          },
          includeHeaders: {
            type: "boolean",
            description: "Whether to include table headers",
            default: true
          },
          outputFormat: {
            type: "string",
            enum: ["json", "csv", "text"],
            description: "Output format",
            default: "json"
          },
          maxRows: {
            type: "number",
            description: "Maximum number of rows to extract",
            minimum: 1,
            maximum: 10000
          },
          browserId: {
            type: "string",
            description: "Optional browser ID to use"
          }
        }
      }
    },
    {
      name: "extract_structured_data",
      description: "Extract data using custom selectors",
      inputSchema: {
        type: "object",
        properties: {
          selectors: {
            type: "object",
            description: "Object mapping field names to CSS selectors",
            additionalProperties: {
              type: "string"
            }
          },
          outputFormat: {
            type: "string",
            enum: ["json", "csv", "text"],
            description: "Output format",
            default: "json"
          },
          cleanData: {
            type: "boolean",
            description: "Whether to clean and normalize data",
            default: false
          },
          browserId: {
            type: "string",
            description: "Optional browser ID to use"
          }
        },
        required: ["selectors"]
      }
    },
    {
      name: "extract_form_data",
      description: "Extract data from forms",
      inputSchema: {
        type: "object",
        properties: {
          formSelector: {
            type: "string",
            description: "CSS selector for the form",
            default: "form"
          },
          includeValues: {
            type: "boolean",
            description: "Whether to include field values",
            default: true
          },
          includeLabels: {
            type: "boolean",
            description: "Whether to include field labels",
            default: true
          },
          includeTypes: {
            type: "boolean",
            description: "Whether to include field types",
            default: true
          },
          browserId: {
            type: "string",
            description: "Optional browser ID to use"
          }
        }
      }
    },
    {
      name: "extract_list_data",
      description: "Extract data from lists",
      inputSchema: {
        type: "object",
        properties: {
          listSelector: {
            type: "string",
            description: "CSS selector for the list",
            default: "ul, ol"
          },
          itemSelector: {
            type: "string",
            description: "CSS selector for list items"
          },
          textOnly: {
            type: "boolean",
            description: "Whether to extract only text content",
            default: true
          },
          includeAttributes: {
            type: "array",
            description: "List of attributes to include",
            items: {
              type: "string"
            }
          },
          browserId: {
            type: "string",
            description: "Optional browser ID to use"
          }
        }
      }
    }
  ],

  handlers: {
    extract_table_data: async (args, browserManager) => {
      const {
        tableSelector = "table",
        includeHeaders = true,
        outputFormat = "json",
        maxRows,
        browserId
      } = args;

      try {
        const browser = browserManager.getBrowser(browserId);
        if (!browser) {
          throw new Error(`Browser '${browserId || 'default'}' not found`);
        }

        const tableData = await browser.executeScript(`
          const table = document.querySelector('${tableSelector}');
          if (!table) {
            return { error: 'Table not found with selector: ${tableSelector}' };
          }

          const rows = Array.from(table.querySelectorAll('tr'));
          const data = [];
          let headers = [];

          // Extract headers if requested
          if (${includeHeaders} && rows.length > 0) {
            const headerRow = rows[0];
            const headerCells = Array.from(headerRow.querySelectorAll('th, td'));
            headers = headerCells.map(cell => cell.textContent.trim());
          }

          // Extract data rows
          const startRow = ${includeHeaders} ? 1 : 0;
          const endRow = ${maxRows ? `Math.min(rows.length, ${maxRows + startRow})` : 'rows.length'};
          
          for (let i = startRow; i < endRow; i++) {
            const row = rows[i];
            const cells = Array.from(row.querySelectorAll('td, th'));
            const rowData = cells.map(cell => cell.textContent.trim());
            
            if (${includeHeaders} && headers.length > 0) {
              const rowObj = {};
              headers.forEach((header, index) => {
                rowObj[header] = rowData[index] || '';
              });
              data.push(rowObj);
            } else {
              data.push(rowData);
            }
          }

          return {
            success: true,
            data: data,
            headers: headers,
            rowCount: data.length,
            columnCount: headers.length || (data[0] ? data[0].length : 0)
          };
        `);

        if (tableData.error) {
          throw new Error(tableData.error);
        }

        let output;
        switch (outputFormat) {
          case 'csv':
            output = convertToCSV(tableData.data, tableData.headers);
            break;
          case 'text':
            output = convertToText(tableData.data, tableData.headers);
            break;
          default:
            output = JSON.stringify(tableData.data, null, 2);
        }

        return {
          content: [
            {
              type: "text",
              text: `📊 Extracted ${tableData.rowCount} rows with ${tableData.columnCount} columns from table '${tableSelector}'`
            },
            {
              type: "text",
              text: output
            }
          ]
        };

      } catch (error) {
        throw new Error(`Failed to extract table data: ${error.message}`);
      }
    },

    extract_structured_data: async (args, browserManager) => {
      const {
        selectors,
        outputFormat = "json",
        cleanData = false,
        browserId
      } = args;

      try {
        const browser = browserManager.getBrowser(browserId);
        if (!browser) {
          throw new Error(`Browser '${browserId || 'default'}' not found`);
        }

        const structuredData = await browser.executeScript(`
          const selectors = ${JSON.stringify(selectors)};
          const data = {};
          
          for (const [fieldName, selector] of Object.entries(selectors)) {
            try {
              const element = document.querySelector(selector);
              if (element) {
                let value = element.textContent || element.value || element.innerHTML;
                
                // Clean data if requested
                if (${cleanData}) {
                  value = value.trim().replace(/\\s+/g, ' ');
                }
                
                data[fieldName] = value;
              } else {
                data[fieldName] = null;
              }
            } catch (error) {
              data[fieldName] = null;
            }
          }
          
          return {
            success: true,
            data: data,
            extractedAt: new Date().toISOString(),
            source: window.location.href
          };
        `);

        let output;
        switch (outputFormat) {
          case 'csv':
            output = convertObjectToCSV(structuredData.data);
            break;
          case 'text':
            output = convertObjectToText(structuredData.data);
            break;
          default:
            output = JSON.stringify(structuredData.data, null, 2);
        }

        return {
          content: [
            {
              type: "text",
              text: `🔍 Extracted structured data from ${Object.keys(selectors).length} fields`
            },
            {
              type: "text",
              text: output
            }
          ]
        };

      } catch (error) {
        throw new Error(`Failed to extract structured data: ${error.message}`);
      }
    },

    extract_form_data: async (args, browserManager) => {
      const {
        formSelector = "form",
        includeValues = true,
        includeLabels = true,
        includeTypes = true,
        browserId
      } = args;

      try {
        const browser = browserManager.getBrowser(browserId);
        if (!browser) {
          throw new Error(`Browser '${browserId || 'default'}' not found`);
        }

        const formData = await browser.executeScript(`
          const form = document.querySelector('${formSelector}');
          if (!form) {
            return { error: 'Form not found with selector: ${formSelector}' };
          }

          const fields = Array.from(form.querySelectorAll('input, select, textarea'));
          const data = [];

          fields.forEach(field => {
            const fieldData = {
              name: field.name || field.id || 'unnamed',
              type: field.type || field.tagName.toLowerCase(),
              value: ${includeValues} ? (field.value || '') : undefined,
              label: ${includeLabels} ? (field.labels?.[0]?.textContent || '') : undefined,
              required: field.required || false,
              placeholder: field.placeholder || '',
              options: []
            };

            // Extract options for select elements
            if (field.tagName.toLowerCase() === 'select') {
              const options = Array.from(field.querySelectorAll('option'));
              fieldData.options = options.map(option => ({
                value: option.value,
                text: option.textContent,
                selected: option.selected
              }));
            }

            data.push(fieldData);
          });

          return {
            success: true,
            data: data,
            fieldCount: data.length
          };
        `);

        if (formData.error) {
          throw new Error(formData.error);
        }

        return {
          content: [
            {
              type: "text",
              text: `📝 Extracted ${formData.fieldCount} form fields from '${formSelector}'`
            },
            {
              type: "text",
              text: JSON.stringify(formData.data, null, 2)
            }
          ]
        };

      } catch (error) {
        throw new Error(`Failed to extract form data: ${error.message}`);
      }
    },

    extract_list_data: async (args, browserManager) => {
      const {
        listSelector = "ul, ol",
        itemSelector,
        textOnly = true,
        includeAttributes = [],
        browserId
      } = args;

      try {
        const browser = browserManager.getBrowser(browserId);
        if (!browser) {
          throw new Error(`Browser '${browserId || 'default'}' not found`);
        }

        const listData = await browser.executeScript(`
          const lists = Array.from(document.querySelectorAll('${listSelector}'));
          const allItems = [];

          lists.forEach((list, listIndex) => {
            const items = Array.from(list.querySelectorAll('${itemSelector || 'li'}'));
            
            items.forEach((item, itemIndex) => {
              const itemData = {
                listIndex: listIndex,
                itemIndex: itemIndex,
                text: item.textContent.trim(),
                tagName: item.tagName.toLowerCase()
              };

              ${textOnly ? '' : `
                itemData.innerHTML = item.innerHTML;
                itemData.outerHTML = item.outerHTML;
              `}

              // Include specified attributes
              const attributes = ${JSON.stringify(includeAttributes)};
              attributes.forEach(attr => {
                if (item.hasAttribute(attr)) {
                  itemData[attr] = item.getAttribute(attr);
                }
              });

              allItems.push(itemData);
            });
          });

          return {
            success: true,
            data: allItems,
            itemCount: allItems.length,
            listCount: lists.length
          };
        `);

        return {
          content: [
            {
              type: "text",
              text: `📋 Extracted ${listData.itemCount} items from ${listData.listCount} lists`
            },
            {
              type: "text",
              text: JSON.stringify(listData.data, null, 2)
            }
          ]
        };

      } catch (error) {
        throw new Error(`Failed to extract list data: ${error.message}`);
      }
    }
  },

  initialize: async (browserManager) => {
    console.log("📊 Data Extractor plugin loaded");
  }
};

// Helper functions
function convertToCSV(data, headers) {
  if (!data || data.length === 0) return '';
  
  if (headers && headers.length > 0) {
    // Object data
    const csvHeaders = headers.join(',');
    const csvRows = data.map(row => 
      headers.map(header => `"${(row[header] || '').toString().replace(/"/g, '""')}"`).join(',')
    );
    return [csvHeaders, ...csvRows].join('\n');
  } else {
    // Array data
    return data.map(row => 
      row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
    ).join('\n');
  }
}

function convertToText(data, headers) {
  if (!data || data.length === 0) return 'No data found';
  
  if (headers && headers.length > 0) {
    // Object data
    return data.map((row, index) => {
      const rowText = headers.map(header => `${header}: ${row[header] || ''}`).join('\n');
      return `Row ${index + 1}:\n${rowText}`;
    }).join('\n\n');
  } else {
    // Array data
    return data.map((row, index) => 
      `Row ${index + 1}: ${row.join(' | ')}`
    ).join('\n');
  }
}

function convertObjectToCSV(data) {
  const headers = Object.keys(data);
  const values = headers.map(header => `"${(data[header] || '').toString().replace(/"/g, '""')}"`);
  return [headers.join(','), values.join(',')].join('\n');
}

function convertObjectToText(data) {
  return Object.entries(data)
    .map(([key, value]) => `${key}: ${value || ''}`)
    .join('\n');
}

export default dataExtractorPlugin;
