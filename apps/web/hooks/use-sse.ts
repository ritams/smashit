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
    const reconnectAttemptsRef = useRef(0);
    const [isConnected, setIsConnected] = useState(false);

    // Use refs for callbacks to avoid reconnections when they change
    const callbacksRef = useRef({ onMessage, onConnect, onError });
    useEffect(() => {
        callbacksRef.current = { onMessage, onConnect, onError };
    }, [onMessage, onConnect, onError]);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        if (eventSourceRef.current) {
            console.log('SSE: Disconnecting...');
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        setIsConnected(false);
    }, []);

    const connect = useCallback(async () => {
        if (!enabled) return;

        // Clean up any existing connection first
        disconnect();

        // Get auth token for SSE connection
        const token = await getSSEToken();

        if (!token) {
            console.warn('SSE: No auth token available, skipping connection');
            setIsConnected(false);
            return;
        }

        const url = `${API_URL}/api/events?orgSlug=${orgSlug}&token=${encodeURIComponent(token)}`;
        console.log('SSE: Connecting to', url.split('token=')[0] + 'token=***');

        try {
            const eventSource = new EventSource(url, { withCredentials: true });
            eventSourceRef.current = eventSource;

            eventSource.onopen = () => {
                console.log('SSE: Connected successfully');
                setIsConnected(true);
                reconnectAttemptsRef.current = 0; // Reset attempts on success
                callbacksRef.current.onConnect?.();
            };

            eventSource.onmessage = (event) => {
                try {
                    const message: SSEMessage = JSON.parse(event.data);
                    callbacksRef.current.onMessage?.(message);
                } catch (err) {
                    console.error('SSE: Failed to parse message:', err);
                }
            };

            eventSource.onerror = (error) => {
                // EventSource doesn't give us the status code, but we know it failed
                console.error('SSE: Connection error occurred');
                setIsConnected(false);
                callbacksRef.current.onError?.(error);

                // Attempt to reconnect if still enabled
                eventSource.close();

                if (!enabled) return;

                // Exponential backoff: 2s, 4s, 8s, 16s, max 30s
                const delay = Math.min(Math.pow(2, reconnectAttemptsRef.current) * 1000 + (Math.random() * 1000), 30000);
                reconnectAttemptsRef.current++;

                console.log(`SSE: Reconnecting in ${Math.round(delay / 1000)}s (attempt ${reconnectAttemptsRef.current})...`);

                if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = setTimeout(() => {
                    if (enabled) {
                        connect();
                    }
                }, delay);
            };
        } catch (err) {
            console.error('SSE: Failed to initialize EventSource:', err);
            setIsConnected(false);
        }
    }, [orgSlug, enabled, disconnect]);

    useEffect(() => {
        if (enabled) {
            connect();
        } else {
            disconnect();
        }
        return () => disconnect();
    }, [orgSlug, enabled, connect, disconnect]);

    return { connect, disconnect, isConnected };
}
