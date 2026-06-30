/**
 * 简易日志工具
 */

export function logInfo(tag, msg) {
    console.log(`[${tag}] ${msg}`);
}

export function logError(tag, error) {
    console.error(`[${tag}] Error:`, error);
}
