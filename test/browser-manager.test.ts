import { BrowserManager } from '../src/browser-manager';

describe('BrowserManager', () => {
  let browserManager: BrowserManager;

  beforeEach(() => {
    browserManager = new BrowserManager();
  });

  afterEach(async () => {
    const browsers = browserManager.listBrowsers();
    for (const browser of browsers) {
      await browserManager.closeBrowser(browser.id);
    }
  });

  test('should create a new browser manager instance', () => {
    expect(browserManager).toBeDefined();
    expect(browserManager.listBrowsers()).toHaveLength(0);
  });

  test('should generate unique browser IDs', async () => {
    const result1 = await browserManager.openBrowser();
    const result2 = await browserManager.openBrowser();

    expect(result1.browserId).toBeDefined();
    expect(result2.browserId).toBeDefined();
    expect(result1.browserId).not.toBe(result2.browserId);
  });

  test('should use provided browser ID', async () => {
    const customId = 'test-browser-123';
    const result = await browserManager.openBrowser({ browserId: customId });

    expect(result.browserId).toBe(customId);
  });

  test('should list browsers correctly', async () => {
    expect(browserManager.listBrowsers()).toHaveLength(0);

    await browserManager.openBrowser({ browserId: 'browser1' });
    expect(browserManager.listBrowsers()).toHaveLength(1);

    await browserManager.openBrowser({ browserId: 'browser2' });
    expect(browserManager.listBrowsers()).toHaveLength(2);
  });

  test('should get browser info', async () => {
    const browserId = 'test-browser';
    await browserManager.openBrowser({ browserId });

    const info = browserManager.getBrowserInfo(browserId);
    expect(info).toBeDefined();
    expect(info?.id).toBe(browserId);
  });

  test('should return null for non-existent browser', () => {
    const info = browserManager.getBrowserInfo('non-existent');
    expect(info).toBeNull();
  });
});
