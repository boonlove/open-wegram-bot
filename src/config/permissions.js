/**
 * 权限常量
 */

export const ROLE_ADMIN = 'admin';
export const ROLE_BOT_OWNER = 'bot_owner';
export const ROLE_USER = 'user';

/**
 * 判断角色
 * @param {string} chatId  - 发送者 UID
 * @param {string} ownerUid - 当前 bot 的 owner（来自 URL 路径）
 * @param {object} config
 * @returns {string} 角色
 */
export function resolveRole(chatId, ownerUid, config) {
    if (config.adminUid === chatId) return ROLE_ADMIN;
    if (ownerUid === chatId) return ROLE_BOT_OWNER;
    return ROLE_USER;
}
