import { BrowserSession } from '../../common/types.js';
import { Logger } from '../../utils/logger.js';

export async function getPageElementsTool(
  args: any,
  session: BrowserSession | null,
  logger: Logger
) {
  const { includeHidden = false, maxDepth = 3, interactiveOnly = false, maxElements = 50 } = args;

  if (!session) {
    return {
      success: false,
      message: `Session not found`,
    };
  }

  try {
    // Optimized script - minimize execution cost by using efficient DOM traversal
    const data = await session.driver.executeScript(`
      (function() {
      const includeHidden = arguments[0];
      const maxDepth = arguments[1];
      const interactiveOnly = arguments[2];
      const maxElements = arguments[3];
      
      function isVisible(el) {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && 
               style.visibility !== 'hidden' && 
               style.display !== 'none' &&
               style.opacity !== '0';
      }

      function getSelector(el) {
        if (el.id) return '#' + CSS.escape(el.id);
        const parts = [];
        let current = el;
        while (current && current.nodeType === 1 && current !== document.body) {
          let part = current.tagName.toLowerCase();
          if (current.id) {
            part = '#' + CSS.escape(current.id);
            parts.unshift(part);
            break;
          }
          if (current.className) {
            const cls = [...current.classList].slice(0, 2).map(c => '.' + CSS.escape(c)).join('');
            part += cls;
          }
          const siblings = Array.from(current.parentNode ? current.parentNode.children : [])
            .filter(e => e.tagName === current.tagName);
          if (siblings.length > 1) {
            const index = siblings.indexOf(current) + 1;
            part += ':nth-of-type(' + index + ')';
          }
          parts.unshift(part);
          current = current.parentElement;
        }
        return parts.join(' > ');
      }

      function getElementProperties(el) {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        const tag = el.tagName.toLowerCase();
        const attrs = {};
        Array.from(el.attributes).forEach(a => {
          attrs[a.name] = a.value;
        });
        
        // Determine action type and how to interact with this element
        let action = null;
        let actionHint = null;
        
        if (tag === 'input') {
          const inputType = el.getAttribute('type') || 'text';
          action = 'type';
          if (inputType === 'email') actionHint = 'Enter email address';
          else if (inputType === 'password') actionHint = 'Enter password';
          else if (inputType === 'text') actionHint = 'Enter text';
          else if (inputType === 'number') actionHint = 'Enter number';
          else if (inputType === 'checkbox') { action = 'click'; actionHint = 'Toggle checkbox'; }
          else if (inputType === 'radio') { action = 'click'; actionHint = 'Select radio option'; }
          else if (inputType === 'submit') { action = 'click'; actionHint = 'Submit form'; }
          else if (inputType === 'button') { action = 'click'; actionHint = 'Click button'; }
          else actionHint = 'Enter ' + inputType;
        } else if (tag === 'textarea') {
          action = 'type';
          actionHint = 'Enter text';
        } else if (tag === 'select') {
          action = 'select';
          actionHint = 'Select option from dropdown';
        } else if (tag === 'button' || (tag === 'a' && el.href) || el.getAttribute('role') === 'button') {
          action = 'click';
          actionHint = 'Click to ' + (el.textContent || el.innerText || 'interact').trim().substring(0, 30);
        } else if (tag === 'a' && el.href) {
          action = 'navigate';
          actionHint = 'Navigate to ' + el.href;
        } else if (tag === 'form') {
          action = 'submit';
          actionHint = 'Submit form';
        }
        
        // Get all relevant properties like browser inspector
        const props = {
          tag: tag,
          selector: getSelector(el),
          action: action,
          actionHint: actionHint,
          id: el.id || null,
          name: el.getAttribute('name') || null,
          classes: el.className ? (typeof el.className === 'string' ? el.className.split(' ').filter(c => c).slice(0, 5) : Array.from(el.classList).slice(0, 5)) : [],
          text: (el.textContent || '').trim().substring(0, 100),
          value: (el.value !== undefined) ? String(el.value) : null,
          href: (el.href || null),
          src: (el.src || null),
          alt: (el.getAttribute('alt') || null),
          title: (el.getAttribute('title') || null),
          placeholder: (el.getAttribute('placeholder') || null),
          type: (el.getAttribute('type') || null),
          role: (el.getAttribute('role') || null),
          'aria-label': (el.getAttribute('aria-label') || null),
          'aria-labelledby': (el.getAttribute('aria-labelledby') || null),
          'data-testid': (el.getAttribute('data-testid') || null),
          visible: isVisible(el),
          enabled: (el.disabled !== undefined) ? !el.disabled : true,
          selected: (el.selected !== undefined) ? !!el.selected : false,
          checked: (el.checked !== undefined) ? !!el.checked : false,
          readonly: (el.readOnly !== undefined) ? !!el.readOnly : false,
          required: (el.required !== undefined) ? !!el.required : false,
          location: { 
            x: Math.round(rect.x), 
            y: Math.round(rect.y), 
            width: Math.round(rect.width), 
            height: Math.round(rect.height)
          },
          computed: {
            display: style.display,
            visibility: style.visibility,
            cursor: style.cursor
          },
          responsive: {
            inViewport: rect.top >= 0 && rect.left >= 0 && 
                       rect.bottom <= window.innerHeight && 
                       rect.right <= window.innerWidth,
            widthPercent: Math.round((rect.width / window.innerWidth) * 100),
            heightPercent: Math.round((rect.height / window.innerHeight) * 100)
          }
        };
        
        // For select elements, include options (very limited)
        if (tag === 'select') {
          const options = Array.from(el.options || []).slice(0, 5).map(opt => ({
            value: opt.value,
            text: opt.text.substring(0, 20)
          }));
          if (options.length > 0) {
            props.options = options;
          }
        }
        
        // Remove null/empty values
        Object.keys(props).forEach(key => {
          if (props[key] === null || props[key] === '') {
            delete props[key];
          }
        });
        
        return props;
      }

      // Track total elements processed to limit output size
      let elementCount = 0;
      
      // Check if element is interactive
      function isInteractive(el) {
        const tag = el.tagName.toLowerCase();
        return tag === 'input' || tag === 'button' || tag === 'textarea' || tag === 'select' || 
               tag === 'a' || el.getAttribute('role') === 'button' || el.getAttribute('onclick') ||
               el.getAttribute('tabindex') !== null;
      }
      
      // Recursive function to build DOM tree - traverses from outermost to innermost
      // This ensures we process elements in hierarchical order: root -> children -> grandchildren -> etc.
      function buildDOMTree(root, depth = 0) {
        // Base case: stop if max depth reached, invalid node, or element limit reached
        if (depth > maxDepth) return null;
        if (elementCount >= maxElements) return null;
        if (!root || root.nodeType !== 1) return null; // Only element nodes
        
        // If interactiveOnly is true, skip non-interactive elements (but keep their children)
        if (interactiveOnly && depth > 0 && !isInteractive(root)) {
          // Still process children but don't include this element
          const children = Array.from(root.children || []);
          const filteredChildren = includeHidden ? children : children.filter(isVisible);
          const childrenTree = [];
          for (let i = 0; i < filteredChildren.length && elementCount < maxElements; i++) {
            const child = filteredChildren[i];
            const childTree = buildDOMTree(child, depth);
            if (childTree !== null) {
              childrenTree.push(childTree);
            }
          }
          return childrenTree.length > 0 ? { children: childrenTree } : null;
        }
        
        elementCount++;
        
        // Process current element first (outermost)
        const elementInfo = getElementProperties(root);
        
        // Then recursively process all children (inner elements)
        const children = Array.from(root.children || []);
        const filteredChildren = includeHidden ? children : children.filter(isVisible);
        
        // Recursive call: process each child and its descendants
        // This creates depth-first traversal: parent -> child -> grandchild -> etc.
        const childrenTree = [];
        for (let i = 0; i < filteredChildren.length && elementCount < maxElements; i++) {
          const child = filteredChildren[i];
          const childTree = buildDOMTree(child, depth + 1);
          if (childTree !== null) {
            childrenTree.push(childTree);
          }
        }
        
        // Attach children to current element
        if (childrenTree.length > 0) {
          elementInfo.children = childrenTree;
        }
        
        return elementInfo;
      }

      // Get viewport and responsive design information
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio || 1,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height
      };
      
      // Determine responsive breakpoint (common breakpoints)
      let breakpoint = 'desktop';
      if (viewport.width < 576) breakpoint = 'xs';
      else if (viewport.width < 768) breakpoint = 'sm';
      else if (viewport.width < 992) breakpoint = 'md';
      else if (viewport.width < 1200) breakpoint = 'lg';
      else if (viewport.width < 1400) breakpoint = 'xl';
      else breakpoint = 'xxl';

      // Build complete DOM tree starting from html element (recursive from root to leaves)
      const htmlElement = document.documentElement;
      const domTree = htmlElement ? buildDOMTree(htmlElement, 0) : null;
      
      // Get all elements count for stats
      const allElements = Array.from(document.querySelectorAll('*'));
      const visibleCount = allElements.filter(isVisible).length;
      
      return {
        url: window.location.href,
        title: document.title,
        tree: domTree
      };
      })();
    `, includeHidden, maxDepth, interactiveOnly, maxElements);

    const pageData = data as any;

    logger.info('Page elements extracted', {
      sessionId: session.sessionId,
      browserId: session.browserId,
      url: pageData.url,
      totalElements: pageData.stats?.total || 0
    });

    return {
      success: true,
      message: `DOM tree extracted`,
      data: pageData
    };
  } catch (error) {
    logger.error('Failed to get page elements', {
      sessionId: session?.sessionId,
      browserId: session?.browserId,
      error: error instanceof Error ? error.message : String(error)
    });
    return {
      success: false,
      message: `Failed to extract DOM: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

