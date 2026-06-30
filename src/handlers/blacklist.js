/**
 * 黑名单命令
 * /ban <UID> — 拉黑用户
 * /unban <UID> — 解封用户
 * /banlist — 查看黑名单
 */

import { postToTelegramApi } from '../services/telegramService.js';
import { addToBlacklist, removeFromBlacklist, getBlacklist } from '../services/kvService.js';
import { getStaticBlacklist } from '../utils/constants.js';
import { validateChatId } from '../utils/parse.js';

export async function handleBanCommand(targetUid, ownerUid, botToken, config) {
    if (!targetUid) {
        await postToTelegramApi(botToken, 'sendMessage', {
            chat_id: parseInt(ownerUid),
            text: '用法: /ban <用户UID> 或回复转发消息发送 /ban'
        });
        return;
    }

    if (!validateChatId(targetUid)) {
        await postToTelegramApi(botToken, 'sendMessage', {
            chat_id: parseInt(ownerUid),
            text: '⚠️ 操作失败，非法的UID'
        });
        return;
    }

    if (!config.kv) return;

    const ok = await addToBlacklist(config.kv, ownerUid, targetUid);
    await postToTelegramApi(botToken, 'sendMessage', {
        chat_id: parseInt(ownerUid),
        text: ok
            ? `✅ 已拉黑用户 ${targetUid}`
            : `⚠️ 用户 ${targetUid} 已在黑名单中`
    });
}

export async function handleUnbanCommand(targetUid, ownerUid, botToken, config) {
    if (!targetUid) {
        await postToTelegramApi(botToken, 'sendMessage', {
            chat_id: parseInt(ownerUid),
            text: '用法: /unban <用户UID> 或回复转发消息发送 /unban'
        });
        return;
    }

    if (!validateChatId(targetUid)) {
        await postToTelegramApi(botToken, 'sendMessage', {
            chat_id: parseInt(ownerUid),
            text: '⚠️ 操作失败，非法的UID'
        });
        return;
    }

    if (!config.kv) return;

    const ok = await removeFromBlacklist(config.kv, ownerUid, targetUid);
    await postToTelegramApi(botToken, 'sendMessage', {
        chat_id: parseInt(ownerUid),
        text: ok
            ? `✅ 已解封用户 ${targetUid}`
            : `⚠️ 用户 ${targetUid} 不在黑名单中`
    });
}

export async function handleBanlistCommand(ownerUid, botToken, config) {
    if (config.kv) {
        const list = await getBlacklist(config.kv, ownerUid);
        await postToTelegramApi(botToken, 'sendMessage', {
            chat_id: parseInt(ownerUid),
            text: list.length
                ? `📋 黑名单 (${list.length}人):\n${list.join('\n')}`
                : '📋 黑名单为空'
        });
    } else {
        const list = getStaticBlacklist(config);
        await postToTelegramApi(botToken, 'sendMessage', {
            chat_id: parseInt(ownerUid),
            text: list.length
                ? `📋 静态黑名单 (${list.length}人):\n${list.join('\n')}`
                : '📋 静态黑名单为空'
        });
    }
}
