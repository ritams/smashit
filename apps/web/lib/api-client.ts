import { API_URL } from './config';

interface FetchOptions extends RequestInit {
    /** If true, adds auth token to request (default: false) */
    auth?: boolean;
}

/**
 * Token management
 * We cache the token in memory to avoid fetching it before every single request.
 * This turns a 3-round-trip operation into a 1-round-trip operation for most requests.
 */
let cachedToken: string | null = null;
let tokenExpiry: number = 0;
const TOKEN_REFRESH_BUFFER = 60 * 1000; // Refresh 1 minute before expiry (approximate)

/**
 * Get session token for authenticated requests
 * Uses memory cache first, then fetches from the next-auth session endpoint
 */
async function getSessionToken(): Promise<string | null> {
    // Return cached token if valid
    const now = Date.now();
    if (cachedToken && now < tokenExpiry) {
        return cachedToken;
    }

    try {
        const res = await fetch('/api/auth/session');
        if (!res.ok) {
            console.error('[API Client] Session check failed:', res.status);
            cachedToken = null;
            return null;
        }

        const session = await res.json();
        if (!session?.user?.email) {
            console.warn('[API Client] No active session found');
            cachedToken = null;
            return null;
        }

        const tokenRes = await fetch('/api/auth/token');
        if (!tokenRes.ok) {
            console.error('[API Client] Token fetch failed:', tokenRes.status);
            cachedToken = null;
            return null;
        }

        const { token } = await tokenRes.json();

        if (token) {
            console.log('[API Client] Token successfully obtained');
            cachedToken = token;
            tokenExpiry = now + (5 * 60 * 1000);
            return token;
        }

        console.warn('[API Client] Session exists but token is null');
        return null;
    } catch (err) {
        console.error('[API Client] Error in getSessionToken:', err);
        cachedToken = null;
        return null;
    }
}

/**
 * Clear the cached token
 * Call this on logout or 401
 */
export function clearTokenCache() {
    cachedToken = null;
    tokenExpiry = 0;
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
        // Removed default 'no-store' to allow Next.js caching where appropriate
        // Pass cache: 'no-store' explicitly in options if you need fresh data
    });

    // Handle unauthorized - clear cache so next request tries to refresh
    if (response.status === 401) {
        clearTokenCache();
    }

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

    // Facilities (authenticated)
    getFacilities: (orgSlug: string) => apiClient<any[]>(`/api/orgs/${orgSlug}/facilities`, { auth: true }),

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

    // Admin Facilities
    getAdminFacilities: (orgSlug: string) => apiClient<any[]>(`/api/orgs/${orgSlug}/admin/facilities`, { auth: true }),
    createFacility: (orgSlug: string, data: any) =>
        apiClient<any>(`/api/orgs/${orgSlug}/admin/facilities`, { method: 'POST', body: JSON.stringify(data), auth: true }),
    updateFacility: (orgSlug: string, facilityId: string, data: any) =>
        apiClient<any>(`/api/orgs/${orgSlug}/admin/facilities/${facilityId}`, { method: 'PATCH', body: JSON.stringify(data), auth: true }),
    updateFacilityRules: (orgSlug: string, facilityId: string, data: any) =>
        apiClient<any>(`/api/orgs/${orgSlug}/admin/facilities/${facilityId}/rules`, { method: 'PATCH', body: JSON.stringify(data), auth: true }),
    deleteFacility: (orgSlug: string, facilityId: string) =>
        apiClient<any>(`/api/orgs/${orgSlug}/admin/facilities/${facilityId}`, { method: 'DELETE', auth: true }),

    // Admin Spaces
    createSpace: (orgSlug: string, data: { name: string; facilityId: string; capacity?: number }) =>
        apiClient<any>(`/api/orgs/${orgSlug}/admin/spaces`, { method: 'POST', body: JSON.stringify(data), auth: true }),
    updateSpace: (orgSlug: string, spaceId: string, data: any) =>
        apiClient<any>(`/api/orgs/${orgSlug}/admin/spaces/${spaceId}`, { method: 'PATCH', body: JSON.stringify(data), auth: true }),
    deleteSpace: (orgSlug: string, spaceId: string) =>
        apiClient<any>(`/api/orgs/${orgSlug}/admin/spaces/${spaceId}`, { method: 'DELETE', auth: true }),


    // Access Control
    updateOrgSettings: (orgSlug: string, data: { allowedDomains?: string[]; allowedEmails?: string[] }) =>
        apiClient<any>(`/api/orgs/${orgSlug}/admin/settings`, { method: 'PATCH', body: JSON.stringify(data), auth: true }),
};

