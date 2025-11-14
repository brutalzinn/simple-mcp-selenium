import { BrowserSession } from '../../common/types.js';
import { Logger } from '../../utils/logger.js';
import { WebDriver, WebElement } from 'selenium-webdriver';

interface FindElementBySelectorFunction {
    (driver: WebDriver, selector: string, by: string, timeout: number): Promise<WebElement>;
}

export async function typeTextTool(
    args: any,
    getSession: (sessionId: string) => Promise<BrowserSession | null>,
    findElementBySelector: FindElementBySelectorFunction,
    logger: Logger
) {
    const { sessionId, selector, text, by = 'css', timeout = 10000 } = args;
    const session = await getSession(sessionId);
    if (!session) return { success: false, message: `Session '${sessionId}' not found` };
    try {
        // Use vanilla JS to find and type into element
        const result = await session.driver.executeScript(`
            const selector = arguments[0];
            const by = arguments[1];
            const text = arguments[2];
            
            function findElement(sel, byMethod) {
                if (byMethod === 'id') {
                    return document.getElementById(sel);
                } else if (byMethod === 'name') {
                    return document.querySelector('[name="' + sel + '"]');
                } else if (byMethod === 'className') {
                    return document.getElementsByClassName(sel)[0];
                } else if (byMethod === 'tagName') {
                    return document.getElementsByTagName(sel)[0];
                } else if (byMethod === 'xpath') {
                    const result = document.evaluate(sel, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                    return result.singleNodeValue;
                } else {
                    return document.querySelector(sel);
                }
            }
            
            const el = findElement(selector, by);
            if (!el) {
                return { success: false, message: 'Element not found' };
            }
            
            el.scrollIntoView({ block: 'center', behavior: 'instant' });
            el.focus();
            el.value = '';
            
            // Trigger input events for React/Vue/etc
            const inputEvent = new Event('input', { bubbles: true });
            const changeEvent = new Event('change', { bubbles: true });
            
            el.value = text;
            el.dispatchEvent(inputEvent);
            el.dispatchEvent(changeEvent);
            
            return { success: true, message: 'Text typed' };
        `, selector, by, text);

        return { success: true, message: 'Text typed' };
    } catch (error) {
        return { success: false, message: `Error: ${error instanceof Error ? error.message : String(error)}` };
    }
}
