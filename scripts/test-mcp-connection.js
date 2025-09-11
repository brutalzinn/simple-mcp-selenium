#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Testing MCP Server Connection...\n');

const serverPath = join(__dirname, 'dist', 'simple-mcp-server.js');
console.log(`📁 Server path: ${serverPath}`);

const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';
let errorOutput = '';

server.stdout.on('data', (data) => {
  output += data.toString();
  console.log('📤 Server output:', data.toString().trim());
});

server.stderr.on('data', (data) => {
  errorOutput += data.toString();
  console.log('⚠️  Server error:', data.toString().trim());
});

setTimeout(() => {
  console.log('\n🔍 Testing MCP Protocol...');
  
  const initRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: {
        name: "test-client",
        version: "1.0.0"
      }
    }
  };
  
  console.log('📤 Sending initialize request...');
  server.stdin.write(JSON.stringify(initRequest) + '\n');
  
  setTimeout(() => {
    const listToolsRequest = {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
      params: {}
    };
    
    console.log('📤 Sending list tools request...');
    server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
    
    setTimeout(() => {
      console.log('\n✅ MCP Server test completed');
      console.log('📊 Server output:', output);
      if (errorOutput) {
        console.log('❌ Server errors:', errorOutput);
      }
      server.kill();
      process.exit(0);
    }, 2000);
  }, 1000);
}, 1000);

server.on('close', (code) => {
  console.log(`\n🔒 Server closed with code: ${code}`);
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
  process.exit(1);
});
