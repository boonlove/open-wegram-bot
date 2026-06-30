/**
 * 管理命令 & 安装/卸载
 * /addbot <UID> <Token> — KV 中添加 Bot 对
 * /delbot <Token> — KV 中删除 Bot 对
 * POST install — 注册 webhook
 * POST uninstall — 删除 webhook
 */

import { postToTelegramApi } from '../services/telegramService.js';
import { isBotAuthorized, isTokenInList } from '../services/kvService.js';
import { validateSecretToken } from '../utils/parse.js';
import { jsonResponse, errorResponse } from '../utils/response.js';
import { logError } from '../utils/logger.js';

// ── HTTP 安装/卸载 ──

export async function handleInstall(request, ownerUid, botToken, prefix, secretToken, config) {
    const { adminUid, adminBotToken } = config;

    if (!adminUid || !adminBotToken) {
        return errorResponse('ADMIN and BOT_TOKEN must be configured.', 400);
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
