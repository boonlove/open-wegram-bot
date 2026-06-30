/**
 * KV key 生成函数 & 全局常量
 */

export const getBlacklistKey = (ownerUid) => `blacklist_${ownerUid}`;
export const getStaticBlacklist = (config) => config.blacklist || [];
export const getChatIdListKey = (adminUid) => `chatid_list_${adminUid}`;
export const getBotTokenListKey = (adminUid) => `bottoken_list_${adminUid}`;
