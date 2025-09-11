---
title: "Data Extractor Plugin"
linkTitle: "Data Extractor"
weight: 10
description: "Extract structured data from web pages and tables"
author: "MCP Selenium Team"
github: "robertocpaes"
version: "1.0.0"
tags: ["data-extraction", "scraping", "automation", "tables"]
---

## Overview

The Data Extractor Plugin provides powerful tools for extracting structured data from web pages. It can extract data from tables, lists, forms, and other structured elements with support for various output formats.

## Installation

```bash
# Copy the plugin file to your plugins directory
cp data-extractor-plugin.js plugins/

# Restart the MCP server
docker-compose restart
```

## Features

- **Table Extraction** - Extract data from HTML tables with headers
- **List Extraction** - Extract data from ordered and unordered lists
- **Form Data Extraction** - Extract form field values and structure
- **Custom Selectors** - Use CSS selectors to target specific elements
- **Multiple Output Formats** - JSON, CSV, and plain text output
- **Data Validation** - Built-in data validation and cleaning
- **Batch Processing** - Extract data from multiple pages at once

## Usage

### Basic Table Extraction

```json
{
  "tool": "extract_table_data",
  "arguments": {
    "tableSelector": "table",
    "includeHeaders": true,
    "outputFormat": "json"
  }
}
```

### Advanced Data Extraction

```json
{
  "tool": "extract_structured_data",
  "arguments": {
    "selectors": {
      "title": "h1",
      "description": ".description",
      "price": ".price",
      "rating": ".rating"
    },
    "outputFormat": "json",
    "cleanData": true
  }
}
```

### Form Data Extraction

```json
{
  "tool": "extract_form_data",
  "arguments": {
    "formSelector": "form",
    "includeValues": true,
    "includeLabels": true
  }
}
```

## API Reference

### extract_table_data

Extract data from HTML tables.

**Parameters:**

- `tableSelector` (string, default: "table") - CSS selector for the table
- `includeHeaders` (boolean, default: true) - Whether to include table headers
- `outputFormat` (string, default: "json") - Output format: "json", "csv", "text"
- `maxRows` (number, optional) - Maximum number of rows to extract
- `browserId` (string, optional) - Browser ID to use

**Example:**

```json
{
  "tool": "extract_table_data",
  "arguments": {
    "tableSelector": "#data-table",
    "includeHeaders": true,
    "outputFormat": "json",
    "maxRows": 100
  }
}
```

**Response:**

```json
{
  "content": [
    {
      "type": "text",
      "text": "Extracted 25 rows with 4 columns from table #data-table"
    },
    {
      "type": "text",
      "text": "[\n  {\"Name\": \"John Doe\", \"Age\": \"30\", \"City\": \"New York\", \"Salary\": \"$50,000\"},\n  {\"Name\": \"Jane Smith\", \"Age\": \"25\", \"City\": \"Los Angeles\", \"Salary\": \"$45,000\"}\n]"
    }
  ]
}
```

### extract_structured_data

Extract data using custom selectors.

**Parameters:**

- `selectors` (object, required) - Object mapping field names to CSS selectors
- `outputFormat` (string, default: "json") - Output format
- `cleanData` (boolean, default: false) - Whether to clean and normalize data
- `browserId` (string, optional) - Browser ID to use

**Example:**

```json
{
  "tool": "extract_structured_data",
  "arguments": {
    "selectors": {
      "title": "h1.product-title",
      "price": ".price-value",
      "description": ".product-description",
      "rating": ".rating-stars"
    },
    "cleanData": true,
    "outputFormat": "json"
  }
}
```

### extract_form_data

Extract data from forms.

**Parameters:**

- `formSelector` (string, default: "form") - CSS selector for the form
- `includeValues` (boolean, default: true) - Whether to include field values
- `includeLabels` (boolean, default: true) - Whether to include field labels
- `includeTypes` (boolean, default: true) - Whether to include field types
- `browserId` (string, optional) - Browser ID to use

**Example:**

