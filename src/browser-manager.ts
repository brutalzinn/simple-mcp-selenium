import { v4 as uuidv4 } from 'uuid';
import { BrowserAutomationCore, BrowserOptions, ActionResult } from './core/browser-automation-core.js';

export interface BrowserInstance {
  id: string;
  core: BrowserAutomationCore;
  createdAt: Date;
  lastUsed: Date;
}

export class BrowserManager {
  private browsers: Map<string, BrowserInstance> = new Map();
  private defaultBrowserId: string | null = null;

  async openBrowser(options: BrowserOptions & { browserId?: string } = {}): Promise<ActionResult & { browserId?: string }> {
    try {
      const { browserId: providedId, ...browserOptions } = options;

      const browserId = providedId || uuidv4();
      if (this.browsers.has(browserId)) {
        return {
          success: false,
          message: `Browser with ID ${browserId} already exists. Please use a different ID or close the existing browser first.`,
        };
      }

      const core = new BrowserAutomationCore();
      const result = await core.openBrowser(browserOptions);

      if (result.success) {
        const browserInstance: BrowserInstance = {
          id: browserId,
          core,
          createdAt: new Date(),
          lastUsed: new Date(),
        };

        this.browsers.set(browserId, browserInstance);

        if (this.browsers.size === 1) {
          this.defaultBrowserId = browserId;
        }

        return {
          ...result,
          browserId,
          message: `${result.message} (Browser ID: ${browserId})`,
        };
      }

      return result;
    } catch (error) {
      return {
        success: false,
        message: `Failed to open browser: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async closeBrowser(browserId?: string): Promise<ActionResult> {
    try {
      const targetBrowserId = browserId || this.defaultBrowserId;

      if (!targetBrowserId) {
        return {
          success: true,
          message: 'No browser instance to close',
        };
      }

      const browserInstance = this.browsers.get(targetBrowserId);

      if (!browserInstance) {
        return {
          success: false,
          message: `Browser instance with ID ${targetBrowserId} not found`,
        };
      }

      const result = await browserInstance.core.closeBrowser();
      this.browsers.delete(targetBrowserId);

      if (this.defaultBrowserId === targetBrowserId) {
        this.defaultBrowserId = this.browsers.size > 0 ? Array.from(this.browsers.keys())[0] : null;
      }

      return {
        ...result,
        message: `${result.message} (Browser ID: ${targetBrowserId})`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to close browser: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async closeAllBrowsers(): Promise<ActionResult> {
    try {
      const results: string[] = [];
      const errors: string[] = [];

      for (const [browserId, browserInstance] of this.browsers) {
        try {
          const result = await browserInstance.core.closeBrowser();
          if (result.success) {
            results.push(`Browser ${browserId}: ${result.message}`);
          } else {
            errors.push(`Browser ${browserId}: ${result.message}`);
          }
        } catch (error) {
          errors.push(`Browser ${browserId}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      this.browsers.clear();
      this.defaultBrowserId = null;

      const summary = `Closed ${results.length} browsers successfully, ${errors.length} failed`;
      const allResults = [
        summary,
        '',
        'Results:',
        ...results,
        ...(errors.length > 0 ? ['', 'Errors:', ...errors] : []),
      ].join('\n');

      return {
        success: errors.length === 0,
        message: allResults,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to close all browsers: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  getBrowser(browserId?: string): BrowserAutomationCore | null {
    const targetBrowserId = browserId || this.defaultBrowserId;

    if (!targetBrowserId) {
      return null;
    }

    const browserInstance = this.browsers.get(targetBrowserId);

    if (browserInstance) {
      browserInstance.lastUsed = new Date();
      return browserInstance.core;
    }

    return null;
  }

  getBrowserInfo(browserId?: string): { id: string; createdAt: Date; lastUsed: Date } | null {
    const targetBrowserId = browserId || this.defaultBrowserId;

    if (!targetBrowserId) {
      return null;
    }

    const browserInstance = this.browsers.get(targetBrowserId);

    if (browserInstance) {
      return {
        id: browserInstance.id,
        createdAt: browserInstance.createdAt,
        lastUsed: browserInstance.lastUsed,
      };
    }

    return null;
  }

  listBrowsers(): Array<{ id: string; createdAt: Date; lastUsed: Date }> {
    return Array.from(this.browsers.values()).map(instance => ({
      id: instance.id,
      createdAt: instance.createdAt,
      lastUsed: instance.lastUsed,
    }));
  }

  getBrowserCount(): number {
    return this.browsers.size;
  }

  hasBrowser(browserId?: string): boolean {
    const targetBrowserId = browserId || this.defaultBrowserId;
    return targetBrowserId ? this.browsers.has(targetBrowserId) : false;
  }

  setDefaultBrowser(browserId: string): boolean {
    if (this.browsers.has(browserId)) {
      this.defaultBrowserId = browserId;
      return true;
    }
    return false;
  }

  getDefaultBrowserId(): string | null {
    return this.defaultBrowserId;
  }
}
