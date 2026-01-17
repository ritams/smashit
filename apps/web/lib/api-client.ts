import { API_URL } from './config';

interface FetchOptions extends RequestInit {
    userEmail?: string;
    userName?: string;
}

export async function apiClient<T>(
    endpoint: string,
    options: FetchOptions = {}
): Promise<T> {
    const { userEmail, userName, ...fetchOptions } = options;

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(fetchOptions.headers || {}),
    };

    // Add auth headers if provided
    if (userEmail) {
        (headers as Record<string, string>)['x-user-email'] = userEmail;
    }
    if (userName) {
        (headers as Record<string, string>)['x-user-name'] = userName;
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
    createOrg: (data: { name: string; slug: string; adminEmail: string; adminName: string }) =>
        apiClient<any>('/api/orgs', { method: 'POST', body: JSON.stringify(data) }),
    checkSlug: (slug: string) => apiClient<{ available: boolean }>(`/api/orgs/check-slug/${slug}`),

    // Spaces
    getSpaces: (orgSlug: string) => apiClient<any[]>(`/api/orgs/${orgSlug}/spaces`),
    getAvailability: (orgSlug: string, spaceId: string, date: string) =>
        apiClient<any>(`/api/orgs/${orgSlug}/spaces/${spaceId}/availability?date=${date}`),

    // Bookings
    createBooking: (
        orgSlug: string,
        data: { spaceId: string; startTime: string; endTime: string },
        auth: { userEmail: string; userName: string }
    ) =>
        apiClient<any>(`/api/orgs/${orgSlug}/bookings`, {
            method: 'POST',
            body: JSON.stringify(data),
            ...auth,
        }),
    cancelBooking: (orgSlug: string, bookingId: string, auth: { userEmail: string }) =>
        apiClient<any>(`/api/orgs/${orgSlug}/bookings/${bookingId}`, {
            method: 'DELETE',
            ...auth,
        }),
    getMyBookings: (orgSlug: string, auth: { userEmail: string }) =>
        apiClient<any[]>(`/api/orgs/${orgSlug}/bookings/my`, auth),

    // Admin
    getStats: (orgSlug: string, auth: { userEmail: string }) =>
        apiClient<any>(`/api/orgs/${orgSlug}/admin/stats`, auth),
    createSpace: (
        orgSlug: string,
        data: { name: string; description?: string; capacity?: number },
        auth: { userEmail: string }
    ) =>
        apiClient<any>(`/api/orgs/${orgSlug}/admin/spaces`, {
            method: 'POST',
            body: JSON.stringify(data),
            ...auth,
        }),
};
