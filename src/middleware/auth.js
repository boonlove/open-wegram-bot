/**
 * 鉴权中间件
 */

import { ROLE_ADMIN, resolveRole } from '../config/permissions.js';

export function isAdmin(uid, config) {
    return config.adminUid === uid;
}

export function isOwner(uid, ownerUid) {
    return uid === ownerUid;
}

export function isAdminMessage(message, config) {
    return config.adminUid === message?.chat?.id?.toString();
}

export function isOwnerMessage(message, ownerUid) {
    return ownerUid === message?.chat?.id?.toString();
}

export function requireRole(message, ownerUid, config, minRole) {
    const role = resolveRole(message?.chat?.id?.toString(), ownerUid, config);
    if (minRole === ROLE_ADMIN) return role === ROLE_ADMIN;
    return true;
}
