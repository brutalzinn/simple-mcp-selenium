#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Verifying MCP Selenium Server Setup...\n');

let allChecksPassed = true;

// Check 1: MCP Configuration File
console.log('1️⃣  Checking MCP configuration...');
try {
  const mcpConfigPath = '/home/robertocpaes/.cursor/mcp.json';
  const config = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8'));
  
  if (config.mcpServers && config.mcpServers['selenium-browser-automation']) {
    console.log('   ✅ MCP configuration found');
    console.log(`   📍 Server path: ${config.mcpServers['selenium-browser-automation'].args[0]}`);
  } else {
    console.log('   ❌ MCP configuration not found');
    allChecksPassed = false;
  }
} catch (error) {
  console.log('   ❌ Error reading MCP configuration:', error.message);
  allChecksPassed = false;
}

// Check 2: Compiled Server File
console.log('\n2️⃣  Checking compiled server file...');
const serverPath = '/home/robertocpaes/Projects/Pessoal/mcp-selenium/dist/simple-mcp-server.js';
if (fs.existsSync(serverPath)) {
  const stats = fs.statSync(serverPath);
  console.log('   ✅ Server file exists');
  console.log(`   📊 File size: ${(stats.size / 1024).toFixed(2)} KB`);
  console.log(`   🔧 Executable: ${stats.mode & 0o111 ? 'Yes' : 'No'}`);
} else {
  console.log('   ❌ Server file not found');
  allChecksPassed = false;
}

// Check 3: Dependencies
console.log('\n3️⃣  Checking dependencies...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredDeps = ['@modelcontextprotocol/sdk', 'selenium-webdriver', 'chromedriver'];
  
  requiredDeps.forEach(dep => {
    if (packageJson.dependencies && packageJson.dependencies[dep]) {
      console.log(`   ✅ ${dep}: ${packageJson.dependencies[dep]}`);
    } else if (packageJson.devDependencies && packageJson.devDependencies[dep]) {
      console.log(`   ✅ ${dep}: ${packageJson.devDependencies[dep]} (dev)`);
    } else {
      console.log(`   ❌ ${dep}: Not found`);
      allChecksPassed = false;
    }
  });
} catch (error) {
  console.log('   ❌ Error reading package.json:', error.message);
  allChecksPassed = false;
}

// Check 4: MCP Server Functionality
console.log('\n4️⃣  Testing MCP server functionality...');
const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe']
});

const listToolsRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/list',
  params: {}
};

server.stdin.write(JSON.stringify(listToolsRequest) + '\n');

let output = '';
let hasResponse = false;

server.stdout.on('data', (data) => {
  output += data.toString();
  hasResponse = true;
});

server.on('close', (code) => {
  if (hasResponse && output) {
    try {
      const response = JSON.parse(output.trim());
      if (response.result && response.result.tools) {
        console.log(`   ✅ Server responding correctly`);
        console.log(`   🛠️  Available tools: ${response.result.tools.length}`);
        
        // Check for key tools
        const keyTools = ['open_browser', 'click_element', 'type_text', 'drag_and_drop'];
        const missingTools = keyTools.filter(tool => 
          !response.result.tools.some(t => t.name === tool)
        );
        
        if (missingTools.length === 0) {
          console.log('   ✅ All key tools available');
        } else {
          console.log(`   ❌ Missing tools: ${missingTools.join(', ')}`);
          allChecksPassed = false;
        }
        
        // Check XPath support
        const clickTool = response.result.tools.find(t => t.name === 'click_element');
        if (clickTool && clickTool.inputSchema.properties.by) {
          const hasXPath = clickTool.inputSchema.properties.by.enum.includes('xpath');
          console.log(`   🎯 XPath support: ${hasXPath ? 'Enabled' : 'Disabled'}`);
        }
        
      } else {
        console.log('   ❌ Invalid server response');
        allChecksPassed = false;
      }
    } catch (e) {
      console.log('   ❌ Failed to parse server response');
      allChecksPassed = false;
    }
  } else {
    console.log('   ❌ No response from server');
    allChecksPassed = false;
  }
  
  // Final result
  console.log('\n' + '='.repeat(50));
  if (allChecksPassed) {
    console.log('🎉 ALL CHECKS PASSED! MCP Selenium Server is ready!');
    console.log('\n📝 Next steps:');
    console.log('   1. Restart Cursor IDE');
    console.log('   2. Use MCP tools in your conversations');
    console.log('   3. Test with: "Use MCP Selenium to open a browser"');
  } else {
    console.log('❌ Some checks failed. Please review the errors above.');
  }
  console.log('='.repeat(50));
});

// Kill server after 3 seconds
setTimeout(() => {
  server.kill();
}, 3000);
