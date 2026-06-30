/**
 * KV 数据操作
 * 黑名单 / 多 Bot 列表
 */

import { getBlacklistKey, getChatIdListKey, getBotTokenListKey } from '../utils/constants.js';

// ── 黑名单 ──

export async function getBlacklist(kv, ownerUid) {
    const raw = await kv.get(getBlacklistKey(ownerUid)) || '';
    return raw.split(',').filter(Boolean);
}

export async function addToBlacklist(kv, ownerUid, targetUid) {
    const list = await getBlacklist(kv, ownerUid);
    if (list.includes(targetUid)) return false;
    list.push(targetUid);
    await kv.put(getBlacklistKey(ownerUid), list.join(','));
    return true;
}

export async function removeFromBlacklist(kv, ownerUid, targetUid) {
    const list = await getBlacklist(kv, ownerUid);
    const filtered = list.filter(uid => uid !== targetUid);
    if (list.length === filtered.length) return false;
    await kv.put(getBlacklistKey(ownerUid), filtered.join(','));
    return true;
}

// ── 多 Bot 列表 ──

export async function getBotPairList(kv) {
    const chatIds = (await kv.get(getChatIdListKey()) || '').split(',').filter(Boolean);
    const botTokens = (await kv.get(getBotTokenListKey()) || '').split(',').filter(Boolean);
    return { chatIds, botTokens };
}

export async function addBotPair(kv, chatId, token) {
    const { chatIds, botTokens } = await getBotPairList(kv);
    if (botTokens.includes(token)) return false;
    chatIds.push(chatId);
    botTokens.push(token);
    await kv.put(getChatIdListKey(), chatIds.join(','));
    await kv.put(getBotTokenListKey(), botTokens.join(','));
    return true;
}

export async function removeBotPair(kv, token) {
    const { chatIds, botTokens } = await getBotPairList(kv);
    const idx = botTokens.indexOf(token);
    if (idx === -1) return false;
    chatIds.splice(idx, 1);
    botTokens.splice(idx, 1);
    await kv.put(getChatIdListKey(), chatIds.join(','));
    await kv.put(getBotTokenListKey(), botTokens.join(','));
    return true;
}

// ── 安装/卸载授权校验 ──

export async function isBotAuthorized(kv, adminUid, adminBotToken, ownerUid, botToken) {
    // 环境变量中的管理员
    if (ownerUid === adminUid && botToken === adminBotToken) return true;
    // KV 列表中的 Bot
    if (!kv) return false;
    const { chatIds, botTokens } = await getBotPairList(kv);
    const idx = botTokens.indexOf(botToken);
    return idx !== -1 && chatIds[idx] === ownerUid;
}

export async function isTokenInList(kv, adminUid, adminBotToken, botToken) {
    if (botToken === adminBotToken) return true;
    if (!kv) return false;
    const { botTokens } = await getBotPairList(kv);
    return botTokens.includes(botToken);
}
