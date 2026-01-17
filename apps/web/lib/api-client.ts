const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface FetchOptions extends RequestInit {
    userId?: string;
    userEmail?: string;
}

export async function apiClient<T>(
    endpoint: string,
    options: FetchOptions = {}
): Promise<T> {
    const { userId, userEmail, ...fetchOptions } = options;

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(fetchOptions.headers || {}),
    };

    // Add auth headers if provided
    if (userId) {
        (headers as Record<string, string>)['x-user-id'] = userId;
    }
    if (userEmail) {
        (headers as Record<string, string>)['x-user-email'] = userEmail;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...fetchOptions,
        headers,
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error?.message || 'An error occurred');
    }

    return data.data;
}

// Typed API functions
export const api = {
    // Organization
    getOrg: (slug: string) => apiClient<any>(`/api/orgs/${slug}`),
    createOrg: (data: { name: string; slug: string; timezone?: string }) =>
        apiClient<any>('/api/orgs', { method: 'POST', body: JSON.stringify(data) }),
    checkSlug: (slug: string) => apiClient<{ available: boolean }>(`/api/orgs/check-slug/${slug}`),

    // Spaces
    getSpaces: (orgSlug: string) => apiClient<any[]>(`/api/orgs/${orgSlug}/spaces`),
    getSpace: (orgSlug: string, spaceId: string) =>
        apiClient<any>(`/api/orgs/${orgSlug}/spaces/${spaceId}`),
    getAvailability: (orgSlug: string, spaceId: string, date: string) =>
        apiClient<any>(`/api/orgs/${orgSlug}/spaces/${spaceId}/availability?date=${date}`),

    // Bookings
    getBookings: (orgSlug: string, params: { spaceId?: string; date?: string; userId?: string }) => {
        const query = new URLSearchParams(params as Record<string, string>).toString();
        return apiClient<any[]>(`/api/orgs/${orgSlug}/bookings?${query}`);
    },
    createBooking: (
        orgSlug: string,
        data: { spaceId: string; startTime: string; endTime: string; participants?: any[]; notes?: string },
        auth: { userId: string; userEmail: string }
    ) =>
        apiClient<any>(`/api/orgs/${orgSlug}/bookings`, {
            method: 'POST',
            body: JSON.stringify(data),
            ...auth,
        }),
    cancelBooking: (orgSlug: string, bookingId: string, auth: { userId: string; userEmail: string }) =>
        apiClient<any>(`/api/orgs/${orgSlug}/bookings/${bookingId}`, {
            method: 'DELETE',
            ...auth,
        }),
    getMyBookings: (orgSlug: string, auth: { userId: string; userEmail: string }) =>
        apiClient<any[]>(`/api/orgs/${orgSlug}/bookings/my`, auth),

    // Admin
    getStats: (orgSlug: string, auth: { userId: string; userEmail: string }) =>
        apiClient<any>(`/api/orgs/${orgSlug}/admin/stats`, auth),
    getUsers: (orgSlug: string, auth: { userId: string; userEmail: string }) =>
        apiClient<any[]>(`/api/orgs/${orgSlug}/admin/users`, auth),
    createSpace: (
        orgSlug: string,
        data: { name: string; description?: string; capacity?: number },
        auth: { userId: string; userEmail: string }
    ) =>
        apiClient<any>(`/api/orgs/${orgSlug}/admin/spaces`, {
            method: 'POST',
            body: JSON.stringify(data),
            ...auth,
        }),
};
