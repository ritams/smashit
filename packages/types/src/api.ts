export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: ApiError;
}

export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}

export interface SSEMessage {
    type: 'SLOT_UPDATE' | 'BOOKING_CREATED' | 'BOOKING_CANCELLED';
    payload: {
        spaceId: string;
        date: string;
        booking?: {
            id: string;
            startTime: string;
            endTime: string;
            userName: string;
        };
    };
}
