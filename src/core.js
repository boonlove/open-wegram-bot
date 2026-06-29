/**
 * Open Wegram Bot - Core Logic
 * Shared code between Cloudflare Worker and Vercel deployments
 */

export function validateSecretToken(token) {
    return token.length > 15 && /[A-Z]/.test(token) && /[a-z]/.test(token) && /[0-9]/.test(token);
}

export function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {'Content-Type': 'application/json'}
    });
}

export async function postToTelegramApi(token, method, body) {
    return fetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body)
    });
}

export async function handleInstall(request, ownerUid, botToken, prefix, secretToken, config) {
    const {chatIdList, botTokenList} = config;

    if (chatIdList.length === 0 || botTokenList.length === 0) {
        return jsonResponse({
            success: false,
            message: 'CHAT_ID and BOT_TOKEN must be configured in environment variables.'
        }, 400);
    }

    const botIndex = botTokenList.indexOf(botToken);
    if (botIndex === -1 || chatIdList[botIndex] !== ownerUid) {
        return jsonResponse({
            success: false,
            message: 'No matching owner UID and bot token pair found. Please check your CHAT_ID and BOT_TOKEN environment variables.'
        }, 403);
    }

    if (!validateSecretToken(secretToken)) {
        return jsonResponse({
            success: false,
            message: 'Secret token must be at least 16 characters and contain uppercase letters, lowercase letters, and numbers.'
        }, 400);
    }

    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.hostname}`;
    const webhookUrl = `${baseUrl}/${prefix}/webhook/${ownerUid}/${botToken}`;

    try {
        const response = await postToTelegramApi(botToken, 'setWebhook', {
            url: webhookUrl,
            allowed_updates: ['message', 'edited_message'],
            secret_token: secretToken
        });

        const result = await response.json();
        if (result.ok) {
            return jsonResponse({success: true, message: 'Webhook successfully installed.'});
        }

        return jsonResponse({success: false, message: `Failed to install webhook: ${result.description}`}, 400);
    } catch (error) {
        return jsonResponse({success: false, message: `Error installing webhook: ${error.message}`}, 500);
    }
}

export async function handleUninstall(botToken, secretToken, config) {
    const {botTokenList} = config;

    if (!botTokenList.includes(botToken)) {
        return jsonResponse({
            success: false,
            message: 'The provided bot token is not configured in BOT_TOKEN environment variable.'
        }, 403);
    }

    if (!validateSecretToken(secretToken)) {
        return jsonResponse({
            success: false,
            message: 'Secret token must be at least 16 characters and contain uppercase letters, lowercase letters, and numbers.'
        }, 400);
    }

    try {
        const response = await postToTelegramApi(botToken, 'deleteWebhook', {})

        const result = await response.json();
        if (result.ok) {
            return jsonResponse({success: true, message: 'Webhook successfully uninstalled.'});
        }

        return jsonResponse({success: false, message: `Failed to uninstall webhook: ${result.description}`}, 400);
    } catch (error) {
        return jsonResponse({success: false, message: `Error uninstalling webhook: ${error.message}`}, 500);
    }
}

export async function handleWebhook(request, ownerUid, botToken, secretToken, config) {
    if (secretToken !== request.headers.get('X-Telegram-Bot-Api-Secret-Token')) {
        return new Response('Unauthorized', {status: 401});
    }

    const update = await request.json();

    // Handle edited messages — re-forward non-owner edits to owner
    if (update.edited_message) {
        if (ownerUid !== update.edited_message.chat.id.toString()) {
            return handleMessage(update.edited_message, ownerUid, botToken, config);
        }
        return new Response('OK');
    }

    if (!update.message) {
        return new Response('OK');
    }

    const message = update.message;
    const isOwner = ownerUid === message.chat.id.toString();

    // Route 1: Owner commands (starts with /)
    if (isOwner && message.text?.startsWith('/')) {
        return handleCommand(message, ownerUid, botToken, config);
    }

    // Route 2: Normal message handling
    return handleMessage(message, ownerUid, botToken, config);
}

async function handleCommand(message, ownerUid, botToken, config) {
    const text = message.text.trim();
    const parts = text.split(' ');
    const cmd = parts[0].toLowerCase();
    const arg = parts.slice(1).join(' ').trim();
    const KV_BLACKLIST_KEY = `blacklist_${ownerUid}`;
    const STATIC_BLACKLIST = config.blacklist;

    // /start — silently ignore
    if (cmd === '/start') {
        return new Response('OK');
    }

    if (!config.kv && (cmd === '/ban' || cmd === '/unban')) {
        await postToTelegramApi(botToken, 'sendMessage', {
            chat_id: parseInt(ownerUid),
            text: '未配置 KV 命名空间，无法执行拉黑/解黑操作。'
        });
        return new Response('OK');
    }

    // Extract target UID: from reply inline keyboard, or from command argument
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
        // /ban — add user to blacklist
        if (cmd === '/ban') {
            if (!targetUid) {
                await postToTelegramApi(botToken, 'sendMessage', {
                    chat_id: parseInt(ownerUid),
                    text: '用法: /ban <用户UID>\n或回复转发消息发送 /ban'
                });
                return new Response('OK');
            }
            if (config.kv) {
                const current = await config.kv.get(KV_BLACKLIST_KEY) || '';
                const list = current.split(',').filter(Boolean);
                if (!list.includes(targetUid)) {
                    list.push(targetUid);
                    await config.kv.put(KV_BLACKLIST_KEY, list.join(','));
                    await postToTelegramApi(botToken, 'sendMessage', {
                        chat_id: parseInt(ownerUid),
                        text: `✅ 已拉黑用户 ${targetUid}`
                    });
                } else {
                    await postToTelegramApi(botToken, 'sendMessage', {
                        chat_id: parseInt(ownerUid),
                        text: `⚠️ 用户 ${targetUid} 已在黑名单中`
                    });
                }
            }
            return new Response('OK');
        }

        // /unban — remove user from blacklist
        if (cmd === '/unban') {
            if (!targetUid) {
                await postToTelegramApi(botToken, 'sendMessage', {
                    chat_id: parseInt(ownerUid),
                    text: '用法: /unban <用户UID>\n或回复转发消息发送 /unban'
                });
                return new Response('OK');
            }
            if (config.kv) {
                const current = await config.kv.get(KV_BLACKLIST_KEY) || '';
                const list = current.split(',').filter(Boolean);
                const filtered = list.filter(uid => uid !== targetUid);
                if (list.length !== filtered.length) {
                    await config.kv.put(KV_BLACKLIST_KEY, filtered.join(','));
                    await postToTelegramApi(botToken, 'sendMessage', {
                        chat_id: parseInt(ownerUid),
                        text: `✅ 已解封用户 ${targetUid}`
                    });
                } else {
                    await postToTelegramApi(botToken, 'sendMessage', {
                        chat_id: parseInt(ownerUid),
                        text: `⚠️ 用户 ${targetUid} 不在黑名单中`
                    });
                }
            }
            return new Response('OK');
        }

        // /banlist or /bans — list all blacklisted users
        if (cmd === '/banlist' || cmd === '/bans') {
            if (config.kv) {
                const current = await config.kv.get(KV_BLACKLIST_KEY) || '';
                const list = current.split(',').filter(Boolean);
                await postToTelegramApi(botToken, 'sendMessage', {
                    chat_id: parseInt(ownerUid),
                    text: list.length
                        ? `📋 黑名单 (${list.length}人):\n${list.join('\n')}`
                        : '📋 黑名单为空'
                });
            } else {
                await postToTelegramApi(botToken, 'sendMessage', {
                    chat_id: parseInt(ownerUid),
                    text: STATIC_BLACKLIST.length
                        ? `📋 静态黑名单 (${STATIC_BLACKLIST.length}人):\n${STATIC_BLACKLIST.join('\n')}`
                        : '📋 静态黑名单为空'
                });
            }
            return new Response('OK');
        }

        // Unknown command — show help
        await postToTelegramApi(botToken, 'sendMessage', {
            chat_id: parseInt(ownerUid),
            text: '❓ 未知命令'
        });
        return new Response('OK');
    } catch (error) {
        console.error('Error handling command:', error);
        return new Response('Internal Server Error', {status: 500});
    }
}

async function handleMessage(message, ownerUid, botToken, config) {
    const KV_BLACKLIST_KEY = `blacklist_${ownerUid}`;
    const STATIC_BLACKLIST = config.blacklist;
    try {
        const reply = message.reply_to_message;

        // Owner replies to a forwarded message → forward reply to original sender
        if (reply && message.chat.id.toString() == ownerUid) {
            const rm = reply.reply_markup;
            if (rm && rm.inline_keyboard && rm.inline_keyboard.length > 0) {
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

        // 处理 bot 所有者的直接发送给 bot 的消息
        if (message.chat.id.toString() == ownerUid) {
            return new Response('OK');
        }

        // /start from non-owners — silently ignore
        if ("/start" === message.text) {
            return new Response('OK');
        }

        // Blacklist check: KV → static env var fallback
        let blacklist = [];
        if (config.kv) {
            const raw = await config.kv.get(KV_BLACKLIST_KEY) || '';
            blacklist = raw.split(',').filter(Boolean);
        } else {
            blacklist = STATIC_BLACKLIST || [];
        }
        if (blacklist.includes(message.chat.id.toString())) {
            return new Response('OK');
        }

        // Forward message to owner
        const sender = message.chat;
        const senderUid = sender.id.toString();
        const senderName = sender.username ? `@${sender.username}` : [sender.first_name, sender.last_name].filter(Boolean).join(' ');

        const copyMessage = async function (withUrl = false) {
            const ik = [[{
                text: `🔏 From: ${senderName} (${senderUid})`,
                callback_data: senderUid,
            }]];

            if (withUrl) {
                ik[0][0].text = `🔓 From: ${senderName} (${senderUid})`
                ik[0][0].url = `tg://user?id=${senderUid}`;
            }

            return await postToTelegramApi(botToken, 'copyMessage', {
                chat_id: parseInt(ownerUid),
                from_chat_id: message.chat.id,
                message_id: message.message_id,
                reply_markup: {inline_keyboard: ik}
            });
        };

        const response = await copyMessage(true);
        if (!response.ok) {
            await copyMessage();
        }

        return new Response('OK');
    } catch (error) {
        console.error('Error handling message:', error);
        return new Response('Internal Server Error', {status: 500});
    }
}

export async function handleRequest(request, config) {
    const {prefix, secretToken} = config;

    const url = new URL(request.url);
    const path = url.pathname;

    const INSTALL_PATTERN = new RegExp(`^/${prefix}/install/([^/]+)/([^/]+)$`);
    const UNINSTALL_PATTERN = new RegExp(`^/${prefix}/uninstall/([^/]+)$`);
    const WEBHOOK_PATTERN = new RegExp(`^/${prefix}/webhook/([^/]+)/([^/]+)$`);

    let match;

    if (match = path.match(INSTALL_PATTERN)) {
        return handleInstall(request, match[1], match[2], prefix, secretToken, config);
    }

    if (match = path.match(UNINSTALL_PATTERN)) {
        return handleUninstall(match[1], secretToken, config);
    }

    if (match = path.match(WEBHOOK_PATTERN)) {
        return handleWebhook(request, match[1], match[2], secretToken, config);
    }

    return new Response('Not Found', {status: 404});
}