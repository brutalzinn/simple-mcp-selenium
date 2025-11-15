import { BrowserSession } from '../../common/types.js';
import { Logger } from '../../utils/logger.js';

export async function getPageElementsMarkdownTool(
  args: any,
  getSession: (sessionId: string) => Promise<BrowserSession | null>,
  logger: Logger
) {
  const { sessionId, includeHidden = false, elementLimit = 200 } = args;
  const session = await getSession(sessionId);

  if (!session) {
    return {
      success: false,
      message: `Session '${sessionId}' not found`,
    };
  }

  try {
    const data = await session.driver.executeScript(`
      const includeHidden = arguments[0];
      const limit = arguments[1];
      
      function isVisible(el) {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && 
               style.visibility !== 'hidden' && 
               style.display !== 'none' &&
               style.opacity !== '0';
      }

      function getSimpleSelector(el) {
        if (el.id) return '#' + CSS.escape(el.id);
        if (el.name) return \`[name="\${el.name}"]\`;
        if (el.className) {
          const classes = el.className.split(' ').filter(c => c.trim()).slice(0, 2);
          if (classes.length > 0) {
            return '.' + classes.map(c => CSS.escape(c)).join('.');
          }
        }
        return el.tagName.toLowerCase();
      }

      function getFullSelector(el) {
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

      function getElementInfo(el, depth = 0) {
        const rect = el.getBoundingClientRect();
        const text = (el.textContent || el.innerText || '').trim().slice(0, 100);
        const visibleText = (el.innerText !== undefined ? el.innerText : (el.textContent || '')).trim().slice(0, 100);
        
        // Get children (direct children only for tree structure)
        const children = Array.from(el.children || []);
        const visibleChildren = includeHidden ? children : children.filter(isVisible);
        
        return {
          tag: el.tagName.toLowerCase(),
          selector: getSimpleSelector(el),
          fullSelector: getFullSelector(el),
          id: el.id || null,
          name: el.getAttribute('name') || null,
          type: el.getAttribute('type') || null,
          text: text,
          visibleText: visibleText,
          placeholder: el.getAttribute('placeholder') || null,
          value: (el.value !== undefined) ? String(el.value) : null,
          href: (el.href !== undefined) ? el.href : null,
          role: el.getAttribute('role') || null,
          'aria-label': el.getAttribute('aria-label') || null,
          'data-testid': el.getAttribute('data-testid') || null,
          isVisible: isVisible(el),
          isEnabled: (el.disabled !== undefined) ? !el.disabled : true,
          isSelected: (el.selected !== undefined) ? !!el.selected : false,
          location: { 
            x: Math.round(rect.x), 
            y: Math.round(rect.y), 
            width: Math.round(rect.width), 
            height: Math.round(rect.height) 
          },
          depth: depth,
          childCount: children.length,
          visibleChildCount: visibleChildren.length
        };
      }

      // Build DOM tree structure starting from body
      function buildElementTree(root, depth = 0, maxDepth = 10) {
        if (depth > maxDepth) return null;
        
        const elementInfo = getElementInfo(root, depth);
        const children = Array.from(root.children || []);
        const filteredChildren = includeHidden ? children : children.filter(isVisible);
        
        // Limit children to prevent excessive nesting
        const limitedChildren = filteredChildren.slice(0, 50).map(child => 
          buildElementTree(child, depth + 1, maxDepth)
        ).filter(child => child !== null);
        
        elementInfo.children = limitedChildren;
        return elementInfo;
      }

      // Get body element and build tree
      const body = document.body;
      const tree = body ? buildElementTree(body, 0, 8) : null;
      
      // Also get flat list for reference
      const allElements = Array.from(document.querySelectorAll('*'));
      const filteredElements = includeHidden 
        ? allElements 
        : allElements.filter(isVisible);
      
      const flatElements = filteredElements.slice(0, limit).map(el => getElementInfo(el));
      
      return {
        url: window.location.href,
        title: document.title,
        totalElements: allElements.length,
        visibleElements: allElements.filter(isVisible).length,
        tree: tree,
        flatElements: flatElements
      };
    `, includeHidden, elementLimit);

    const pageData = data as any;
    
    // Compact tree representation - optimized for token usage
    function treeToMarkdown(node: any, indent = 0): string {
      if (!node) return '';
      
      const indentStr = '  '.repeat(indent);
      let md = '';
      
      // Compact element representation: tag#id[name] selector
      const parts = [node.tag];
      if (node.id) parts.push(`#${node.id}`);
      if (node.name) parts.push(`[${node.name}]`);
      const label = parts.join('');
      
      // Build compact info line
      const info: string[] = [];
      if (node.selector && !node.id) info.push(`sel:\`${node.selector}\``);
      if (node.type) info.push(`t:${node.type}`);
      if (node.text && node.text.length < 40) info.push(`"${node.text}"`);
      if (node.placeholder) info.push(`ph:"${node.placeholder}"`);
      if (node.value && node.value.length < 30) info.push(`v:"${node.value}"`);
      if (node.href) info.push(`→${node.href}`);
      if (node['data-testid']) info.push(`test:${node['data-testid']}`);
      
      // Status flags (compact)
      const flags: string[] = [];
      if (!node.isVisible) flags.push('H');
      if (!node.isEnabled) flags.push('D');
      if (node.isSelected) flags.push('S');
      
      // Actions (compact)
      const actions: string[] = [];
      if (node.tag === 'button' || node.tag === 'a' || node.role === 'button') actions.push('click');
      if (node.tag === 'input' || node.tag === 'textarea') actions.push('type');
      if (node.tag === 'select') actions.push('select');
      if (node.tag === 'a' && node.href) actions.push('nav');
      if (node.tag === 'form') actions.push('submit');
      
      // Single line per element
      let line = `${indentStr}${label}`;
      if (info.length > 0) line += ` ${info.join(' ')}`;
      if (flags.length > 0) line += ` [${flags.join('')}]`;
      if (actions.length > 0) line += ` →${actions.join(',')}`;
      if (node.childCount > 0 && node.visibleChildCount > 0) line += ` (${node.visibleChildCount})`;
      
      md += line + '\n';
      
      // Only show children if they're interactive or have important content
      if (node.children && node.children.length > 0) {
        node.children.forEach((child: any) => {
          // Skip non-interactive containers with no text
          const isImportant = child.tag === 'button' || child.tag === 'input' || 
                              child.tag === 'textarea' || child.tag === 'select' || 
                              child.tag === 'a' || child.role === 'button' ||
                              child.text || child.id || child['data-testid'] ||
                              (child.visibleChildCount > 0 && child.visibleChildCount < 5);
          
          if (isImportant || indent < 3) {
            md += treeToMarkdown(child, indent + 1);
          }
        });
      }
      
      return md;
    }
    
    // Generate compact markdown
    let markdown = `# ${pageData.title || 'Page'}\n`;
    markdown += `URL: ${pageData.url}\n`;
    markdown += `Elements: ${pageData.visibleElements}/${pageData.totalElements}\n\n`;
    
    // DOM tree (compact)
    if (pageData.tree) {
      markdown += `## DOM Tree\n\`\`\`\n`;
      markdown += treeToMarkdown(pageData.tree, 0);
      markdown += `\`\`\`\n\n`;
    }
    
    // Interactive elements only (most important)
    const interactiveElements = pageData.flatElements.filter((el: any) => {
      return (el.tag === 'button' || el.tag === 'input' || el.tag === 'textarea' || 
              el.tag === 'select' || el.tag === 'a' || el.role === 'button') && el.isVisible;
    }).slice(0, 50); // Limit to 50 most important
    
    if (interactiveElements.length > 0) {
      markdown += `## Interactive\n`;
      interactiveElements.forEach((el: any) => {
        const parts = [el.tag];
        if (el.id) parts.push(`#${el.id}`);
        if (el.name) parts.push(`[${el.name}]`);
        let line = `- ${parts.join('')} \`${el.selector}\``;
        if (el.text && el.text.length < 30) line += ` "${el.text}"`;
        if (el.type) line += ` (${el.type})`;
        markdown += line + '\n';
      });
    }

    logger.info('Page elements markdown generated', { 
      sessionId, 
      elementCount: pageData.flatElements.length,
      url: pageData.url 
    });

    return {
      success: true,
      message: `Generated compact markdown for ${pageData.flatElements.length} elements`,
      data: {
        markdown: markdown,
        summary: {
          url: pageData.url,
          title: pageData.title,
          totalElements: pageData.totalElements,
          visibleElements: pageData.visibleElements,
          returnedElements: pageData.flatElements.length
        }
      }
    };
  } catch (error) {
    logger.error('Failed to get page elements markdown', { 
      sessionId, 
      error: error instanceof Error ? error.message : String(error) 
    });
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

