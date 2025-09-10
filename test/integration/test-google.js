#!/usr/bin/env node

import { BrowserAutomationCore } from './src/core/browser-automation-core.js';

async function testGoogleSearch() {
  const browser = new BrowserAutomationCore();
  
  try {
    console.log('🚀 Opening browser...');
    const openResult = await browser.openBrowser({
      headless: false,
      browserType: 'chrome',
      width: 1280,
      height: 720
    });
    
    if (!openResult.success) {
      console.error('❌ Failed to open browser:', openResult.message);
      return;
    }
    
    console.log('✅', openResult.message);
    
    console.log('🌐 Navigating to Google Brazil...');
    const navResult = await browser.navigateTo('https://www.google.com.br');
    
    if (!navResult.success) {
      console.error('❌ Failed to navigate:', navResult.message);
      return;
    }
    
    console.log('✅', navResult.message);
    
    console.log('⏳ Waiting for page to load...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('🔍 Looking for search input...');
    const searchInput = 'input[name="q"], input[title="Pesquisar"], #search, .gLFyf';
    
    console.log('⌨️ Typing "hello world"...');
    const typeResult = await browser.typeText({
      selector: searchInput,
      text: 'hello world',
      timeout: 10000
    });
    
    if (!typeResult.success) {
      console.error('❌ Failed to type text:', typeResult.message);
      return;
    }
    
    console.log('✅', typeResult.message);
    
    console.log('⏳ Waiting before pressing Enter...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('🔍 Looking for search button or pressing Enter...');
    const searchButton = 'input[type="submit"], button[type="submit"], .gNO89b, .Tg7LZd';
    
    const clickResult = await browser.clickElement({
      selector: searchButton,
      timeout: 5000
    });
    
    if (clickResult.success) {
      console.log('✅ Clicked search button:', clickResult.message);
    } else {
      console.log('⚠️ Search button not found, trying Enter key...');
      
      const enterResult = await browser.executeScript(`
        const input = document.querySelector('${searchInput}');
        if (input) {
          input.focus();
          const event = new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13 });
          input.dispatchEvent(event);
          return 'Enter key pressed';
        }
        return 'Input not found';
      `);
      
      console.log('✅', enterResult.message);
    }
    
    console.log('⏳ Waiting for search results...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('📸 Taking screenshot...');
    const screenshotResult = await browser.takeScreenshot('google-search-results.png');
    
    if (screenshotResult.success) {
      console.log('✅', screenshotResult.message);
    }
    
    console.log('📄 Getting page title...');
    const titleResult = await browser.getPageTitle();
    
    if (titleResult.success) {
      console.log('📄 Page title:', titleResult.data.title);
    }
    
    console.log('🌐 Getting current URL...');
    const urlResult = await browser.getPageUrl();
    
    if (urlResult.success) {
      console.log('🌐 Current URL:', urlResult.data.url);
    }
    
    console.log('⏳ Waiting 5 seconds before closing...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
  } catch (error) {
    console.error('❌ Error during test:', error.message);
  } finally {
    console.log('🔒 Closing browser...');
    const closeResult = await browser.closeBrowser();
    console.log('✅', closeResult.message);
  }
}

testGoogleSearch().catch(console.error);
