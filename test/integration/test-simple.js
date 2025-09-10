#!/usr/bin/env node

const { spawn } = require('child_process');
const readline = require('readline');

async function testWithMCP() {
  console.log('🚀 Starting MCP Selenium Server...');
  
  const server = spawn('node', ['src/index.js'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  let serverReady = false;
  
  server.stdout.on('data', (data) => {
    const message = data.toString();
    console.log('📤 Server output:', message);
  });
  
  server.stderr.on('data', (data) => {
    const message = data.toString();
    console.log('📥 Server log:', message);
    
    if (message.includes('Selenium MCP Server running')) {
      serverReady = true;
      console.log('✅ Server is ready!');
      testBrowserAutomation();
    }
  });
  
  server.on('close', (code) => {
    console.log(`🔒 Server closed with code ${code}`);
  });
  
  function testBrowserAutomation() {
    console.log('\n🧪 Testing browser automation...');
    
    const testSequence = [
      {
        method: 'tools/list',
        params: {}
      },
      {
        method: 'tools/call',
        params: {
          name: 'open_browser',
          arguments: {
            headless: false,
            browserType: 'chrome',
            width: 1280,
            height: 720
          }
        }
      },
      {
        method: 'tools/call',
        params: {
          name: 'navigate_to',
          arguments: {
            url: 'https://www.google.com.br'
          }
        }
      },
      {
        method: 'tools/call',
        params: {
          name: 'type_text',
          arguments: {
            selector: 'input[name="q"]',
            text: 'hello world'
          }
        }
      },
      {
        method: 'tools/call',
        params: {
          name: 'click_element',
          arguments: {
            selector: 'input[type="submit"]'
          }
        }
      },
      {
        method: 'tools/call',
        params: {
          name: 'take_screenshot',
          arguments: {
            filename: 'google-search-test.png'
          }
        }
      },
      {
        method: 'tools/call',
        params: {
          name: 'close_browser',
          arguments: {}
        }
      }
    ];
    
    let currentStep = 0;
    
    function sendNextCommand() {
      if (currentStep >= testSequence.length) {
        console.log('✅ Test sequence completed!');
        server.kill();
        return;
      }
      
      const command = testSequence[currentStep];
      console.log(`\n📋 Step ${currentStep + 1}: ${command.method}`);
      
      const message = {
        jsonrpc: '2.0',
        id: currentStep + 1,
        method: command.method,
        params: command.params
      };
      
      server.stdin.write(JSON.stringify(message) + '\n');
      currentStep++;
      
      setTimeout(sendNextCommand, 3000);
    }
    
    setTimeout(sendNextCommand, 2000);
  }
  
  process.on('SIGINT', () => {
    console.log('\n🔒 Shutting down...');
    server.kill();
    process.exit(0);
  });
}

testWithMCP().catch(console.error);
