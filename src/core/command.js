/**
 * 命令路由
 * 解析文本命令 → 分发对应 handler
 */

import { postToTelegramApi } from '../services/telegramService.js';
import { handleStart } from '../handlers/chat.js';
import { handleHelp } from '../handlers/help.js';
import { handleBanCommand, handleUnbanCommand, handleBanlistCommand } from '../handlers/blacklist.js';
import { handleAddBot, handleDelBot } from '../handlers/admin.js';
import { logError } from '../utils/logger.js';
import { isAdmin } from '../middleware/auth.js';

export async function handleCommand(message, ownerUid, botToken, config) {
    const text = message.text.trim();
    const parts = text.split(' ');
    const cmd = parts[0].toLowerCase();
    const arg = parts.slice(1).join(' ').trim();
    const adminUid = config.adminUid;
    const senderId = message.chat?.id?.toString();

    // /start — ignore
    if (cmd === '/start') {
        return handleStart();
    }

    // KV required for these commands
    const needsKv = ['/ban', '/unban', '/addbot', '/delbot'];
    if (needsKv.includes(cmd) && !config.kv) {
        await postToTelegramApi(botToken, 'sendMessage', {
            chat_id: parseInt(ownerUid),
            text: '⚠️ 未配置 KV 命名空间，无法执行此操作。'
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
                await handleHelp(ownerUid, botToken);
                break;

            case '/ban':
                await handleBanCommand(targetUid, ownerUid, botToken, config);
                break;

            case '/unban':
                await handleUnbanCommand(targetUid, ownerUid, botToken, config);
                break;

            case '/banlist':
            case '/bans':
                await handleBanlistCommand(ownerUid, botToken, config);
                break;

            case '/addbot':
            case '/delbot':
                if (!isAdmin(senderId, config) && !isAdmin(ownerUid, config)) {
                    await postToTelegramApi(botToken, 'sendMessage', {
                        chat_id: parseInt(ownerUid),
                        text: '⚠️ 只有系统管理员才能执行此操作。'
                    });
                    break;
                }
                if (cmd === '/addbot') {
                    await handleAddBot(arg, ownerUid, botToken, config);
                } else {
                    await handleDelBot(arg, ownerUid, botToken, config);
                }
                break;

            default:
                await postToTelegramApi(botToken, 'sendMessage', {
                    chat_id: parseInt(ownerUid),
                    text: '❓ 未知命令。\n\n发送 /help 查看可用命令。'
                });
        }

        return new Response('OK');
    } catch (error) {
        logError('command', error);
        return new Response('Internal Server Error', { status: 500 });
    }
}
