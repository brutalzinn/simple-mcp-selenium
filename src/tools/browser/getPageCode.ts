import { BrowserSession } from '../../common/types.js';
import { Logger } from '../../utils/logger.js';

export async function getPageCodeTool(
  args: any,
  getSession: (sessionId: string) => Promise<BrowserSession | null>,
  logger: Logger
) {
  const { sessionId, browserId, includeScripts = true, includeStyles = false, includeInline = true, maxLength = 50000 } = args;
  const session = await getSession(sessionId || browserId);

  if (!session) {
    return {
      success: false,
      message: `Session not found`,
    };
  }

  try {
    const codeData = await session.driver.executeScript(`
      const includeScripts = arguments[0];
      const includeStyles = arguments[1];
      const includeInline = arguments[2];
      const maxLength = arguments[3];
      
      const result = {
        url: window.location.href,
        title: document.title,
        scripts: [],
        styles: [],
        inlineCode: [],
        codeBlocks: []
      };
      
      // Extract script tags
      if (includeScripts) {
        document.querySelectorAll('script[src]').forEach(script => {
          result.scripts.push({
            type: 'external',
            src: script.src,
            typeAttr: script.type || 'text/javascript'
          });
        });
        
        if (includeInline) {
          document.querySelectorAll('script:not([src])').forEach(script => {
            const content = script.textContent || script.innerHTML || '';
            if (content.trim()) {
              result.scripts.push({
                type: 'inline',
                content: content.substring(0, maxLength),
                typeAttr: script.type || 'text/javascript'
              });
            }
          });
        }
      }
      
      // Extract style tags and link stylesheets
      if (includeStyles) {
        document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
          result.styles.push({
            type: 'external',
            href: link.href
          });
        });
        
        if (includeInline) {
          document.querySelectorAll('style').forEach(style => {
            const content = style.textContent || style.innerHTML || '';
            if (content.trim()) {
              result.styles.push({
                type: 'inline',
                content: content.substring(0, maxLength)
              });
            }
          });
        }
      }
      
      // Extract code blocks (pre, code tags)
      if (includeInline) {
        document.querySelectorAll('pre code, code').forEach(code => {
          const content = code.textContent || code.innerHTML || '';
          if (content.trim() && content.length > 10) {
            result.codeBlocks.push({
              selector: code.id ? '#' + code.id : code.className ? '.' + code.className.split(' ')[0] : 'code',
              language: code.className.match(/language-(\\w+)/)?.[1] || code.getAttribute('data-lang') || 'text',
              content: content.substring(0, maxLength)
            });
          }
        });
      }
      
      return result;
    `, includeScripts, includeStyles, includeInline, maxLength);

    const data = codeData as any;
    
    // Format as concise markdown for Cursor
    let markdown = `# Code from: ${data.title || data.url}\n\n`;
    markdown += `URL: ${data.url}\n\n`;
    
    if (data.scripts.length > 0) {
      markdown += `## Scripts (${data.scripts.length})\n\n`;
      data.scripts.forEach((script: any, idx: number) => {
        if (script.type === 'external') {
          markdown += `${idx + 1}. External: \`${script.src}\`\n`;
        } else {
          markdown += `${idx + 1}. Inline (${script.typeAttr}):\n\`\`\`${script.typeAttr.replace('text/', '')}\n${script.content}\n\`\`\`\n`;
        }
      });
    }
    
    if (data.styles.length > 0) {
      markdown += `\n## Styles (${data.styles.length})\n\n`;
      data.styles.forEach((style: any, idx: number) => {
        if (style.type === 'external') {
          markdown += `${idx + 1}. External: \`${style.href}\`\n`;
        } else {
          markdown += `${idx + 1}. Inline CSS:\n\`\`\`css\n${style.content}\n\`\`\`\n`;
        }
      });
    }
    
    if (data.codeBlocks.length > 0) {
      markdown += `\n## Code Blocks (${data.codeBlocks.length})\n\n`;
      data.codeBlocks.slice(0, 10).forEach((block: any, idx: number) => {
        markdown += `${idx + 1}. \`${block.selector}\` (${block.language}):\n\`\`\`${block.language}\n${block.content}\n\`\`\`\n`;
      });
      if (data.codeBlocks.length > 10) {
        markdown += `\n... ${data.codeBlocks.length - 10} more code blocks\n`;
      }
    }
    
    if (data.scripts.length === 0 && data.styles.length === 0 && data.codeBlocks.length === 0) {
      markdown += `No code found on this page.\n`;
    }

    return {
      success: true,
      message: `Extracted code from page`,
      data: {
        url: data.url,
        scriptsCount: data.scripts.length,
        stylesCount: data.styles.length,
        codeBlocksCount: data.codeBlocks.length,
        markdown: markdown
      }
    };
  } catch (error) {
    logger.error('Failed to get page code', {
      sessionId: sessionId || browserId,
      error: error instanceof Error ? error.message : String(error)
    });
    return {
      success: false,
      message: `Failed to extract code: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

