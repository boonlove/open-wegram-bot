/**
 * Cloudflare Worker 入口
 * 读取环境变量 → 构建 config → 路由请求
 */

import { handleRequest } from './core/router.js';
import { buildConfig } from './config/env.js';

export default {
    async fetch(request, env, ctx) {
        const config = buildConfig(env);
        return handleRequest(request, config);
    }
};
