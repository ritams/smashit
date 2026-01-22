import { API_URL } from './config';

interface FetchOptions extends RequestInit {
    /** If true, adds auth token to request (default: false) */
    auth?: boolean;
}

/**
 * Get session token for authenticated requests
 * This fetches from the next-auth session endpoint
 */
async function getSessionToken(): Promise<string | null> {
    try {
        const res = await fetch('/api/auth/session');
        if (!res.ok) return null;

        const session = await res.json();
        if (!session?.user?.email) return null;

        // Get the JWT token from cookies (next-auth stores it securely)
        // We need to fetch from a special endpoint that returns the raw token
        const tokenRes = await fetch('/api/auth/token');
        if (!tokenRes.ok) return null;

        const { token } = await tokenRes.json();
        return token || null;
    } catch {
        return null;
    }
}

/**
 * Authenticated API client
 * Automatically includes JWT token for authenticated requests
 */
export async function apiClient<T>(
    endpoint: string,
    options: FetchOptions = {}
): Promise<T> {
    const { auth = false, ...fetchOptions } = options;

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(fetchOptions.headers || {}),
    };

    // Add auth token if requested
    if (auth) {
        const token = await getSessionToken();
        if (token) {
            (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
        }
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...fetchOptions,
        headers,
        credentials: 'include', // Include cookies for session
        cache: 'no-store', // Ensure we always get fresh data
    });

    const text = await response.text();
    let data;
    try {
        data = text ? JSON.parse(text) : {};
    } catch (err) {
        console.error('API Response Parse Error:', text);
        throw new Error('Server returned invalid response');
    }

    if (!response.ok) {
        throw new Error(data.error?.message || `Request failed with status ${response.status}`);
    }

    return data.data;
}

// Typed API functions - all authenticated endpoints use auth: true
export const api = {
    // Organization (public read, auth for create)
    getOrg: (slug: string) => apiClient<any>(`/api/orgs/${slug}`),
    createOrg: (data: { name: string; slug: string }) =>
        apiClient<any>('/api/orgs', { method: 'POST', body: JSON.stringify(data), auth: true }),
    checkSlug: (slug: string) => apiClient<{ available: boolean }>(`/api/orgs/check-slug/${slug}`),

    // Spaces (authenticated)
    getSpaces: (orgSlug: string) => apiClient<any[]>(`/api/orgs/${orgSlug}/spaces`, { auth: true }),
    getAvailability: (orgSlug: string, spaceId: string, date: string, timezone?: string) =>
        apiClient<any>(`/api/orgs/${orgSlug}/spaces/${spaceId}/availability?date=${date}${timezone ? `&timezone=${timezone}` : ''}`, { auth: true }),
    getAllAvailability: (orgSlug: string, date: string, timezone?: string) =>
        apiClient<any>(`/api/orgs/${orgSlug}/spaces/all/availability?date=${date}${timezone ? `&timezone=${timezone}` : ''}`, { auth: true }),

    // Bookings (all authenticated)
    createBooking: (orgSlug: string, data: { spaceId: string; startTime: string; endTime: string; slotId?: string; slotIndex?: number; recurrence?: string; recurrenceCount?: number }) =>
        apiClient<any>(`/api/orgs/${orgSlug}/bookings`, { method: 'POST', body: JSON.stringify(data), auth: true }),
    cancelBooking: (orgSlug: string, bookingId: string) =>
        apiClient<any>(`/api/orgs/${orgSlug}/bookings/${bookingId}`, { method: 'DELETE', auth: true }),
    getMyBookings: (orgSlug: string) =>
        apiClient<any[]>(`/api/orgs/${orgSlug}/bookings/my`, { auth: true }),
    getBookings: (orgSlug: string, params?: { spaceId?: string; date?: string }) => {
        const searchParams = new URLSearchParams();
        if (params?.spaceId) searchParams.set('spaceId', params.spaceId);
        if (params?.date) searchParams.set('date', params.date);
        const query = searchParams.toString();
        return apiClient<any[]>(`/api/orgs/${orgSlug}/bookings${query ? `?${query}` : ''}`, { auth: true });
    },

    // User (all authenticated)
    getMe: () => apiClient<any>('/api/users/me', { auth: true }),
    updateMe: (data: { name?: string; phoneNumber?: string; registrationId?: string }) =>
        apiClient<any>('/api/users/me', { method: 'PATCH', body: JSON.stringify(data), auth: true }),
    getMyOrgs: () => apiClient<any[]>('/api/users/me/orgs', { auth: true }),

    // Admin (all authenticated)
    getStats: (orgSlug: string) => apiClient<any>(`/api/orgs/${orgSlug}/admin/stats`, { auth: true }),
    getMembers: (orgSlug: string) => apiClient<any[]>(`/api/orgs/${orgSlug}/admin/members`, { auth: true }),
    createSpace: (orgSlug: string, data: { name: string; description?: string; capacity?: number; type?: string }) =>
        apiClient<any>(`/api/orgs/${orgSlug}/admin/spaces`, { method: 'POST', body: JSON.stringify(data), auth: true }),
    updateSpace: (orgSlug: string, spaceId: string, data: any) =>
        apiClient<any>(`/api/orgs/${orgSlug}/admin/spaces/${spaceId}`, { method: 'PATCH', body: JSON.stringify(data), auth: true }),
    updateSpaceRules: (orgSlug: string, spaceId: string, data: any) =>
        apiClient<any>(`/api/orgs/${orgSlug}/admin/spaces/${spaceId}/rules`, { method: 'PATCH', body: JSON.stringify(data), auth: true }),
    bulkUpdateSpaceRules: (orgSlug: string, data: { spaceIds: string[]; rules: any }) =>
        apiClient<any>(`/api/orgs/${orgSlug}/admin/spaces/rules/bulk`, { method: 'POST', body: JSON.stringify(data), auth: true }),
    deleteSpace: (orgSlug: string, spaceId: string) =>
        apiClient<any>(`/api/orgs/${orgSlug}/admin/spaces/${spaceId}`, { method: 'DELETE', auth: true }),

    // Access Control
    updateOrgSettings: (orgSlug: string, data: { allowedDomains?: string[]; allowedEmails?: string[] }) =>
        apiClient<any>(`/api/orgs/${orgSlug}/admin/settings`, { method: 'PATCH', body: JSON.stringify(data), auth: true }),
};

