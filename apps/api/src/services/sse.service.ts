import { Response } from 'express';
import type { SSEMessage } from '@avith/types';
import { createLogger } from '../lib/core.js';

const log = createLogger('SSE');

// Store connections by orgId
const connections = new Map<string, Set<Response>>();

export function addSSEConnection(orgId: string, res: Response) {
    if (!connections.has(orgId)) {
        connections.set(orgId, new Set());
    }
    connections.get(orgId)!.add(res);
    log.info('Client connected', { orgId, total: connections.get(orgId)!.size });
}

export function removeSSEConnection(orgId: string, res: Response) {
    const orgConnections = connections.get(orgId);
    if (orgConnections) {
        orgConnections.delete(res);
        if (orgConnections.size === 0) {
            connections.delete(orgId);
        }
        log.info('Client disconnected', { orgId });
    }
}

export function broadcastBookingUpdate(orgId: string, message: SSEMessage) {
    const orgConnections = connections.get(orgId);
    if (!orgConnections || orgConnections.size === 0) {
        return;
    }

    const data = `data: ${JSON.stringify(message)}\n\n`;

    for (const res of orgConnections) {
        try {
            res.write(data);
        } catch (err) {
            log.error('Failed to send SSE message', { error: (err as Error).message });
            orgConnections.delete(res);
        }
    }

    log.debug('Broadcasted', { type: message.type, clientCount: orgConnections.size, orgId });
}

