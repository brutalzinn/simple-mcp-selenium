import { BrowserSession } from '../../common/types.js';
import { Logger } from '../../utils/logger.js';

export async function getPageElementsTool(
  args: any,
  getSession: (sessionId: string) => Promise<BrowserSession | null>,
  logger: Logger
) {
  const { sessionId, browserId, includeHidden = false, maxDepth = 10 } = args;
  const session = await getSession(sessionId || browserId);

  if (!session) {
    return {
      success: false,
      message: `Session not found`,
    };
  }

  try {
    const data = await session.driver.executeScript(`
      const includeHidden = arguments[0];
      const maxDepth = arguments[1];
      
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
          classes: el.className ? (typeof el.className === 'string' ? el.className.split(' ').filter(c => c) : Array.from(el.classList)) : [],
          attributes: attrs,
          text: (el.textContent || '').trim(),
          innerText: (el.innerText || '').trim(),
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
            height: Math.round(rect.height),
            top: Math.round(rect.top),
            left: Math.round(rect.left),
            bottom: Math.round(rect.bottom),
            right: Math.round(rect.right)
          },
          computed: {
            display: style.display,
            visibility: style.visibility,
            position: style.position,
            zIndex: style.zIndex,
            backgroundColor: style.backgroundColor,
            color: style.color,
            fontSize: style.fontSize,
            fontFamily: style.fontFamily,
            fontWeight: style.fontWeight,
            border: style.border,
            margin: style.margin,
            padding: style.padding,
            opacity: style.opacity,
            overflow: style.overflow,
            cursor: style.cursor,
            flexDirection: style.flexDirection,
            flexWrap: style.flexWrap,
            justifyContent: style.justifyContent,
            alignItems: style.alignItems,
            gridTemplateColumns: style.gridTemplateColumns,
            gridTemplateRows: style.gridTemplateRows,
            gap: style.gap
          },
          responsive: {
            inViewport: rect.top >= 0 && rect.left >= 0 && 
                       rect.bottom <= window.innerHeight && 
                       rect.right <= window.innerWidth,
            partiallyVisible: (rect.top < window.innerHeight && rect.bottom > 0) &&
                             (rect.left < window.innerWidth && rect.right > 0),
            widthPercent: Math.round((rect.width / window.innerWidth) * 100),
            heightPercent: Math.round((rect.height / window.innerHeight) * 100)
          }
        };
        
        // For select elements, include options
        if (tag === 'select') {
          const options = Array.from(el.options || []).map(opt => ({
            value: opt.value,
            text: opt.text,
            selected: opt.selected
          }));
          if (options.length > 0) {
            props.options = options;
          }
        }
        
        // Remove null values to keep it clean
        Object.keys(props).forEach(key => {
          if (props[key] === null || (Array.isArray(props[key]) && props[key].length === 0)) {
            delete props[key];
          }
        });
        
        return props;
      }

      // Recursive function to build DOM tree - traverses from outermost to innermost
      // This ensures we process elements in hierarchical order: root -> children -> grandchildren -> etc.
      function buildDOMTree(root, depth = 0) {
        // Base case: stop if max depth reached or invalid node
        if (depth > maxDepth) return null;
        if (!root || root.nodeType !== 1) return null; // Only element nodes
        
        // Process current element first (outermost)
        const elementInfo = getElementProperties(root);
        
        // Then recursively process all children (inner elements)
        const children = Array.from(root.children || []);
        const filteredChildren = includeHidden ? children : children.filter(isVisible);
        
        // Recursive call: process each child and its descendants
        // This creates depth-first traversal: parent -> child -> grandchild -> etc.
        const childrenTree = [];
        for (let i = 0; i < filteredChildren.length; i++) {
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
        viewport: viewport,
        responsive: {
          breakpoint: breakpoint,
          isMobile: viewport.width < 768,
          isTablet: viewport.width >= 768 && viewport.width < 992,
          isDesktop: viewport.width >= 992
        },
        stats: {
          total: allElements.length,
          visible: visibleCount,
          hidden: allElements.length - visibleCount
        },
        tree: domTree
      };
    `, includeHidden, maxDepth);

    const pageData = data as any;
    
    logger.info('Page elements extracted', {
      sessionId: sessionId || browserId,
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
      sessionId: sessionId || browserId,
      error: error instanceof Error ? error.message : String(error)
    });
    return {
      success: false,
      message: `Failed to extract DOM: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