```json
{
  "tool": "extract_form_data",
  "arguments": {
    "formSelector": "#contact-form",
    "includeValues": true,
    "includeLabels": true,
    "includeTypes": true
  }
}
```

### extract_list_data

Extract data from lists.

**Parameters:**

- `listSelector` (string, default: "ul, ol") - CSS selector for the list
- `itemSelector` (string, optional) - CSS selector for list items
- `textOnly` (boolean, default: true) - Whether to extract only text content
- `includeAttributes` (array, optional) - List of attributes to include
- `browserId` (string, optional) - Browser ID to use

**Example:**

```json
{
  "tool": "extract_list_data",
  "arguments": {
    "listSelector": ".product-list",
    "itemSelector": ".product-item",
    "textOnly": false,
    "includeAttributes": ["href", "data-id"]
  }
}
```

## Examples

### E-commerce Product Extraction

```json
{
  "tool": "extract_structured_data",
  "arguments": {
    "selectors": {
      "name": ".product-name",
      "price": ".price",
      "description": ".product-description",
      "image": ".product-image img",
      "rating": ".rating",
      "availability": ".stock-status"
    },
    "cleanData": true,
    "outputFormat": "json"
  }
}
```

### News Article Extraction

```json
{
  "tool": "extract_structured_data",
  "arguments": {
    "selectors": {
      "headline": "h1.headline",
      "author": ".author-name",
      "date": ".publish-date",
      "content": ".article-content",
      "tags": ".tags a"
    },
    "cleanData": true,
    "outputFormat": "json"
  }
}
```

### Contact Form Analysis

```json
{
  "tool": "extract_form_data",
  "arguments": {
    "formSelector": "#contact-form",
    "includeValues": true,
    "includeLabels": true,
    "includeTypes": true
  }
}
```

## Configuration

### Data Cleaning Options

When `cleanData` is enabled, the plugin will:

- Remove extra whitespace and normalize text
- Convert numbers to appropriate types
- Clean HTML entities and special characters
- Normalize date formats
- Remove empty values

### Output Formats

#### JSON Format

```json
{
  "data": [
    { "field1": "value1", "field2": "value2" },
    { "field1": "value3", "field2": "value4" }
  ],
  "metadata": {
    "extractedAt": "2024-01-01T00:00:00Z",
    "source": "https://example.com",
    "totalRows": 2
  }
}
```

#### CSV Format

```csv
field1,field2
value1,value2
value3,value4
```

#### Text Format

```
Field1: value1
Field2: value2

Field1: value3
Field2: value4
```

## Troubleshooting

### Common Issues

#### No Data Extracted

- Check if selectors are correct
- Ensure elements are visible and loaded
- Try increasing timeout values
- Verify the page structure

#### Malformed Data

- Enable `cleanData` option
- Check for dynamic content loading
- Use more specific selectors
- Handle different data formats

#### Performance Issues

- Use more specific selectors
- Limit the number of rows with `maxRows`
- Extract data in smaller batches
- Use headless mode for better performance

### Debug Mode

Enable debug logging to troubleshoot issues:

```json
{
  "tool": "extract_table_data",
  "arguments": {
    "tableSelector": "table",
    "debug": true
  }
}
```

## Best Practices

1. **Use Specific Selectors** - More specific selectors are faster and more reliable
2. **Enable Data Cleaning** - Clean data for better consistency
3. **Handle Dynamic Content** - Wait for content to load before extracting
4. **Test Selectors** - Use browser dev tools to test selectors first
5. **Batch Processing** - Extract data in smaller batches for large datasets
6. **Error Handling** - Always handle extraction errors gracefully

## Contributing

Want to improve the Data Extractor Plugin?

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see [LICENSE](https://github.com/robertocpaes/mcp-selenium/blob/main/LICENSE) for details.

## Support

- 📚 [Documentation]({{< relref "/" >}})
- 💬 [GitHub Discussions](https://github.com/robertocpaes/mcp-selenium/discussions)
- 🐛 [Report Issues](https://github.com/robertocpaes/mcp-selenium/issues)
