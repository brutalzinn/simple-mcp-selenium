import { BrowserSession } from '../../common/types.js';
import { Logger } from '../../utils/logger.js';

export async function getInteractiveElementsTool(
  args: any,
  getSession: (sessionId: string) => Promise<BrowserSession | null>,
  logger: Logger
) {
  try {
    const { sessionId, elementLimit = 50 } = args;
    const session = await getSession(sessionId);

    if (!session) {
      return {
        success: false,
        message: `Session '${sessionId}' not found`,
      };
    }

    // Use JavaScript to find all interactive elements efficiently
    const data = await session.driver.executeScript(`
      const limit = arguments[0];
      
      function isVisible(el) {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && 
               style.visibility !== 'hidden' && 
               style.display !== 'none' &&
               style.opacity !== '0';
      }

      function getUniqueSelector(el) {
        if (el.id) return '#' + CSS.escape(el.id);
        const parts = [];
        let current = el;
        while (current && current.nodeType === 1 && current !== document.body) {
          let part = current.nodeName.toLowerCase();
          if (current.className) {
            const cls = [...current.classList].slice(0, 2).map(c => '.' + CSS.escape(c)).join('');
            part += cls;
          }
          const siblings = Array.from(current.parentNode ? current.parentNode.children : [])
            .filter(e => e.nodeName === current.nodeName);
          if (siblings.length > 1) {
            const index = siblings.indexOf(current) + 1;
            part += ':nth-of-type(' + index + ')';
          }
          parts.unshift(part);
          current = current.parentElement;
        }
        return parts.join(' > ');
      }

      // Find all interactive elements
      const selectors = [
        'button',
        '[role="button"]',
        'input',
        'textarea',
        'select',
        'a[href]',
        '[onclick]',
        '[tabindex]'
      ];
      
      const allNodes = new Set();
      selectors.forEach(sel => {
        try {
          document.querySelectorAll(sel).forEach(el => allNodes.add(el));
        } catch (e) {
          // Skip invalid selectors
        }
      });

      const nodes = Array.from(allNodes).filter(isVisible);
      const results = [];
      
      for (let i = 0; i < Math.min(nodes.length, limit); i++) {
        const el = nodes[i];
        const rect = el.getBoundingClientRect();
        const attrs = {};
        Array.from(el.attributes).forEach(a => {
          attrs[a.name] = a.value;
        });
        
        results.push({
          index: i + 1,
          selector: getUniqueSelector(el),
          tagName: el.tagName.toLowerCase(),
          text: (el.textContent || el.innerText || '').trim().slice(0, 200),
          attributes: {
            id: el.id || '',
            class: el.className || '',
            name: el.getAttribute('name') || '',
            type: el.getAttribute('type') || '',
            placeholder: el.getAttribute('placeholder') || '',
            value: (el.value !== undefined) ? el.value : '',
            href: (el.href !== undefined) ? el.href : '',
            'aria-label': el.getAttribute('aria-label') || '',
            'data-testid': el.getAttribute('data-testid') || '',
            role: el.getAttribute('role') || ''
          },
          isVisible: isVisible(el),
          isEnabled: (el.disabled !== undefined) ? !el.disabled : true,
          isSelected: (el.selected !== undefined) ? !!el.selected : false,
          location: { 
            x: Math.round(rect.x), 
            y: Math.round(rect.y), 
            width: Math.round(rect.width), 
            height: Math.round(rect.height) 
          },
          parent: el.parentElement ? getUniqueSelector(el.parentElement) : '',
          visibleText: (el.innerText !== undefined ? el.innerText : (el.textContent || '')).trim().slice(0, 100)
        });
      }
      
      return { 
        count: results.length, 
        total: nodes.length,
        elements: results 
      };
    `, elementLimit);

    const result = data as { count: number; total: number; elements: any[] };
    return {
      success: true,
      message: `Found ${result.count} elements`,
      data: result
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

