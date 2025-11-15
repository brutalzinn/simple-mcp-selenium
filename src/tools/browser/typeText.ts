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
    const { sessionId, selector, text, by = 'css' } = args;
    const session = await getSession(sessionId);
    if (!session) return { success: false, message: 'Session not found' };
    try {
        await session.driver.executeScript(`
            const s=arguments[0],b=arguments[1],t=arguments[2];
            const f=(s,b)=>b==='id'?document.getElementById(s):b==='name'?document.querySelector('[name="'+s+'"]'):b==='className'?document.getElementsByClassName(s)[0]:b==='tagName'?document.getElementsByTagName(s)[0]:b==='xpath'?document.evaluate(s,document,null,XPathResult.FIRST_ORDERED_NODE_TYPE,null).singleNodeValue:document.querySelector(s);
            const e=f(s,b);
            if(!e)return{success:false};
            e.scrollIntoView({block:'center',behavior:'instant'});e.focus();e.value='';
            e.value=t;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));
            return{success:true};
        `, selector, by, text);
        return { success: true };
    } catch (error) {
        return { success: false, message: error instanceof Error ? error.message : String(error) };
    }
}
