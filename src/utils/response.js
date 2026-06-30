/**
 * HTTP Response 工具
 */

export function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}

export function okResponse() {
    return new Response('OK');
}

export function unauthorizedResponse() {
    return new Response('Unauthorized', { status: 401 });
}

export function notFoundResponse() {
    return new Response('Not Found', { status: 404 });
}

export function errorResponse(msg, status = 500) {
    return jsonResponse({ success: false, message: msg }, status);
}
