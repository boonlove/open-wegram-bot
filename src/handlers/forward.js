/**
 * 消息转发
 * - 用户消息 → 转发给 owner
 * - owner 回复 → 转发给原发送者
 * - 编辑消息 → 重新转发
 */

import { postToTelegramApi } from '../services/telegramService.js';
import { isBlacklisted } from '../middleware/blacklist.js';
import { isOwnerMessage } from '../middleware/auth.js';
import { logError } from '../utils/logger.js';

/**
 * 处理普通消息（非命令）
 */
export async function handleMessage(message, ownerUid, botToken, config) {
    try {
        const reply = message.reply_to_message;

        // owner 回复转发消息 → 转发给原发送者
        if (reply && isOwnerMessage(message, ownerUid)) {
            const rm = reply.reply_markup;
            if (rm?.inline_keyboard?.[0]?.[0]) {
                let senderUid = rm.inline_keyboard[0][0].callback_data;
                if (!senderUid) {
                    senderUid = rm.inline_keyboard[0][0].url?.split('tg://user?id=')[1];
                }
                if (senderUid) {
                    await postToTelegramApi(botToken, 'copyMessage', {
                        chat_id: parseInt(senderUid),
                        from_chat_id: message.chat.id,
                        message_id: message.message_id
                    });
                }
            }
            return new Response('OK');
        }

        // owner 直接消息 → 忽略
        if (isOwnerMessage(message, ownerUid)) {
            return new Response('OK');
        }

        // /start → 忽略
        if ("/start" === message.text) {
            return new Response('OK');
        }

        // 黑名单检查
        if (await isBlacklisted(message.chat.id.toString(), ownerUid, config)) {
            return new Response('OK');
        }

        // 转发给 owner
        const sender = message.chat;
        const senderUid = sender.id.toString();
        const senderName = sender.username
            ? `@${sender.username}`
            : [sender.first_name, sender.last_name].filter(Boolean).join(' ');

        const doCopy = async (withUrl = false) => {
            const ik = [[{
                text: `🔏 From: ${senderName} (${senderUid})`,
                callback_data: senderUid,
            }]];
            if (withUrl) {
                ik[0][0].text = `🔓 From: ${senderName} (${senderUid})`;
                ik[0][0].url = `tg://user?id=${senderUid}`;
            }
            return postToTelegramApi(botToken, 'copyMessage', {
                chat_id: parseInt(ownerUid),
                from_chat_id: message.chat.id,
                message_id: message.message_id,
                reply_markup: { inline_keyboard: ik }
            });
        };

        const res = await doCopy(true);
        if (!res.ok) await doCopy();

        return new Response('OK');
    } catch (error) {
        logError('forward', error);
        return new Response('Internal Server Error', { status: 500 });
    }
}

/**
 * 处理编辑消息 — 重新转发给 owner
 */
export async function handleEditedMessage(editedMessage, ownerUid, botToken, config) {
    try {
        // 只处理非 owner 的编辑
        if (ownerUid === editedMessage.chat.id.toString()) {
            return new Response('OK');
        }

        const sender = editedMessage.chat;
        const senderUid = sender.id.toString();
        const senderName = sender.username
            ? `@${sender.username}`
            : [sender.first_name, sender.last_name].filter(Boolean).join(' ');

        const ik = [[{
            text: `🔓 From: ${senderName} (${senderUid})`,
            url: `tg://user?id=${senderUid}`,
            callback_data: senderUid,
        }]];

        let res = await postToTelegramApi(botToken, 'copyMessage', {
            chat_id: parseInt(ownerUid),
            from_chat_id: editedMessage.chat.id,
            message_id: editedMessage.message_id,
            reply_markup: { inline_keyboard: ik }
        });

        if (!res.ok) {
            ik[0][0].text = `🔏 From: ${senderName} (${senderUid})`;
            delete ik[0][0].url;
            res = await postToTelegramApi(botToken, 'copyMessage', {
                chat_id: parseInt(ownerUid),
                from_chat_id: editedMessage.chat.id,
                message_id: editedMessage.message_id,
                reply_markup: { inline_keyboard: ik }
            });
        }

        // 追加 "已编辑" 后缀
        const data = await res.json();
        if (data.ok && data.result) {
            const fwdMsgId = data.result.message_id;
            if (editedMessage.text !== undefined) {
                await postToTelegramApi(botToken, 'editMessageText', {
                    chat_id: parseInt(ownerUid),
                    message_id: fwdMsgId,
                    text: editedMessage.text + '\n\n对方已编辑',
                    reply_markup: { inline_keyboard: ik }
                });
            } else if (editedMessage.caption !== undefined) {
                await postToTelegramApi(botToken, 'editMessageCaption', {
                    chat_id: parseInt(ownerUid),
                    message_id: fwdMsgId,
                    caption: editedMessage.caption + '\n\n对方已编辑',
                    reply_markup: { inline_keyboard: ik }
                });
            } else {
                await postToTelegramApi(botToken, 'editMessageCaption', {
                    chat_id: parseInt(ownerUid),
                    message_id: fwdMsgId,
                    caption: '对方已编辑',
                    reply_markup: { inline_keyboard: ik }
                });
            }
        }

        return new Response('OK');
    } catch (error) {
        logError('edited', error);
        return new Response('OK');
    }
}
