#!/usr/bin/env node

import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

const MCP_SERVER_CMD = 'node';
const MCP_SERVER_ARGS = ['dist/index.js'];

console.log('🔍 Debugging Browser Session Management...\n');

async function debugBrowserSessions() {
  return new Promise((resolve) => {
    const mcpProcess = spawn(MCP_SERVER_CMD, MCP_SERVER_ARGS, {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let errorOutput = '';

    mcpProcess.stdout.on('data', (data) => {
      const response = data.toString();
      output += response;
      console.log('📨 MCP Response:', response.trim());
    });

    mcpProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.log('❌ MCP Error:', data.toString().trim());
    });

    mcpProcess.on('close', (code) => {
      console.log(`\n🔚 MCP Process exited with code: ${code}`);
      resolve({ output, errorOutput, code });
    });

    setTimeout(1000).then(() => {
      console.log('\n🔧 Step 1: Opening normal_user browser...');
      mcpProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          tool: 'open_browser',
          arguments: {
            browserId: 'normal_user',
            headless: false,
            width: 1280,
            height: 720
          }
        }
      }) + '\n');

      setTimeout(3000).then(() => {
        console.log('\n🔧 Step 2: Opening agent browser...');
        mcpProcess.stdin.write(JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            tool: 'open_browser',
            arguments: {
              browserId: 'agent',
              headless: false,
              width: 1280,
              height: 720
            }
          }
        }) + '\n');

        setTimeout(3000).then(() => {
          console.log('\n📋 Step 3: Listing all browsers...');
          mcpProcess.stdin.write(JSON.stringify({
            jsonrpc: '2.0',
            id: 3,
            method: 'tools/call',
            params: {
              tool: 'list_browsers',
              arguments: {}
            }
          }) + '\n');

          setTimeout(2000).then(() => {
            console.log('\n🌐 Step 4: Navigating normal_user to Google...');
            mcpProcess.stdin.write(JSON.stringify({
              jsonrpc: '2.0',
              id: 4,
              method: 'tools/call',
              params: {
                tool: 'navigate_to',
                arguments: {
                  url: 'https://google.com',
                  browserId: 'normal_user'
                }
              }
            }) + '\n');

            setTimeout(2000).then(() => {
              console.log('\n🌐 Step 5: Navigating agent to GitHub...');
              mcpProcess.stdin.write(JSON.stringify({
                jsonrpc: '2.0',
                id: 5,
                method: 'tools/call',
                params: {
                  tool: 'navigate_to',
                  arguments: {
                    url: 'https://github.com',
                    browserId: 'agent'
                  }
                }
              }) + '\n');

              setTimeout(2000).then(() => {
                console.log('\n📄 Step 6: Getting normal_user page title...');
                mcpProcess.stdin.write(JSON.stringify({
                  jsonrpc: '2.0',
                  id: 6,
                  method: 'tools/call',
                  params: {
                    tool: 'get_page_title',
                    arguments: {
                      browserId: 'normal_user'
                    }
                  }
                }) + '\n');

                setTimeout(1000).then(() => {
                  console.log('\n📄 Step 7: Getting agent page title...');
                  mcpProcess.stdin.write(JSON.stringify({
                    jsonrpc: '2.0',
                    id: 7,
                    method: 'tools/call',
                    params: {
                      tool: 'get_page_title',
                      arguments: {
                        browserId: 'agent'
                      }
                    }
                  }) + '\n');

                  setTimeout(2000).then(() => {
                    console.log('\n📋 Step 8: Final browser list...');
                    mcpProcess.stdin.write(JSON.stringify({
                      jsonrpc: '2.0',
                      id: 8,
                      method: 'tools/call',
                      params: {
                        tool: 'list_browsers',
                        arguments: {}
                      }
                    }) + '\n');

                    setTimeout(2000).then(() => {
                      console.log('\n✅ Test completed, closing MCP process...');
                      mcpProcess.kill();
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
}

async function runDebug() {
  console.log('🚀 Starting Browser Session Debug...\n');
  await debugBrowserSessions();
  console.log('\n🎯 Debug completed!');
}

process.on('SIGINT', () => {
  console.log('\n\n🛑 Debug interrupted by user');
  process.exit(0);
});

runDebug().catch(console.error);
