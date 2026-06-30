/**
 * 黑名单检查中间件
 */

import { getStaticBlacklist } from '../utils/constants.js';
import { getBlacklist } from '../services/kvService.js';

/**
 * 判断 chatId 是否在黑名单中
 * @returns {boolean}
 */
export async function isBlacklisted(chatId, ownerUid, config) {
    if (chatId === ownerUid) return false;

    let list = [];
    if (config.kv) {
        list = await getBlacklist(config.kv, ownerUid);
    } else {
        list = getStaticBlacklist(config);
    }

    return list.includes(chatId);
}
