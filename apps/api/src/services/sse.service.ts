import { Response } from 'express';
import type { SSEMessage } from '@smashit/types';

// Store connections by orgId
const connections = new Map<string, Set<Response>>();

export function addSSEConnection(orgId: string, res: Response) {
    if (!connections.has(orgId)) {
        connections.set(orgId, new Set());
    }
    connections.get(orgId)!.add(res);

    console.log(`📡 SSE client connected for org: ${orgId} (${connections.get(orgId)!.size} total)`);
}

export function removeSSEConnection(orgId: string, res: Response) {
    const orgConnections = connections.get(orgId);
    if (orgConnections) {
        orgConnections.delete(res);
        if (orgConnections.size === 0) {
            connections.delete(orgId);
        }
        console.log(`📡 SSE client disconnected for org: ${orgId}`);
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
            console.error('Failed to send SSE message:', err);
            orgConnections.delete(res);
        }
    }

    console.log(`📤 Broadcasted ${message.type} to ${orgConnections.size} clients for org: ${orgId}`);
}
