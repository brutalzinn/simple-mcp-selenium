#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('⚡ Fast Laravel Chat Application Test...\n');
console.log('🚀 Optimized for speed with reduced timeouts and faster execution\n');

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

// Optimized test sequence with faster timeouts
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
        url: 'https://test.silva.mobi/login'
      }
    }
  },
  {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'type_text',
      arguments: {
        selector: 'input[type="email"]',
        text: 'admin@demo.com',
        by: 'css',
        timeout: 2000
      }
    }
  },
  {
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: {
      name: 'type_text',
      arguments: {
        selector: 'input[type="password"]',
        text: '123',
        by: 'css',
        timeout: 2000
      }
    }
  },
  {
    jsonrpc: '2.0',
    id: 5,
    method: 'tools/call',
    params: {
      name: 'click_element',
      arguments: {
        selector: 'button[type="submit"]',
        by: 'css',
        timeout: 2000
      }
    }
  },
  {
    jsonrpc: '2.0',
    id: 6,
    method: 'tools/call',
    params: {
      name: 'navigate_to',
      arguments: {
        url: 'https://test.silva.mobi/company/settings'
      }
    }
  },
  {
    jsonrpc: '2.0',
    id: 7,
    method: 'tools/call',
    params: {
      name: 'click_element',
      arguments: {
        selector: '/html/body/div[1]/main/div/div[1]/div[2]/div/div[1]/a',
        by: 'xpath',
        timeout: 3000
      }
    }
  },
  {
    jsonrpc: '2.0',
    id: 8,
    method: 'tools/call',
    params: {
      name: 'click_element',
      arguments: {
        selector: '/html/body/div[1]/main/div/div/form/div[2]/div/div[1]/button',
        by: 'xpath',
        timeout: 3000
      }
    }
  },
  {
    jsonrpc: '2.0',
    id: 9,
    method: 'tools/call',
    params: {
      name: 'drag_and_drop',
      arguments: {
        sourceSelector: '/html/body/div[1]/main/div/div/form/div[2]/div/div[1]/div/div[2]/div/div[3]/div/div[6]/span',
        targetSelector: '#drawflow',
        sourceBy: 'xpath',
        targetBy: 'css',
        timeout: 5000
      }
    }
  },
  {
    jsonrpc: '2.0',
    id: 10,
    method: 'tools/call',
    params: {
      name: 'take_screenshot',
      arguments: {
        filename: 'fast-test-result.png',
        fullPage: true
      }
    }
  },
  {
    jsonrpc: '2.0',
    id: 11,
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
    
    console.log('\n📊 Fast Laravel Chat Test Results:');
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
    
    console.log(`\n⚡ Total Execution Time: ${totalTime} seconds`);
    console.log(`🎯 Overall Result: ${successCount}/${totalTests} steps completed`);
    
    if (successCount === totalTests) {
      console.log('🎉 FAST LARAVEL CHAT TEST PASSED!');
      console.log('✅ All steps completed successfully!');
      console.log('⚡ Much faster execution achieved!');
    } else {
      console.log('⚠️  Some steps failed. Check the errors above.');
    }
    
    server.kill();
    return;
  }
  
  const test = testSequence[currentTest];
  console.log(`\n⚡ Running Step ${currentTest + 1}: ${test.params.name}`);
  
  server.stdin.write(JSON.stringify(test) + '\n');
  
  // Reduced wait time for faster execution
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
  }, 1000); // Only 1 second wait between actions
}

server.on('close', (code) => {
  console.log(`\n📊 Server process exited with code ${code}`);
  
  if (errorOutput) {
    console.log('\n⚠️  Server stderr:', errorOutput);
  }
});

// Start the fast test sequence
console.log('⏳ Starting fast Laravel chat application test...');
console.log('🎯 Target: https://test.silva.mobi');
console.log('🔐 Credentials: admin@demo.com / 123');
console.log('⚡ Optimized for speed!');
runNextTest();

// Kill server after 60 seconds as safety
setTimeout(() => {
  console.log('\n⏰ Test timeout reached, stopping server...');
  server.kill();
}, 60000);
