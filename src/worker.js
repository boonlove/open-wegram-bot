/**
 * Open Wegram Bot - Cloudflare Worker Entry Point
 * A two-way private messaging Telegram bot
 *
 * GitHub Repository: https://github.com/wozulong/open-wegram-bot
 */

import {handleRequest} from './core.js';

export default {
    async fetch(request, env, ctx) {
        const config = {
            prefix: env.PREFIX || 'public',
            secretToken: env.SECRET_TOKEN || '',
            chatIdList: (env.CHAT_ID || '').split(',').map(s => s.trim()).filter(Boolean),
            botTokenList: (env.BOT_TOKEN || '').split(',').map(s => s.trim()).filter(Boolean),
            blacklist: (env.BLACKLIST || '').split(',').map(s => s.trim()).filter(Boolean)
        };

        return handleRequest(request, config);
    }
};