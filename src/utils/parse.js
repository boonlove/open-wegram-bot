/**
 * 输入校验函数
 */

export function validateSecretToken(token) {
    return token.length > 15 && /[A-Z]/.test(token) && /[a-z]/.test(token) && /[0-9]/.test(token);
}

export function validateChatId(chatId) {
    return chatId.length > 5 && /^-?\d+$/.test(chatId);
}

export function validateBotToken(token) {
    return /^\d{5,12}:[A-Za-z0-9_-]{20,100}$/.test(token);
}
