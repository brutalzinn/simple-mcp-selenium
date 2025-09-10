import { BrowserManager } from '../src/browser-manager';
import { mockWebDriver, mockElement, mockBuilder, mockBy, mockUntil } from './__mocks__/selenium-webdriver';

jest.mock('fs', () => ({
  promises: {
    access: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
    mkdir: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('BrowserManager', () => {
  let browserManager: BrowserManager;
  let mockDriver: any;

  beforeEach(() => {
    browserManager = new BrowserManager();
    mockDriver = { ...mockWebDriver };
    (mockBuilder.build as jest.Mock).mockResolvedValue(mockDriver);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('openBrowser', () => {
    it('should open browser successfully', async () => {
      const result = await browserManager.openBrowser({ headless: false });

      expect(result.content[0].text).toContain('Browser opened successfully');
      expect(mockBuilder.forBrowser).toHaveBeenCalledWith('chrome');
      expect(mockBuilder.build).toHaveBeenCalled();
    });

    it('should open browser in headless mode', async () => {
      const result = await browserManager.openBrowser({ headless: true });

      expect(result.content[0].text).toContain('headless mode');
    });

    it('should handle browser opening errors', async () => {
      (mockBuilder.build as jest.Mock).mockRejectedValue(new Error('Browser failed to start'));

      await expect(browserManager.openBrowser()).rejects.toThrow('Failed to open browser');
    });
  });

  describe('navigateTo', () => {
    beforeEach(() => {
      (browserManager as any).driver = mockDriver;
    });

    it('should navigate to URL successfully', async () => {
      const result = await browserManager.navigateTo('https://example.com');

      expect(result.content[0].text).toContain('Navigated to: https://example.com');
      expect(mockDriver.get).toHaveBeenCalledWith('https://example.com');
    });

    it('should throw error when browser not opened', async () => {
      (browserManager as any).driver = null;

      await expect(browserManager.navigateTo('https://example.com')).rejects.toThrow('Browser not opened');
    });

    it('should handle navigation errors', async () => {
      (mockDriver.get as jest.Mock).mockRejectedValue(new Error('Navigation failed'));

      await expect(browserManager.navigateTo('https://example.com')).rejects.toThrow('Navigation failed');
    });
  });

  describe('findElement', () => {
    beforeEach(() => {
      (browserManager as any).driver = mockDriver;
      (mockDriver.wait as jest.Mock).mockResolvedValue(mockElement);
    });

    it('should find element successfully', async () => {
      const result = await browserManager.findElement('#test-element');

      expect(result.content[0].text).toContain('Element found: #test-element');
      expect(mockDriver.wait).toHaveBeenCalled();
    });

    it('should handle element not found', async () => {
      (mockDriver.wait as jest.Mock).mockRejectedValue(new Error('Element not found'));

      await expect(browserManager.findElement('#nonexistent')).rejects.toThrow('Element not found');
    });
  });

  describe('clickElement', () => {
    beforeEach(() => {
      (browserManager as any).driver = mockDriver;
      (mockDriver.wait as jest.Mock).mockResolvedValue(mockElement);
    });

    it('should click element successfully', async () => {
      const result = await browserManager.clickElement('#button');

      expect(result.content[0].text).toContain('Clicked element: #button');
      expect(mockElement.click).toHaveBeenCalled();
    });

    it('should handle click errors', async () => {
      (mockElement.click as jest.Mock).mockRejectedValue(new Error('Click failed'));

      await expect(browserManager.clickElement('#button')).rejects.toThrow('Click failed');
    });
  });

  describe('typeText', () => {
    beforeEach(() => {
      (browserManager as any).driver = mockDriver;
      (mockDriver.wait as jest.Mock).mockResolvedValue(mockElement);
    });

    it('should type text successfully', async () => {
      const result = await browserManager.typeText('#input', 'test text');

      expect(result.content[0].text).toContain('Typed "test text" into element: #input');
      expect(mockElement.clear).toHaveBeenCalled();
      expect(mockElement.sendKeys).toHaveBeenCalledWith('test text');
    });

    it('should handle typing errors', async () => {
      (mockElement.sendKeys as jest.Mock).mockRejectedValue(new Error('Typing failed'));

      await expect(browserManager.typeText('#input', 'test')).rejects.toThrow('Typing failed');
    });
  });

  describe('getPageTitle', () => {
    beforeEach(() => {
      (browserManager as any).driver = mockDriver;
    });

    it('should get page title successfully', async () => {
      const result = await browserManager.getPageTitle();

      expect(result.content[0].text).toContain('Page title: Test Page');
      expect(mockDriver.getTitle).toHaveBeenCalled();
    });
  });

  describe('getPageUrl', () => {
    beforeEach(() => {
      (browserManager as any).driver = mockDriver;
    });

    it('should get page URL successfully', async () => {
      const result = await browserManager.getPageUrl();

      expect(result.content[0].text).toContain('Current URL: https://example.com');
      expect(mockDriver.getCurrentUrl).toHaveBeenCalled();
    });
  });

  describe('getConsoleLogs', () => {
    beforeEach(() => {
      (browserManager as any).driver = mockDriver;
      (mockDriver.executeScript as jest.Mock).mockResolvedValue([
        { level: 'log', message: 'Test log', timestamp: '2023-01-01T00:00:00.000Z' }
      ]);
    });

    it('should get console logs successfully', async () => {
      const result = await browserManager.getConsoleLogs();

      expect(result.content[0].text).toContain('Console logs');
      expect(mockDriver.executeScript).toHaveBeenCalled();
    });
  });

  describe('takeScreenshot', () => {
    beforeEach(() => {
      (browserManager as any).driver = mockDriver;
    });

    it('should take screenshot successfully', async () => {
      const result = await browserManager.takeScreenshot('test.png');

      expect(result.content[0].text).toContain('Screenshot saved to');
      expect(mockDriver.takeScreenshot).toHaveBeenCalled();
    });
  });

  describe('waitForElement', () => {
    beforeEach(() => {
      (browserManager as any).driver = mockDriver;
      (mockDriver.wait as jest.Mock).mockResolvedValue(mockElement);
    });

    it('should wait for element successfully', async () => {
      const result = await browserManager.waitForElement('#element');

      expect(result.content[0].text).toContain('Element appeared and is visible');
    });
  });

  describe('executeScript', () => {
    beforeEach(() => {
      (browserManager as any).driver = mockDriver;
    });

    it('should execute script successfully', async () => {
      const result = await browserManager.executeScript('return "test";');

      expect(result.content[0].text).toContain('Script executed successfully');
      expect(mockDriver.executeScript).toHaveBeenCalledWith('return "test";');
    });
  });

  describe('dragAndDrop', () => {
    beforeEach(() => {
      (browserManager as any).driver = mockDriver;
      (mockDriver.wait as jest.Mock).mockResolvedValue(mockElement);
      (mockDriver.actions as jest.Mock).mockReturnValue({
        dragAndDrop: jest.fn().mockReturnThis(),
        perform: jest.fn().mockResolvedValue(undefined),
      });
    });

    it('should perform drag and drop successfully', async () => {
      const result = await browserManager.dragAndDrop('#source', '#target');

      expect(result.content[0].text).toContain('Successfully dragged element');
    });
  });

  describe('hoverElement', () => {
    beforeEach(() => {
      (browserManager as any).driver = mockDriver;
      (mockDriver.wait as jest.Mock).mockResolvedValue(mockElement);
      (mockDriver.actions as jest.Mock).mockReturnValue({
        move: jest.fn().mockReturnThis(),
        perform: jest.fn().mockResolvedValue(undefined),
      });
    });

    it('should hover over element successfully', async () => {
      const result = await browserManager.hoverElement('#element');

      expect(result.content[0].text).toContain('Hovered over element');
    });
  });

  describe('doubleClickElement', () => {
    beforeEach(() => {
      (browserManager as any).driver = mockDriver;
      (mockDriver.wait as jest.Mock).mockResolvedValue(mockElement);
      (mockDriver.actions as jest.Mock).mockReturnValue({
        doubleClick: jest.fn().mockReturnThis(),
        perform: jest.fn().mockResolvedValue(undefined),
      });
    });

    it('should double-click element successfully', async () => {
      const result = await browserManager.doubleClickElement('#element');

      expect(result.content[0].text).toContain('Double-clicked element');
    });
  });

  describe('rightClickElement', () => {
    beforeEach(() => {
      (browserManager as any).driver = mockDriver;
      (mockDriver.wait as jest.Mock).mockResolvedValue(mockElement);
      (mockDriver.actions as jest.Mock).mockReturnValue({
        contextClick: jest.fn().mockReturnThis(),
        perform: jest.fn().mockResolvedValue(undefined),
      });
    });

    it('should right-click element successfully', async () => {
      const result = await browserManager.rightClickElement('#element');

      expect(result.content[0].text).toContain('Right-clicked element');
    });
  });

  describe('selectOption', () => {
    beforeEach(() => {
      (browserManager as any).driver = mockDriver;
      (mockDriver.wait as jest.Mock).mockResolvedValue(mockElement);
      (mockElement.findElement as jest.Mock).mockResolvedValue(mockElement);
    });

    it('should select option by value successfully', async () => {
      const result = await browserManager.selectOption('#select', 'option1');

      expect(result.content[0].text).toContain('Selected option');
    });

    it('should select option by text successfully', async () => {
      const result = await browserManager.selectOption('#select', undefined, 'Option Text');

      expect(result.content[0].text).toContain('Selected option');
    });
  });

  describe('checkCheckbox', () => {
    beforeEach(() => {
      (browserManager as any).driver = mockDriver;
      (mockDriver.wait as jest.Mock).mockResolvedValue(mockElement);
    });

    it('should check checkbox successfully', async () => {
      (mockElement.isSelected as jest.Mock).mockResolvedValue(false);

      const result = await browserManager.checkCheckbox('#checkbox', true);

      expect(result.content[0].text).toContain('Checkbox checked');
      expect(mockElement.click).toHaveBeenCalled();
    });

    it('should uncheck checkbox successfully', async () => {
      (mockElement.isSelected as jest.Mock).mockResolvedValue(true);

      const result = await browserManager.checkCheckbox('#checkbox', false);

      expect(result.content[0].text).toContain('Checkbox unchecked');
      expect(mockElement.click).toHaveBeenCalled();
    });
  });

  describe('selectRadioButton', () => {
    beforeEach(() => {
      (browserManager as any).driver = mockDriver;
      (mockDriver.wait as jest.Mock).mockResolvedValue(mockElement);
    });

    it('should select radio button successfully', async () => {
      const result = await browserManager.selectRadioButton('#radio');

      expect(result.content[0].text).toContain('Selected radio button');
      expect(mockElement.click).toHaveBeenCalled();
    });
  });

  describe('uploadFile', () => {
    beforeEach(() => {
      (browserManager as any).driver = mockDriver;
      (mockDriver.wait as jest.Mock).mockResolvedValue(mockElement);
    });

    it('should upload file successfully', async () => {
      const result = await browserManager.uploadFile('#file-input', '/path/to/file.txt');

      expect(result.content[0].text).toContain('File uploaded');
      expect(mockElement.sendKeys).toHaveBeenCalled();
    });
  });

  describe('switchToFrame', () => {
    beforeEach(() => {
      (browserManager as any).driver = mockDriver;
      (mockDriver.wait as jest.Mock).mockResolvedValue(mockElement);
    });

    it('should switch to frame successfully', async () => {
      const result = await browserManager.switchToFrame('#frame');

      expect(result.content[0].text).toContain('Switched to frame');
    });
  });

  describe('switchToDefaultContent', () => {
    beforeEach(() => {
      (browserManager as any).driver = mockDriver;
    });

    it('should switch to default content successfully', async () => {
      const result = await browserManager.switchToDefaultContent();

      expect(result.content[0].text).toContain('Switched back to default content');
    });
  });

  describe('getElementAttributes', () => {
    beforeEach(() => {
      (browserManager as any).driver = mockDriver;
      (mockDriver.wait as jest.Mock).mockResolvedValue(mockElement);
      (mockDriver.executeScript as jest.Mock).mockResolvedValue({ id: 'test', class: 'example' });
    });

    it('should get element attributes successfully', async () => {
      const result = await browserManager.getElementAttributes('#element');

      expect(result.content[0].text).toContain('Element attributes');
    });
  });

  describe('executeActionSequence', () => {
    beforeEach(() => {
      (browserManager as any).driver = mockDriver;
      (mockDriver.wait as jest.Mock).mockResolvedValue(mockElement);
      (mockDriver.actions as jest.Mock).mockReturnValue({
        click: jest.fn().mockReturnThis(),
        doubleClick: jest.fn().mockReturnThis(),
        contextClick: jest.fn().mockReturnThis(),
        move: jest.fn().mockReturnThis(),
        dragAndDrop: jest.fn().mockReturnThis(),
        perform: jest.fn().mockResolvedValue(undefined),
      });
    });

    it('should execute action sequence successfully', async () => {
      const actions = [
        { action: 'click', selector: '#button' },
        { action: 'type', selector: '#input', value: 'test' },
      ];

      const result = await browserManager.executeActionSequence(actions);

      expect(result.content[0].text).toContain('Action sequence completed');
      expect(result.content[0].text).toContain('2 successful, 0 failed');
    });

    it('should handle errors in action sequence', async () => {
      (mockElement.click as jest.Mock).mockRejectedValue(new Error('Click failed'));

      const actions = [
        { action: 'click', selector: '#button' },
        { action: 'type', selector: '#input', value: 'test' },
      ];

      const result = await browserManager.executeActionSequence(actions, false, true);

      expect(result.content[0].text).toContain('1 successful, 1 failed');
    });

    it('should continue on error when specified', async () => {
      (mockElement.click as jest.Mock).mockRejectedValue(new Error('Click failed'));

      const actions = [
        { action: 'click', selector: '#button' },
        { action: 'type', selector: '#input', value: 'test' },
      ];

      const result = await browserManager.executeActionSequence(actions, true, false);

      expect(result.content[0].text).toContain('1 successful, 1 failed');
    });
  });

  describe('closeBrowser', () => {
    it('should close browser successfully', async () => {
      (browserManager as any).driver = mockDriver;

      const result = await browserManager.closeBrowser();

      expect(result.content[0].text).toContain('Browser closed successfully');
      expect(mockDriver.quit).toHaveBeenCalled();
    });

    it('should handle case when no browser is open', async () => {
      (browserManager as any).driver = null;

      const result = await browserManager.closeBrowser();

      expect(result.content[0].text).toContain('No browser instance to close');
    });
  });
});
