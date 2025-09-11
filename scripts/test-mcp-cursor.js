#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Testing MCP Selenium Server with Cursor...\n');

const serverPath = path.join(__dirname, 'dist', 'simple-mcp-server.js');
console.log(`Starting MCP server: ${serverPath}`);

const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe']
});

const listToolsRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/list',
  params: {}
};

console.log('Sending list tools request...');
server.stdin.write(JSON.stringify(listToolsRequest) + '\n');

let output = '';
let errorOutput = '';

server.stdout.on('data', (data) => {
  output += data.toString();
  console.log('Server output:', data.toString());
});

server.stderr.on('data', (data) => {
  errorOutput += data.toString();
  console.log('Server error:', data.toString());
});

server.on('close', (code) => {
  console.log(`\nServer process exited with code ${code}`);
  
  if (output) {
    try {
      const response = JSON.parse(output.trim());
      console.log('\n✅ MCP Server Response:');
      console.log(JSON.stringify(response, null, 2));
      
      if (response.result && response.result.tools) {
        console.log(`\n✅ Found ${response.result.tools.length} tools available:`);
        response.result.tools.forEach(tool => {
          console.log(`  - ${tool.name}: ${tool.description}`);
        });
      }
    } catch (e) {
      console.log('❌ Failed to parse server response:', e.message);
      console.log('Raw output:', output);
    }
  }
  
  if (errorOutput) {
    console.log('\n❌ Server errors:', errorOutput);
  }
});

setTimeout(() => {
  console.log('\n⏰ Stopping server...');
  server.kill();
}, 5000);
