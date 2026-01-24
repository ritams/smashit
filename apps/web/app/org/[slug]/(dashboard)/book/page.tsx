'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { format, addDays, startOfToday, startOfDay, endOfDay, isBefore, isAfter } from 'date-fns';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api-client';
import { AllSpacesView } from '@/components/booking/AllSpacesView';
import { useSSE } from '@/hooks/use-sse';
import { SpaceType, SPACE_TYPES } from '@/lib/constants';
import { BookingDialog, BookingSlotInfo } from '@/components/booking/BookingDialog';
import { CancelBookingDialog, CancelBookingInfo } from '@/components/booking/CancelBookingDialog';
import { DateSelector } from '@/components/booking/DateSelector';

interface Space {
    id: string;
    name: string;
    description: string | null;
    capacity: number;
    isActive: boolean;
    type: string;
}

interface Booking {
    id: string;
    startTime: string;
    endTime: string;
    userId: string;
    userName: string;
    userEmail: string;
    slotIndex?: number;
    slotId?: string;
}

interface TimeSlot {
    hour: number;
    startTime: Date;
    endTime: Date;
    bookings: Booking[];
}

export default function BookPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { data: session } = useSession();
    const orgSlug = params.slug as string;

    const urlDate = searchParams.get('date');
    const urlCategory = searchParams.get('category');
    const urlFacilityId = searchParams.get('facilityId');
    const initialDate = urlDate ? new Date(urlDate) : startOfToday();

    const [facilities, setFacilities] = useState<any[]>([]);
    const [spaces, setSpaces] = useState<Space[]>([]);
    const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
    const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(urlFacilityId);
    const [loadingSpaces, setLoadingSpaces] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [viewDate, setViewDate] = useState<Date>(initialDate);
    const [allSpacesRefreshKey, setAllSpacesRefreshKey] = useState(0);
    const [accessDenied, setAccessDenied] = useState(false);

    // View State
    const [viewMode, setViewMode] = useState<'ALL' | 'SINGLE'>('ALL'); // 'ALL' | 'SINGLE'
    const [mobileSelectedSpace, setMobileSelectedSpace] = useState<Space | null>(null);

    // Booking dialog state
    const [bookingInfo, setBookingInfo] = useState<BookingSlotInfo | null>(null);
    const [isBooking, setIsBooking] = useState(false);
    const [recurrence, setRecurrence] = useState<'NONE' | 'DAILY' | 'WEEKLY'>('NONE');
    const [recurrenceCount, setRecurrenceCount] = useState('10');
    const [isAdmin, setIsAdmin] = useState(false);


    // Cancel dialog state
    const [cancelInfo, setCancelInfo] = useState<CancelBookingInfo | null>(null);
    const [isCanceling, setIsCanceling] = useState(false);

    // Set default facility when loaded
    useEffect(() => {
        if (facilities.length > 0 && !selectedFacilityId) {
            setSelectedFacilityId(facilities[0].id);
        }
    }, [facilities, selectedFacilityId]);

    // Sync state to URL
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const newDate = format(selectedDate, 'yyyy-MM-dd');
        const currentDate = params.get('date');
        const currentFacilityId = params.get('facilityId');

        let changed = false;
        if (currentDate !== newDate) {
            params.set('date', newDate);
            changed = true;
        }
        if (selectedFacilityId && currentFacilityId !== selectedFacilityId) {
            params.set('facilityId', selectedFacilityId);
            changed = true;
        }
        if (changed) {
            router.replace(`?${params.toString()}`, { scroll: false });
        }
    }, [selectedDate, selectedFacilityId, router]);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Handle date change - shift week view if needed
    const [prevSelectedDate, setPrevSelectedDate] = useState(selectedDate);
    if (selectedDate !== prevSelectedDate) {
        setPrevSelectedDate(selectedDate);
        const weekStart = startOfDay(viewDate);
        const weekEnd = endOfDay(addDays(viewDate, 6));
        if (isBefore(selectedDate, weekStart) || isAfter(selectedDate, weekEnd)) {
            setViewDate(selectedDate);
        }
    }

    const weekDates = Array.from({ length: 7 }, (_, i) => addDays(viewDate, i));

    // Fetch data
    const fetchData = useCallback(async () => {
        try {
            setAccessDenied(false);
            // Fetch facilities and spaces independently to prevent one failure from blocking the other
            try {
                const facilitiesData = await api.getFacilities(orgSlug);
                setFacilities(facilitiesData);
            } catch (err) {
                console.error('Failed to fetch facilities:', err);
                toast.error('Could not load facilities');
            }

            try {
                const spacesData = await api.getSpaces(orgSlug);
                setSpaces(spacesData);
            } catch (err: any) {
                console.error('Failed to fetch spaces:', err);
                // Don't show toast for every error to avoid spam, relying on SSE/AllSpacesView for critical data
            }

            // Check if admin
            try {
                const myOrgs = await api.getMyOrgs();
                const currentOrg = myOrgs.find((o: any) => o.slug === orgSlug);
                if (currentOrg?.role === 'ADMIN') {
                    setIsAdmin(true);
                }
            } catch (ignore) { }

        } catch (err: any) {
            // Check for access denied error from backend
            if (err.message && (
                err.message.includes('Access denied') ||
                err.message.includes('not allowed in this organization') ||
                err.message.includes('status 403')
            )) {
                setAccessDenied(true);
                router.replace(`/org/${orgSlug}/access-denied`);
                return;
            }

            console.error('Failed to fetch spaces:', err);
        }
        setLoadingSpaces(false);
    }, [orgSlug, selectedSpace]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // SSE for real-time updates
    const handleSSEMessage = useCallback((msg: any) => {
        if (msg.type === 'BOOKING_CREATED' || msg.type === 'BOOKING_CANCELLED' || msg.type === 'SPACE_UPDATED') {
            if (msg.type === 'SPACE_UPDATED') {
                fetchData();
            }
            setAllSpacesRefreshKey(prev => prev + 1);
        }
    }, [fetchData]);

    useSSE({
        orgSlug,
        onMessage: handleSSEMessage,
        enabled: !!session && !accessDenied,
    });

    // Handle booking
    const handleBook = async () => {
        if (!bookingInfo || !selectedSpace || !session?.user?.email) return;

        setIsBooking(true);
        try {
            await api.createBooking(orgSlug, {
                spaceId: selectedSpace.id,
                startTime: bookingInfo.slot.startTime.toISOString(),
                endTime: bookingInfo.slot.endTime.toISOString(),
                slotIndex: bookingInfo.index,
                slotId: bookingInfo.slotId,
                recurrence,
                recurrenceCount: recurrence !== 'NONE' ? parseInt(recurrenceCount) : undefined,
            });

            toast.success('Booking confirmed');
            setBookingInfo(null);
            setAllSpacesRefreshKey(prev => prev + 1);
        } catch (err: any) {
            toast.error('Booking failed', { description: err.message });
        }
        setIsBooking(false);
    };

    // Handle cancellation
    const handleCancel = async () => {
        if (!cancelInfo || !session?.user?.email) return;

        setIsCanceling(true);
        try {
            await api.cancelBooking(orgSlug, cancelInfo.booking.id);
            toast.success('Booking cancelled');
            setCancelInfo(null);
            setAllSpacesRefreshKey(prev => prev + 1);
        } catch (err: any) {
            toast.error('Cancellation failed', { description: err.message });
        }
        setIsCanceling(false);
    };

    if (loadingSpaces) {
        return (
            <div className="h-[calc(100vh-120px)] flex items-center justify-center">
                <div className="space-y-4 w-full max-w-4xl px-4">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-[400px] w-full" />
                </div>
            </div>
        );
    }

    if (!mounted) return null;

    if (accessDenied) {
        return null; // Redirecting...
    }

    return (
        <div className="h-full flex flex-col">
            {/* Unified Sticky Header */}
            <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/40 py-2 mb-4">
                <div className="w-full px-4 md:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4">

                    {/* Date Selector (Left) */}
                    <div className="flex-shrink-0">
                        <DateSelector
                            selectedDate={selectedDate}
                            onSelectDate={setSelectedDate}
                            viewDate={viewDate}
                            onViewDateChange={setViewDate}
                            weekDates={weekDates}
                        />
                    </div>

                    {/* Facilities (Right) - Desktop */}
                    <div className="hidden md:flex items-center justify-end gap-1 min-w-0 flex-1 pl-4">
                        {facilities.slice(0, 4).map((fac) => {
                            const isActive = selectedFacilityId === fac.id;
                            return (
                                <button
                                    key={fac.id}
                                    onClick={() => setSelectedFacilityId(fac.id)}
                                    className={cn(
                                        "relative px-3 py-1.5 rounded-md text-sm transition-all duration-200",
                                        isActive
                                            ? "text-primary font-semibold bg-primary/5"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                    )}
                                >
                                    {fac.name}
                                    {isActive && (
                                        <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-primary rounded-full" />
                                    )}
                                </button>
                            );
                        })}

                        {facilities.length > 4 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        className={cn(
                                            "flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ml-1",
                                            facilities.slice(4).some(f => f.id === selectedFacilityId)
                                                ? "text-primary bg-primary/5"
                                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                        )}
                                    >
                                        More
                                        <span className="text-[10px] ml-0.5">▼</span>
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    {facilities.slice(4).map((fac) => (
                                        <DropdownMenuItem
                                            key={fac.id}
                                            onClick={() => setSelectedFacilityId(fac.id)}
                                            className={cn(
                                                "cursor-pointer",
                                                selectedFacilityId === fac.id && "bg-primary/5 text-primary font-medium"
                                            )}
                                        >
                                            {fac.name}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>

                    {/* Mobile Facilities - Dropdown / Horizontal Scroll fallback */}
                    <div className="md:hidden w-full overflow-x-auto no-scrollbar pb-1">
                        <div className="flex items-center gap-2">
                            {facilities.map((fac) => (
                                <button
                                    key={fac.id}
                                    onClick={() => setSelectedFacilityId(fac.id)}
                                    className={cn(
                                        "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap",
                                        selectedFacilityId === fac.id
                                            ? "bg-primary/10 border-primary/20 text-primary"
                                            : "bg-background border-border text-muted-foreground"
                                    )}
                                >
                                    {fac.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>


            {/* Main Content - All Spaces Grid */}
            <div className="flex-1 overflow-hidden w-full">
                <AllSpacesView
                    date={selectedDate}
                    orgSlug={orgSlug}
                    facilityId={selectedFacilityId || undefined}
                    refreshTrigger={allSpacesRefreshKey}
                    viewMode={viewMode}
                    mobileSelectedSpaceId={mobileSelectedSpace?.id}
                    onBook={({ space, slotRaw, subSlot, idx }) => {
                        // Find full space from loaded spaces array
                        const fullSpace = spaces.find(s => s.id === space.id);
                        if (fullSpace) setSelectedSpace(fullSpace);
                        setBookingInfo({
                            slot: {
                                // hour: new Date(slotRaw.startTime).getHours(),
                                startTime: new Date(slotRaw.startTime),
                                endTime: new Date(slotRaw.endTime),
                                // bookings: slotRaw.bookings || []
                            },
                            slotId: subSlot.id,
                            slotName: subSlot.name,
                            index: idx
                        });
                    }}
                    onCancel={({ booking, slot, space }) => {
                        // Find full space from loaded spaces array
                        const fullSpace = spaces.find(s => s.id === space.id);
                        if (fullSpace) setSelectedSpace(fullSpace);
                        setCancelInfo({
                            booking: {
                                ...booking,
                                startTime: booking.startTime,
                                endTime: booking.endTime
                            },
                            slot: {
                                startTime: new Date(slot.startTime),
                                endTime: new Date(slot.endTime),
                            }
                        });
                    }}
                />
            </div>

            <BookingDialog
                open={!!bookingInfo}
                onOpenChange={(v) => !v && setBookingInfo(null)}
                bookingInfo={bookingInfo}
                spaceName={selectedSpace?.name}
                isAdmin={isAdmin}
                isBooking={isBooking}
                onConfirm={handleBook}
                recurrence={recurrence}
                setRecurrence={setRecurrence}
                recurrenceCount={recurrenceCount}
                setRecurrenceCount={setRecurrenceCount}
            />

            <CancelBookingDialog
                open={!!cancelInfo}
                onOpenChange={(v) => !v && setCancelInfo(null)}
                cancelInfo={cancelInfo}
                spaceName={selectedSpace?.name}
                isCanceling={isCanceling}
                onConfirm={handleCancel}
            />
        </div>
    );
}
