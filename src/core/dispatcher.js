/**
 * Telegram 消息分发器
 * 解析 update → 路由到命令处理 / 消息转发
 */

import { isAdminMessage } from '../middleware/auth.js';
import { handleMessage, handleEditedMessage } from '../handlers/forward.js';
import { handleCommand } from './command.js';

/**
 * Webhook 入口 — 接收 Telegram POST
 */
export async function handleWebhook(request, ownerUid, botToken, config) {
    // 验证来源
    if (config.secretToken !== request.headers.get('X-Telegram-Bot-Api-Secret-Token')) {
        return new Response('Unauthorized', { status: 401 });
    }

    const update = await request.json();

    // 编辑消息 — 重新转发
    if (update.edited_message) {
        return handleEditedMessage(update.edited_message, ownerUid, botToken, config);
    }

    if (!update.message) {
        return new Response('OK');
    }

    const message = update.message;
    const senderId = message.chat?.id?.toString();

    // 管理员命令
    if (isAdminMessage(message, config) && message.text?.startsWith('/')) {
        return handleCommand(message, ownerUid, botToken, config);
    }

    // 普通消息
    return handleMessage(message, ownerUid, botToken, config);
}
