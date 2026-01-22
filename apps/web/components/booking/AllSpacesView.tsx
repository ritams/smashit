'use client';

import { useMemo } from 'react';
import { startOfDay, addHours, isSameDay, isBefore } from 'date-fns';
import { useSession } from 'next-auth/react';
import { AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { BookingGrid } from './BookingGrid';
import { MobileBookingView } from './MobileBookingView';
import { useSpaceAvailability } from './hooks/useSpaceAvailability';
import type { AllSpacesViewProps, ColumnDef, SpaceAvailability } from './types/booking.types';

/**
 * Main booking view component - orchestrates grid and mobile views
 * Handles data fetching, filtering, and time row generation
 */
export function AllSpacesView({
    date,
    orgSlug,
    onBook,
    onCancel,
    refreshTrigger,
    spaceType,
    categoryName,
    viewMode = 'ALL',
    mobileSelectedSpaceId
}: AllSpacesViewProps) {
    const { data: session } = useSession();
    const { data, loading } = useSpaceAvailability(orgSlug, date, refreshTrigger);

    // Filter data by space type if provided
    const filteredData = useMemo(() => {
        let result = spaceType ? data.filter(d => d.space.type === spaceType) : data;

        // Filter for Single View Mode
        if (viewMode === 'SINGLE' && mobileSelectedSpaceId) {
            result = result.filter(d => d.space.id === mobileSelectedSpaceId);
        }

        return result;
    }, [data, spaceType, viewMode, mobileSelectedSpaceId]);

    // Generate time rows
    const timeRows = useMemo(() => {
        const now = new Date();
        const rows: Date[] = [];
        const baseDate = startOfDay(date);
        const isToday = isSameDay(date, now);
        const openingHour = 6;
        const endHour = 22;
        const startHour = isToday ? Math.max(now.getHours(), openingHour) : openingHour;

        for (let h = startHour; h < endHour; h++) {
            const rowTime = addHours(baseDate, h);
            if (!isToday || !isBefore(rowTime, now)) {
                rows.push(rowTime);
            }
        }
        return rows;
    }, [date]);

    // Build columns for grid
    const { columns, spaceGroups } = useMemo(() => {
        const cols: ColumnDef[] = [];

        filteredData.forEach((item) => {
            const configuredSlots = item.space.slots?.length > 0
                ? item.space.slots
                : Array.from({ length: item.space.capacity }, (_, i) => ({
                    id: `legacy-${i}`,
                    name: `${i + 1}`,
                    number: i + 1,
                    isActive: true
                }));

            configuredSlots.forEach((subSlot, idx) => {
                cols.push({
                    space: item.space,
                    subSlot,
                    subSlotIndex: idx
                });
            });
        });

        const groups = filteredData.map((item) => ({
            space: item.space,
            colSpan: item.space.slots?.length > 0 ? item.space.slots.length : item.space.capacity
        }));

        return { columns: cols, spaceGroups: groups };
    }, [filteredData]);

    // Loading state
    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="space-y-4 w-full max-w-4xl">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-[400px] w-full" />
                </div>
            </div>
        );
    }

    // Empty state
    if (filteredData.length === 0) {
        if (viewMode === 'SINGLE' && !mobileSelectedSpaceId) {
            return <div className="p-8 text-center text-muted-foreground">Select a space to view availability</div>;
        }
        return (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <AlertCircle className="h-8 w-8 mb-3" />
                <p className="text-lg font-medium">No {categoryName ? categoryName.toLowerCase() + ' ' : ''}spaces available</p>
                <p className="text-sm">Contact your administrator to set up booking spaces.</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Legend - Desktop only */}
            <Legend />

            {/* Desktop Grid */}
            <BookingGrid
                data={filteredData}
                timeRows={timeRows}
                columns={columns}
                spaceGroups={spaceGroups}
                currentUserEmail={session?.user?.email ?? undefined}
                onBook={onBook}
                onCancel={onCancel}
            />

            {/* Mobile View */}
            <MobileBookingView
                data={filteredData}
                timeRows={timeRows}
                currentUserEmail={session?.user?.email ?? undefined}
                viewMode={viewMode}
                onBook={onBook}
                onCancel={onCancel}
            />
        </div>
    );
}

/** Booking legend for desktop */
function Legend() {
    return (
        <div className="hidden md:flex flex-shrink-0 items-center gap-6 text-sm pb-4">
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded border border-border bg-background" />
                <span className="text-muted-foreground text-xs">Available</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded border border-primary/30 bg-primary/10" />
                <span className="text-muted-foreground text-xs">My booking</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded border border-border bg-muted" />
                <span className="text-muted-foreground text-xs">Booked</span>
            </div>
        </div>
    );
}
