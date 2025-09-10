#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🌐 Testing Browser Automation with MCP Server...\n');

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

// Test sequence: Open browser -> Navigate -> Take screenshot -> Close
const testSequence = [
  {
    jsonrpc: '2.0',
    id: 1,
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
    id: 2,
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
    id: 3,
    method: 'tools/call',
    params: {
      name: 'take_screenshot',
      arguments: {
        filename: 'test-screenshot.png',
        fullPage: true
      }
    }
  },
  {
    jsonrpc: '2.0',
    id: 4,
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
    console.log('\n📊 Test Results Summary:');
    testResults.forEach((result, index) => {
      const test = testSequence[index];
      const status = result.success ? '✅' : '❌';
      console.log(`   ${status} Test ${index + 1}: ${test.params.name}`);
      if (!result.success) {
        console.log(`      Error: ${result.error}`);
      }
    });
    
    const successCount = testResults.filter(r => r.success).length;
    const totalTests = testResults.length;
    
    console.log(`\n🎯 Overall Result: ${successCount}/${totalTests} tests passed`);
    
    if (successCount === totalTests) {
      console.log('🎉 ALL BROWSER AUTOMATION TESTS PASSED!');
      console.log('✅ Cursor MCP Integration is working perfectly!');
    } else {
      console.log('⚠️  Some tests failed. Check the errors above.');
    }
    
    server.kill();
    return;
  }
  
  const test = testSequence[currentTest];
  console.log(`\n🧪 Running Test ${currentTest + 1}: ${test.params.name}`);
  
  server.stdin.write(JSON.stringify(test) + '\n');
  
  // Wait for response
  setTimeout(() => {
    try {
      const lines = output.trim().split('\n');
      const lastLine = lines[lines.length - 1];
      const response = JSON.parse(lastLine);
      
      if (response.result) {
        testResults.push({ success: true, result: response.result });
        console.log(`   ✅ Success: ${response.result.content?.[0]?.text || 'Completed'}`);
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
  }, 3000); // Wait 3 seconds for each test
}

server.on('close', (code) => {
  console.log(`\n📊 Server process exited with code ${code}`);
  
  if (errorOutput) {
    console.log('\n⚠️  Server stderr:', errorOutput);
  }
});

// Start the test sequence
console.log('⏳ Starting browser automation test sequence...');
runNextTest();

// Kill server after 30 seconds as safety
setTimeout(() => {
  console.log('\n⏰ Test timeout reached, stopping server...');
  server.kill();
}, 30000);
