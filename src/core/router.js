/**
 * HTTP 请求路由
 * 按 URL 路径分发到 install / uninstall / webhook
 */

import { handleInstall, handleUninstall } from '../handlers/admin.js';
import { handleWebhook } from './dispatcher.js';

export async function handleRequest(request, config) {
    const { prefix } = config;

    const url = new URL(request.url);
    const path = url.pathname;

    const INSTALL_PATTERN = new RegExp(`^/${prefix}/install/([^/]+)/([^/]+)$`);
    const UNINSTALL_PATTERN = new RegExp(`^/${prefix}/uninstall/([^/]+)$`);
    const WEBHOOK_PATTERN = new RegExp(`^/${prefix}/webhook/([^/]+)/([^/]+)$`);

    let match;

    if (match = path.match(INSTALL_PATTERN)) {
        return handleInstall(request, match[1], match[2], prefix, config.secretToken, config);
    }

    if (match = path.match(UNINSTALL_PATTERN)) {
        return handleUninstall(match[1], config.secretToken, config);
    }

    if (match = path.match(WEBHOOK_PATTERN)) {
        return handleWebhook(request, match[1], match[2], config);
    }

    return new Response('Not Found', { status: 404 });
}
