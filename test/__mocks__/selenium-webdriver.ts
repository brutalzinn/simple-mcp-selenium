export const mockWebDriver = {
  quit: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue(undefined),
  getTitle: jest.fn().mockResolvedValue('Test Page'),
  getCurrentUrl: jest.fn().mockResolvedValue('https://example.com'),
  findElement: jest.fn(),
  findElements: jest.fn(),
  wait: jest.fn(),
  executeScript: jest.fn().mockResolvedValue('script result'),
  executeAsyncScript: jest.fn().mockResolvedValue(true),
  takeScreenshot: jest.fn().mockResolvedValue('base64screenshot'),
  navigate: jest.fn(() => ({
    back: jest.fn().mockResolvedValue(undefined),
    forward: jest.fn().mockResolvedValue(undefined),
    refresh: jest.fn().mockResolvedValue(undefined),
  })),
  switchTo: jest.fn(() => ({
    frame: jest.fn().mockResolvedValue(undefined),
    defaultContent: jest.fn().mockResolvedValue(undefined),
  })),
  actions: jest.fn(() => ({
    move: jest.fn().mockReturnThis(),
    click: jest.fn().mockReturnThis(),
    doubleClick: jest.fn().mockReturnThis(),
    contextClick: jest.fn().mockReturnThis(),
    dragAndDrop: jest.fn().mockReturnThis(),
    perform: jest.fn().mockResolvedValue(undefined),
  })),
};

export const mockElement = {
  click: jest.fn().mockResolvedValue(undefined),
  clear: jest.fn().mockResolvedValue(undefined),
  sendKeys: jest.fn().mockResolvedValue(undefined),
  getText: jest.fn().mockResolvedValue('element text'),
  getAttribute: jest.fn().mockResolvedValue('attribute value'),
  getTagName: jest.fn().mockResolvedValue('div'),
  isDisplayed: jest.fn().mockResolvedValue(true),
  isEnabled: jest.fn().mockResolvedValue(true),
  isSelected: jest.fn().mockResolvedValue(false),
  findElement: jest.fn(),
  findElements: jest.fn(),
};

export const mockBuilder = {
  forBrowser: jest.fn().mockReturnThis(),
  setChromeOptions: jest.fn().mockReturnThis(),
  setLoggingPrefs: jest.fn().mockReturnThis(),
  build: jest.fn().mockResolvedValue(mockWebDriver),
};

export const mockBy = {
  css: jest.fn((selector) => ({ selector, type: 'css' })),
  xpath: jest.fn((selector) => ({ selector, type: 'xpath' })),
  id: jest.fn((selector) => ({ selector, type: 'id' })),
  name: jest.fn((selector) => ({ selector, type: 'name' })),
  className: jest.fn((selector) => ({ selector, type: 'className' })),
  tagName: jest.fn((selector) => ({ selector, type: 'tagName' })),
};

export const mockUntil = {
  elementLocated: jest.fn().mockReturnValue('elementLocated condition'),
  elementIsVisible: jest.fn().mockReturnValue('elementIsVisible condition'),
  elementTextContains: jest.fn().mockReturnValue('elementTextContains condition'),
  urlContains: jest.fn().mockReturnValue('urlContains condition'),
};

export const mockChrome = {
  Options: jest.fn(() => ({
    addArguments: jest.fn().mockReturnThis(),
  })),
};

export const mockKey = {
  ENTER: 'Enter',
  TAB: 'Tab',
  ESCAPE: 'Escape',
  SPACE: ' ',
};

export const mockButton = {
  LEFT: 'left',
  RIGHT: 'right',
  MIDDLE: 'middle',
};

export const mockActions = {
  move: jest.fn().mockReturnThis(),
  click: jest.fn().mockReturnThis(),
  doubleClick: jest.fn().mockReturnThis(),
  contextClick: jest.fn().mockReturnThis(),
  dragAndDrop: jest.fn().mockReturnThis(),
  perform: jest.fn().mockResolvedValue(undefined),
};

jest.mock('selenium-webdriver', () => ({
  Builder: jest.fn(() => mockBuilder),
  By: mockBy,
  until: mockUntil,
  Key: mockKey,
  Button: mockButton,
  Actions: jest.fn(() => mockActions),
}));

jest.mock('selenium-webdriver/chrome.js', () => ({
  __esModule: true,
  default: mockChrome,
}));
