#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Testing Cursor MCP Integration...\n');

const mcpConfigPath = '/home/robertocpaes/.cursor/mcp.json';
console.log(`📋 Checking MCP configuration at: ${mcpConfigPath}`);

try {
  const fs = await import('fs');
  const config = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8'));
  
  if (config.mcpServers && config.mcpServers['selenium-browser-automation']) {
    console.log('✅ MCP configuration found');
    console.log(`   Command: ${config.mcpServers['selenium-browser-automation'].command}`);
    console.log(`   Args: ${config.mcpServers['selenium-browser-automation'].args.join(' ')}`);
  } else {
    console.log('❌ MCP configuration not found');
    process.exit(1);
  }
} catch (error) {
  console.log('❌ Error reading MCP configuration:', error.message);
  process.exit(1);
}

const serverPath = '/home/robertocpaes/Projects/Pessoal/mcp-selenium/dist/simple-mcp-server.js';
console.log(`\n🚀 Starting MCP server: ${serverPath}`);

const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe']
});

const listToolsRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/list',
  params: {}
};

console.log('📤 Sending list tools request...');
server.stdin.write(JSON.stringify(listToolsRequest) + '\n');

let output = '';
let errorOutput = '';

server.stdout.on('data', (data) => {
  output += data.toString();
});

server.stderr.on('data', (data) => {
  errorOutput += data.toString();
});

server.on('close', (code) => {
  console.log(`\n📊 Server process exited with code ${code}`);
  
  if (output) {
    try {
      const response = JSON.parse(output.trim());
      
      if (response.result && response.result.tools) {
        console.log(`\n✅ MCP Server is working! Found ${response.result.tools.length} tools:`);
        
        const keyTools = [
          'open_browser', 'navigate_to', 'click_element', 'type_text', 
          'drag_and_drop', 'take_screenshot', 'close_browser'
        ];
        
        keyTools.forEach(toolName => {
          const tool = response.result.tools.find(t => t.name === toolName);
          if (tool) {
            console.log(`   ✅ ${tool.name}: ${tool.description}`);
          } else {
            console.log(`   ❌ ${toolName}: Not found`);
          }
        });
        
        const clickTool = response.result.tools.find(t => t.name === 'click_element');
        if (clickTool && clickTool.inputSchema.properties.by) {
          const hasXPath = clickTool.inputSchema.properties.by.enum.includes('xpath');
          console.log(`\n🎯 XPath Support: ${hasXPath ? '✅ Enabled' : '❌ Not available'}`);
        }
        
        console.log('\n🎉 Cursor MCP Integration Test: PASSED');
        console.log('\n📝 Next Steps:');
        console.log('   1. Restart Cursor IDE');
        console.log('   2. Use the MCP tools in your conversations');
        console.log('   3. Try: "Use the MCP Selenium server to open a browser and go to google.com"');
        
      } else {
        console.log('❌ Invalid response format');
        console.log('Raw output:', output);
      }
    } catch (e) {
      console.log('❌ Failed to parse server response:', e.message);
      console.log('Raw output:', output);
    }
  } else {
    console.log('❌ No output from server');
  }
  
  if (errorOutput) {
    console.log('\n⚠️  Server stderr:', errorOutput);
  }
});

setTimeout(() => {
  console.log('\n⏰ Stopping server...');
  server.kill();
}, 3000);
