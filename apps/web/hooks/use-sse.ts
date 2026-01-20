'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { API_URL } from '@/lib/config';

interface SSEMessage {
    type: 'CONNECTED' | 'SLOT_UPDATE' | 'BOOKING_CREATED' | 'BOOKING_CANCELLED';
    payload: {
        spaceId?: string;
        date?: string;
        booking?: {
            id: string;
            startTime: string;
            endTime: string;
            userName: string;
        };
    };
}

interface UseSSEOptions {
    orgSlug: string;
    onMessage?: (message: SSEMessage) => void;
    onConnect?: () => void;
    onError?: (error: Event) => void;
    enabled?: boolean;
}

/**
 * Fetch auth token for SSE connection
 */
async function getSSEToken(): Promise<string | null> {
    try {
        const res = await fetch('/api/auth/token');
        if (!res.ok) return null;
        const { token } = await res.json();
        return token || null;
    } catch {
        return null;
    }
}

export function useSSE({ orgSlug, onMessage, onConnect, onError, enabled = true }: UseSSEOptions) {
    const eventSourceRef = useRef<EventSource | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    const connect = useCallback(async () => {
        if (!enabled) return;

        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        // Get auth token for SSE connection
        const token = await getSSEToken();

        if (!token) {
            console.log('SSE: No auth token available, skipping connection');
            setIsConnected(false);
            return;
        }

        const url = `${API_URL}/api/events?orgSlug=${orgSlug}&token=${encodeURIComponent(token)}`;

        const eventSource = new EventSource(url, { withCredentials: true });
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
            console.log('SSE connected');
            setIsConnected(true);
            onConnect?.();
        };

        eventSource.onmessage = (event) => {
            try {
                const message: SSEMessage = JSON.parse(event.data);
                onMessage?.(message);
            } catch (err) {
                console.error('Failed to parse SSE message:', err);
            }
        };

        eventSource.onerror = (error) => {
            // EventSource doesn't give us the status code, but we know it failed
            console.error('SSE connection error:', error);
            setIsConnected(false);
            onError?.(error);

            // Attempt to reconnect after 5 seconds if still enabled
            eventSource.close();
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }

            reconnectTimeoutRef.current = setTimeout(() => {
                if (enabled) {
                    connect();
                }
            }, 5000);
        };
    }, [orgSlug, onMessage, onConnect, onError, enabled]);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        setIsConnected(false);
    }, []);

    useEffect(() => {
        if (enabled) {
            connect();
        } else {
            disconnect();
        }
        return () => disconnect();
    }, [connect, disconnect, enabled]);

    return { connect, disconnect, isConnected };
}

