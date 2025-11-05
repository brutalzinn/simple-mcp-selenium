import { BrowserSession, ScenarioStep } from '../../common/types.js';
import { Logger } from '../../utils/logger.js';
import { WebDriver, WebElement } from 'selenium-webdriver';

interface FindElementBySelectorFunction {
    (driver: WebDriver, selector: string, by: string, timeout: number): Promise<WebElement>;
}

export async function clickElementTool(
    args: any,
    getSession: (sessionId: string) => Promise<BrowserSession | null>,
    findElementBySelector: FindElementBySelectorFunction,
    activeRecordings: Map<string, { sessionId: string; steps: ScenarioStep[]; startTime: Date; } | null>,
    logger: Logger
) {
    const { sessionId, selector, by = 'css', timeout = 10000 } = args;
    const session = await getSession(sessionId);
    if (!session) return { success: false, message: `Session '${sessionId}' not found` };
    try {
        // Use vanilla JS to find and click element
        const result = await session.driver.executeScript(`
            const selector = arguments[0];
            const by = arguments[1];
            
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
            el.click();
            return { success: true, message: 'Element clicked' };
        `, selector, by);

        if (activeRecordings.has(session.sessionId)) {
            const recording = activeRecordings.get(session.sessionId);
            recording?.steps.push({ action: 'click', selector, by, timestamp: Date.now() });
        }

        logger.info('Element clicked', { sessionId, selector, by });
        return { success: true, message: 'Element clicked successfully' };
    } catch (error) {
        logger.error('Failed to click element', { sessionId, selector, by, error: error instanceof Error ? error.message : String(error) });
        return { success: false, message: `Failed to click element: ${error instanceof Error ? error.message : String(error)}` };
    }
}
