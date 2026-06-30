/**
 * 管理命令 & 安装/卸载
 * /addbot <UID> <Token> — KV 中添加 Bot 对
 * /delbot <Token> — KV 中删除 Bot 对
 * POST install — 注册 webhook
 * POST uninstall — 删除 webhook
 */

import { postToTelegramApi } from '../services/telegramService.js';
import { isBotAuthorized, isTokenInList, addBotPair, removeBotPair } from '../services/kvService.js';
import { validateSecretToken, validateBotToken, validateChatId } from '../utils/parse.js';
import { jsonResponse, errorResponse } from '../utils/response.js';
import { logError } from '../utils/logger.js';

// ── Bot 管理命令 ──

export async function handleAddBot(arg, ownerUid, botToken, config) {
    const parts = arg.split(' ');
    const uid = parts[0];
    const token = parts.slice(1).join(' ').trim();

    if (!uid || !token) {
        await postToTelegramApi(botToken, 'sendMessage', {
            chat_id: parseInt(ownerUid),
            text: '用法: /addbot <用户UID> <BotToken>'
        });
        return;
    }

    if (!validateChatId(uid)) {
        await postToTelegramApi(botToken, 'sendMessage', {
            chat_id: parseInt(ownerUid),
            text: '⚠️ 无效的用户UID格式'
        });
        return;
    }

    if (!validateBotToken(token)) {
        await postToTelegramApi(botToken, 'sendMessage', {
            chat_id: parseInt(ownerUid),
            text: '⚠️ 无效的 Bot Token 格式'
        });
        return;
    }

    if (!config.kv) {
        await postToTelegramApi(botToken, 'sendMessage', {
            chat_id: parseInt(ownerUid),
            text: '⚠️ 未配置 KV 命名空间'
        });
        return;
    }

    const ok = await addBotPair(config.kv, uid, token);
    await postToTelegramApi(botToken, 'sendMessage', {
        chat_id: parseInt(ownerUid),
        text: ok
            ? `✅ 已添加 Bot: ${uid} / ${token}\n请访问 install URL 完成安装。`
            : `⚠️ Token ${token} 已存在`
    });
}

export async function handleDelBot(arg, ownerUid, botToken, config) {
    if (!arg) {
        await postToTelegramApi(botToken, 'sendMessage', {
            chat_id: parseInt(ownerUid),
            text: '用法: /delbot <BotToken>'
        });
        return;
    }

    if (!validateBotToken(arg)) {
        await postToTelegramApi(botToken, 'sendMessage', {
            chat_id: parseInt(ownerUid),
            text: '⚠️ 无效的 Bot Token 格式'
        });
        return;
    }

    if (!config.kv) {
        await postToTelegramApi(botToken, 'sendMessage', {
            chat_id: parseInt(ownerUid),
            text: '⚠️ 未配置 KV 命名空间'
        });
        return;
    }

    const ok = await removeBotPair(config.kv, arg);
    await postToTelegramApi(botToken, 'sendMessage', {
        chat_id: parseInt(ownerUid),
        text: ok
            ? `✅ 已删除 Token: ${arg}`
            : `⚠️ Token ${arg} 不存在`
    });
}

// ── HTTP 安装/卸载 ──

export async function handleInstall(request, ownerUid, botToken, prefix, secretToken, config) {
    const { adminUid, adminBotToken } = config;

    if (!adminUid || !adminBotToken) {
        return errorResponse('ADMIN and BOT_TOKEN must be configured.', 400);
    }

    if (!validateChatId(ownerUid)) {
        return errorResponse('Invalid owner UID format.', 400);
    }

    if (!validateBotToken(botToken)) {
        return errorResponse('Invalid bot token format.', 400);
    }

    const authorized = await isBotAuthorized(
        config.kv, adminUid, adminBotToken, ownerUid, botToken
    );
    if (!authorized) {
        return errorResponse('Owner UID or bot token mismatch.', 403);
    }

    if (!validateSecretToken(secretToken)) {
        return errorResponse(
            'Secret token must be at least 16 characters with mixed case and digits.', 400
        );
    }

    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.hostname}`;
    const webhookUrl = `${baseUrl}/${prefix}/webhook/${ownerUid}/${botToken}`;

    try {
        const res = await postToTelegramApi(botToken, 'setWebhook', {
            url: webhookUrl,
            allowed_updates: ['message', 'edited_message'],
            secret_token: secretToken
        });
        const result = await res.json();
        if (result.ok) return jsonResponse({ success: true, message: 'Webhook installed.' });
        return errorResponse(`Telegram: ${result.description}`, 400);
    } catch (error) {
        logError('install', error);
        return errorResponse(error.message, 500);
    }
}

export async function handleUninstall(botToken, secretToken, config) {
    const { adminUid, adminBotToken } = config;

    if (!validateBotToken(botToken)) {
        return errorResponse('Invalid bot token format.', 400);
    }

    const authorized = await isTokenInList(config.kv, adminUid, adminBotToken, botToken);
    if (!authorized) {
        return errorResponse('Bot token is not configured.', 403);
    }

    if (!validateSecretToken(secretToken)) {
        return errorResponse(
            'Secret token must be at least 16 characters with mixed case and digits.', 400
        );
    }

    try {
        const res = await postToTelegramApi(botToken, 'deleteWebhook', {});
        const result = await res.json();
        if (result.ok) return jsonResponse({ success: true, message: 'Webhook uninstalled.' });
        return errorResponse(`Telegram: ${result.description}`, 400);
    } catch (error) {
        logError('uninstall', error);
        return errorResponse(error.message, 500);
    }
}
