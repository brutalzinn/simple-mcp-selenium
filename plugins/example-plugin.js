
const helloWorldPlugin = {
  name: 'hello-world',
  version: '1.0.0',
  description: 'Simple Hello World example plugin for browser automation',
  
  tools: [
    {
      name: 'hello_world_demo',
      description: 'Go to Google Brazil and type "hello world selenium"',
      inputSchema: {
        type: 'object',
        properties: {
          takeScreenshot: {
            type: 'boolean',
            description: 'Take a screenshot after typing',
            default: true,
          },
        },
      },
    },
    {
      name: 'google_search',
      description: 'Perform a search on Google Brazil',
      inputSchema: {
        type: 'object',
        properties: {
          searchTerm: {
            type: 'string',
            description: 'The search term to type in Google',
            default: 'hello world selenium',
          },
          takeScreenshot: {
            type: 'boolean',
            description: 'Take a screenshot after searching',
            default: true,
          },
        },
        required: ['searchTerm'],
      },
    },
  ],

  handlers: {
    hello_world_demo: async (args, browserCore) => {
      const { takeScreenshot = true } = args;
      
      try {
        console.log('🌍 Starting Hello World demo...');
        
        await browserCore.navigateTo('https://www.google.com.br');
        console.log('✅ Navigated to Google Brazil');
        
        await browserCore.waitForElement('input[name="q"]', { timeout: 5000 });
        console.log('✅ Search box found');
        
        await browserCore.typeText('input[name="q"]', 'hello world selenium');
        console.log('✅ Typed "hello world selenium"');
        
        let screenshotResult = null;
        if (takeScreenshot) {
          screenshotResult = await browserCore.takeScreenshot({
            filename: `hello-world-demo-${Date.now()}.png`,
            fullPage: true,
          });
          console.log('📸 Screenshot taken');
        }
        
        return {
          content: [
            {
              type: 'text',
              text: `✅ Hello World demo completed successfully!\n🌍 Visited: https://www.google.com.br\n⌨️ Typed: "hello world selenium"\n📸 Screenshot: ${screenshotResult ? 'Taken' : 'Not taken'}`,
            },
          ],
        };
      } catch (error) {
        throw new Error(`Hello World demo failed: ${error.message}`);
      }
    },

    google_search: async (args, browserCore) => {
      const { searchTerm, takeScreenshot = true } = args;
      
      try {
        console.log(`🔍 Starting Google search for: "${searchTerm}"`);
        
        await browserCore.navigateTo('https://www.google.com.br');
        console.log('✅ Navigated to Google Brazil');
        
        await browserCore.waitForElement('input[name="q"]', { timeout: 5000 });
        console.log('✅ Search box found');
        
        await browserCore.typeText('input[name="q"]', searchTerm);
        console.log(`✅ Typed: "${searchTerm}"`);
        
        await browserCore.executeScript(`
          const searchBox = document.querySelector('input[name="q"]');
          if (searchBox) {
            searchBox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13 }));
          }
        `);
        console.log('✅ Pressed Enter to search');
        
        await browserCore.waitForElement('#search', { timeout: 10000 });
        console.log('✅ Search results loaded');
        
        let screenshotResult = null;
        if (takeScreenshot) {
          screenshotResult = await browserCore.takeScreenshot({
            filename: `google-search-${Date.now()}.png`,
            fullPage: true,
          });
          console.log('📸 Screenshot taken');
        }
        
        const pageTitle = await browserCore.getPageTitle();
        
        return {
          content: [
            {
              type: 'text',
              text: `✅ Google search completed successfully!\n🔍 Search term: "${searchTerm}"\n📄 Page title: "${pageTitle}"\n📸 Screenshot: ${screenshotResult ? 'Taken' : 'Not taken'}`,
            },
          ],
        };
      } catch (error) {
        throw new Error(`Google search failed: ${error.message}`);
      }
    },
  },

  initialize: async (browserCore) => {
    console.log('🌍 Hello World plugin initialized');
  },

  cleanup: async () => {
    console.log('🌍 Hello World plugin cleaned up');
  },
};

export default helloWorldPlugin;