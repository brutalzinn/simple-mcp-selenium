import { BrowserSession } from '../../common/types.js';
import { Logger } from '../../utils/logger.js';
import { encode } from '@toon-format/toon';

export async function executeScriptTool(
    args: any,
    session: BrowserSession | null,
    logger: Logger
) {
    const { script, args: scriptArgs = [] } = args;
    
    if (!script || typeof script !== 'string' || script.trim().length === 0) {
        return { success: false, message: 'Script required' };
    }
    
    if (!session) return { success: false, message: 'Session not found' };
    
    try {
        // Selenium executeScript automatically:
        // 1. Executes JavaScript in browser context
        // 2. Awaits promises automatically
        // 3. Returns the resolved value
        // 4. Handles timeouts (default Selenium timeout applies)
        
        // Ensure script returns a value - wrap if needed
        let scriptToExecute = script.trim();
        
        // If script doesn't explicitly return, wrap it
        // Check if it's already a return statement or IIFE
        const hasReturn = scriptToExecute.startsWith('return ');
        const isIIFE = (scriptToExecute.startsWith('(') && scriptToExecute.endsWith(')')) ||
                      (scriptToExecute.startsWith('(()') && scriptToExecute.includes(')()'));
        const isArrowFunction = scriptToExecute.includes('=>');
        
        if (!hasReturn && !isIIFE) {
            // Wrap in IIFE to ensure return value
            if (isArrowFunction) {
                // Arrow function - call it
                scriptToExecute = `return (${scriptToExecute})();`;
            } else {
                // Regular code - wrap in function
                scriptToExecute = `return (function() { ${scriptToExecute} })();`;
            }
        } else if (!hasReturn && isIIFE) {
            // IIFE without return - add return
            scriptToExecute = `return ${scriptToExecute};`;
        }
        
        logger.debug('Executing script', { 
            sessionId: session.sessionId, 
            browserId: session.browserId,
            scriptLength: script.length,
            scriptPreview: script.substring(0, 200),
            scriptArgsCount: scriptArgs.length,
            wrapped: scriptToExecute !== script
        });
        
        // Execute script - Selenium automatically awaits promises
        // This will throw if script fails or times out
        const result = await session.driver.executeScript(scriptToExecute, ...scriptArgs);
        
        // Handle all result types properly
        // Selenium returns: primitives, objects, arrays, null, undefined
        // Promises are automatically awaited, so we get the resolved value
        
        let resultValue: any = result;
        let resultType: string = typeof result;
        
        // Normalize undefined to null for consistency
        if (result === undefined) {
            resultValue = null;
            resultType = 'null';
        } else if (result === null) {
            resultValue = null;
            resultType = 'null';
        }
        
        // Log result info (using TOON for preview in logs)
        try {
            const preview = resultValue !== null && typeof resultValue === 'object'
                ? encode(resultValue).substring(0, 200)
                : String(resultValue).substring(0, 200);
            
            logger.debug('Script executed successfully', { 
                sessionId: session.sessionId, 
                browserId: session.browserId,
                resultType: resultType,
                hasResult: resultValue !== null,
                resultPreview: preview
            });
        } catch (previewError) {
            // Ignore preview errors
        }
        
        // Return result - will be serialized using TOON by formatResultAsMarkdown
        return { 
            success: true, 
            data: { 
                result: resultValue,
                resultType: resultType
            } 
        };
        
    } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        const errorMessage = errorObj.message;
        const errorStack = errorObj.stack;
        
        // Check if it's a timeout error
        const isTimeout = errorMessage.toLowerCase().includes('timeout') || 
                         errorMessage.toLowerCase().includes('timed out') ||
                         errorMessage.toLowerCase().includes('script timeout');
        
        // Check if it's a JavaScript error
        const isJSError = errorMessage.includes('JavaScript error') ||
                         errorMessage.includes('ReferenceError') ||
                         errorMessage.includes('TypeError') ||
                         errorMessage.includes('SyntaxError');
        
        logger.error('Script execution failed', { 
            sessionId: session.sessionId, 
            browserId: session.browserId,
            error: errorMessage,
            isTimeout: isTimeout,
            isJSError: isJSError,
            script: script.substring(0, 200),
            stack: errorStack ? errorStack.substring(0, 500) : undefined
        });
        
        // Return structured error - will be serialized using TOON
        return { 
            success: false, 
            message: isTimeout 
                ? `Script execution timed out: ${errorMessage}`
                : isJSError
                ? `JavaScript error: ${errorMessage}`
                : `Script execution failed: ${errorMessage}`,
            data: {
                error: errorMessage,
                errorType: isTimeout ? 'timeout' : (isJSError ? 'javascript' : 'execution'),
                script: script.substring(0, 200)
            }
        };
    }
}
