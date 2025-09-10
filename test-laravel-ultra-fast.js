#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('⚡⚡ ULTRA FAST Laravel Chat Application Test...\n');
console.log('🚀 Using action sequences for maximum speed\n');

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

// Ultra-fast test using action sequences
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
      name: 'execute_action_sequence',
      arguments: {
        actions: [
          {
            action: 'navigate_to',
            value: 'https://test.silva.mobi/login'
          },
          {
            action: 'type',
            selector: 'input[type="email"]',
            text: 'admin@demo.com'
          },
          {
            action: 'type',
            selector: 'input[type="password"]',
            text: '123'
          },
          {
            action: 'click',
            selector: 'button[type="submit"]'
          },
          {
            action: 'navigate_to',
            value: 'https://test.silva.mobi/company/settings'
          },
          {
            action: 'click',
            selector: '/html/body/div[1]/main/div/div[1]/div[2]/div/div[1]/a',
            by: 'xpath'
          },
          {
            action: 'click',
            selector: '/html/body/div[1]/main/div/div/form/div[2]/div/div[1]/button',
            by: 'xpath'
          }
        ],
        continueOnError: false,
        stopOnError: true
      }
    }
  },
  {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'drag_and_drop',
      arguments: {
        sourceSelector: '/html/body/div[1]/main/div/div/form/div[2]/div/div[1]/div/div[2]/div/div[3]/div/div[6]/span',
        targetSelector: '#drawflow',
        sourceBy: 'xpath',
        targetBy: 'css',
        timeout: 3000
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
        filename: 'ultra-fast-test-result.png',
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
let startTime = Date.now();

function runNextTest() {
  if (currentTest >= testSequence.length) {
    const endTime = Date.now();
    const totalTime = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('\n📊 Ultra Fast Laravel Chat Test Results:');
    testResults.forEach((result, index) => {
      const test = testSequence[index];
      const status = result.success ? '✅' : '❌';
      console.log(`   ${status} Step ${index + 1}: ${test.params.name}`);
      if (!result.success) {
        console.log(`      Error: ${result.error}`);
      }
    });
    
    const successCount = testResults.filter(r => r.success).length;
    const totalTests = testResults.length;
    
    console.log(`\n⚡⚡ Total Execution Time: ${totalTime} seconds`);
    console.log(`🎯 Overall Result: ${successCount}/${totalTests} steps completed`);
    
    if (successCount === totalTests) {
      console.log('🎉 ULTRA FAST LARAVEL CHAT TEST PASSED!');
      console.log('✅ All steps completed successfully!');
      console.log('⚡⚡ Maximum speed achieved with action sequences!');
    } else {
      console.log('⚠️  Some steps failed. Check the errors above.');
    }
    
    server.kill();
    return;
  }
  
  const test = testSequence[currentTest];
  console.log(`\n⚡⚡ Running Step ${currentTest + 1}: ${test.params.name}`);
  
  server.stdin.write(JSON.stringify(test) + '\n');
  
  // Ultra-fast execution with minimal wait
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
  }, 500); // Only 0.5 seconds wait between actions
}

server.on('close', (code) => {
  console.log(`\n📊 Server process exited with code ${code}`);
  
  if (errorOutput) {
    console.log('\n⚠️  Server stderr:', errorOutput);
  }
});

// Start the ultra-fast test sequence
console.log('⏳ Starting ultra-fast Laravel chat application test...');
console.log('🎯 Target: https://test.silva.mobi');
console.log('🔐 Credentials: admin@demo.com / 123');
console.log('⚡⚡ Using action sequences for maximum speed!');
runNextTest();

// Kill server after 30 seconds as safety
setTimeout(() => {
  console.log('\n⏰ Test timeout reached, stopping server...');
  server.kill();
}, 30000);
