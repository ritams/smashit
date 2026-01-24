"use client";

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useSession } from 'next-auth/react';
import { API_URL } from '@/lib/config';

export function useUser() {
    const { data: session, status } = useSession();

    // Fetch fresh user data from API if session exists
    const { data: dbUser, isLoading: isUserLoading } = useQuery({
        queryKey: ['user', session?.user?.email],
        queryFn: api.getMe,
        enabled: !!session?.user?.email,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const fixImageUrl = (url?: string | null) => {
        if (url && !url.startsWith('http')) {
            return `${API_URL}${url}`;
        }
        return url;
    };

    const user = dbUser ? {
        ...dbUser,
        image: fixImageUrl(dbUser.avatarUrl)
    } : (session?.user ? {
        ...session.user,
        image: fixImageUrl(session.user.image)
    } : session?.user);

    return {
        user,
        isLoading: status === 'loading' || (status === 'authenticated' && isUserLoading),
        isAuthenticated: status === 'authenticated'
    };
}
