/**
 * 帮助命令 /help
 */

import { postToTelegramApi } from '../services/telegramService.js';

export async function handleHelp(adminUid, botToken) {
    await postToTelegramApi(botToken, 'sendMessage', {
        chat_id: parseInt(adminUid),
        text: '🤖 可用命令:\n\n'
            + '/ban <UID> — 拉黑用户 (或回复转发消息发送 /ban)\n'
            + '/unban <UID> — 解封用户 (或回复转发消息发送 /unban)\n'
            + '/banlist /bans — 查看黑名单\n'
            + '/help — 显示此帮助'
    });
}
