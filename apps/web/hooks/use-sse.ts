'use client';

import { useEffect, useRef, useCallback } from 'react';

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
}

export function useSSE({ orgSlug, onMessage, onConnect, onError }: UseSSEOptions) {
    const eventSourceRef = useRef<EventSource | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const connect = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const url = `${apiUrl}/api/events?orgSlug=${orgSlug}`;

        const eventSource = new EventSource(url);
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
            console.log('SSE connected');
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
            console.error('SSE error:', error);
            onError?.(error);

            // Attempt to reconnect after 5 seconds
            eventSource.close();
            reconnectTimeoutRef.current = setTimeout(() => {
                connect();
            }, 5000);
        };
    }, [orgSlug, onMessage, onConnect, onError]);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
    }, []);

    useEffect(() => {
        connect();
        return () => disconnect();
    }, [connect, disconnect]);

    return { connect, disconnect };
}
