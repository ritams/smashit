import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import type { SpaceAvailability } from '../types/booking.types';

interface UseSpaceAvailabilityResult {
    data: SpaceAvailability[];
    loading: boolean;
    refetch: () => Promise<void>;
}

/**
 * Hook for fetching space availability data
 * @param orgSlug - Organization slug
 * @param date - Date to fetch availability for
 * @param refreshTrigger - Optional trigger to force refetch
 */
export function useSpaceAvailability(
    orgSlug: string,
    date: Date,
    refreshTrigger?: number
): UseSpaceAvailabilityResult {
    const [data, setData] = useState<SpaceAvailability[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const dateStr = format(date, 'yyyy-MM-dd');
            const res = await api.getAllAvailability(orgSlug, dateStr);
            setData(res);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load spaces');
        } finally {
            setLoading(false);
        }
    }, [orgSlug, date]);

    useEffect(() => {
        fetchData();
    }, [fetchData, refreshTrigger]);

    return { data, loading, refetch: fetchData };
}
