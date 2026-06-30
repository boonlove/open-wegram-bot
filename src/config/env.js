/**
 * 环境变量 → 统一 config 对象
 */

export function buildConfig(env) {
    return {
        prefix: env.PREFIX || 'public',
        secretToken: env.SECRET_TOKEN || '',
        adminUid: env.ADMIN || '',
        adminBotToken: env.BOT_TOKEN || '',
        blacklist: (env.BLACKLIST || '').split(',').map(s => s.trim()).filter(Boolean),
        kv: env.KV
    };
}
