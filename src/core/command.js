/**
 * 命令路由
 * 解析文本命令 → 分发对应 handler
 */

import { postToTelegramApi } from '../services/telegramService.js';
import { handleStart } from '../handlers/chat.js';
import { handleHelp } from '../handlers/help.js';
import { handleBanCommand, handleUnbanCommand, handleBanlistCommand } from '../handlers/blacklist.js';
import { logError } from '../utils/logger.js';

export async function handleCommand(message, ownerUid, botToken, config) {
    const text = message.text.trim();
    const parts = text.split(' ');
    const cmd = parts[0].toLowerCase();
    const arg = parts.slice(1).join(' ').trim();
    const adminUid = config.adminUid;

    // /start — ignore
    if (cmd === '/start') {
        return handleStart();
    }

    // KV required for blacklist / bot management
    const needsKv = ['/ban', '/unban'];
    if (needsKv.includes(cmd) && !config.kv) {
        await postToTelegramApi(botToken, 'sendMessage', {
            chat_id: parseInt(adminUid),
            text: '⚠️ 未配置 KV 命名空间，无法执行此操作，若您不是系统管理员，请联系系统管理员处理。'
        });
        return new Response('OK');
    }

    // Extract target UID for ban/unban: reply → keyboard, else → arg
    let targetUid = null;
    if (message.reply_to_message) {
        const rm = message.reply_to_message.reply_markup;
        if (rm && rm.inline_keyboard && rm.inline_keyboard.length > 0) {
            targetUid = rm.inline_keyboard[0][0].callback_data;
            if (!targetUid) {
                targetUid = rm.inline_keyboard[0][0].url?.split('tg://user?id=')[1];
            }
        }
    }
    if (!targetUid && arg) {
        targetUid = arg;
    }

    try {
        switch (cmd) {
            case '/help':
                await handleHelp(adminUid, botToken);
                break;

            case '/ban':
                await handleBanCommand(targetUid, adminUid, botToken, config);
                break;

            case '/unban':
                await handleUnbanCommand(targetUid, adminUid, botToken, config);
                break;

            case '/banlist':
            case '/bans':
                await handleBanlistCommand(adminUid, botToken, config);
                break;

            default:
                await postToTelegramApi(botToken, 'sendMessage', {
                    chat_id: parseInt(adminUid),
                    text: '❓ 未知命令。\n\n发送 /help 查看可用命令。'
                });
        }

        return new Response('OK');
    } catch (error) {
        logError('command', error);
        return new Response('Internal Server Error', { status: 500 });
    }
}
