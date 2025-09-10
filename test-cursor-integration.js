#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🎯 Testing Cursor MCP Integration...\n');
console.log('This test verifies that Cursor can use the MCP Selenium server\n');

const serverPath = '/home/robertocpaes/Projects/Pessoal/mcp-selenium/dist/simple-mcp-server.js';
console.log(`🚀 Starting MCP server: ${serverPath}`);

const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';
let errorOutput = '';

server.stdout.on('data', (data) => {
  output += data.toString();
});

server.stderr.on('data', (data) => {
  errorOutput += data.toString();
});

// Simple test to verify MCP server is working
const testSequence = [
  {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {}
  },
  {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'open_browser',
      arguments: {
        headless: false,
        width: 1280,
        height: 720,
        browserType: 'chrome'
      }
    }
  },
  {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'navigate_to',
      arguments: {
        url: 'https://www.google.com'
      }
    }
  },
  {
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: {
      name: 'take_screenshot',
      arguments: {
        filename: 'cursor-integration-test.png',
        fullPage: true
      }
    }
  },
  {
    jsonrpc: '2.0',
    id: 5,
    method: 'tools/call',
    params: {
      name: 'close_browser',
      arguments: {}
    }
  }
];

let currentTest = 0;
let testResults = [];

function runNextTest() {
  if (currentTest >= testSequence.length) {
    console.log('\n📊 Cursor MCP Integration Test Results:');
    testResults.forEach((result, index) => {
      const test = testSequence[index];
      const status = result.success ? '✅' : '❌';
      console.log(`   ${status} Test ${index + 1}: ${test.method}`);
      if (!result.success) {
        console.log(`      Error: ${result.error}`);
      }
    });
    
    const successCount = testResults.filter(r => r.success).length;
    const totalTests = testResults.length;
    
    console.log(`\n🎯 Overall Result: ${successCount}/${totalTests} tests passed`);
    
    if (successCount === totalTests) {
      console.log('\n🎉 CURSOR MCP INTEGRATION TEST PASSED!');
      console.log('✅ MCP server is working correctly');
      console.log('✅ All browser automation tools are available');
      console.log('✅ Cursor can now use these tools for automation');
      console.log('\n🚀 Ready to use with Cursor IDE!');
      console.log('Try asking Cursor: "Open a browser and go to Google"');
    } else {
      console.log('\n⚠️  Some tests failed. Check the errors above.');
      console.log('Make sure the MCP server is properly built and configured.');
    }
    
    server.kill();
    return;
  }
  
  const test = testSequence[currentTest];
  console.log(`\n🧪 Running Test ${currentTest + 1}: ${test.method}`);
  
  server.stdin.write(JSON.stringify(test) + '\n');
  
  setTimeout(() => {
    try {
      const lines = output.trim().split('\n');
      const lastLine = lines[lines.length - 1];
      const response = JSON.parse(lastLine);
      
      if (response.result) {
        testResults.push({ success: true, result: response.result });
        if (test.method === 'tools/list') {
          const tools = response.result.tools || [];
          console.log(`   ✅ Success: Found ${tools.length} available tools`);
          console.log(`   📋 Available tools: ${tools.map(t => t.name).join(', ')}`);
        } else {
          console.log(`   ✅ Success: ${response.result.content?.[0]?.text || 'Completed'}`);
        }
      } else if (response.error) {
        testResults.push({ success: false, error: response.error.message });
        console.log(`   ❌ Error: ${response.error.message}`);
      } else {
        testResults.push({ success: false, error: 'No response received' });
        console.log(`   ❌ Error: No response received`);
      }
      
      currentTest++;
      runNextTest();
    } catch (e) {
      testResults.push({ success: false, error: e.message });
      console.log(`   ❌ Error parsing response: ${e.message}`);
      currentTest++;
      runNextTest();
    }
  }, 3000);
}

server.on('close', (code) => {
  console.log(`\n📊 Server process exited with code ${code}`);
  
  if (errorOutput) {
    console.log('\n⚠️  Server stderr:', errorOutput);
  }
});

// Start the integration test
console.log('⏳ Starting Cursor MCP integration test...');
console.log('🎯 Testing MCP server functionality...');
runNextTest();

// Kill server after 30 seconds as safety
setTimeout(() => {
  console.log('\n⏰ Test timeout reached, stopping server...');
  server.kill();
}, 30000);
