/**
 * KV key 生成函数 & 全局常量
 */

export const getBlacklistKey = (ownerUid) => `blacklist_${ownerUid}`;
export const getStaticBlacklist = (config) => config.blacklist || [];
export const getChatIdListKey = () => 'chatid_list';
export const getBotTokenListKey = () => 'bottoken_list';
