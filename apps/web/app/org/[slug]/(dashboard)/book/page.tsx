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
    const initialDate = urlDate ? new Date(urlDate) : startOfToday();

    const [spaces, setSpaces] = useState<Space[]>([]);
    const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(urlCategory);
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

    // Get unique categories from spaces
    const availableCategories = useMemo(() => {
        const types = [...new Set(spaces.map(s => s.type))];
        return types.filter(t => t in SPACE_TYPES).sort();
    }, [spaces]);

    // Set default category when spaces load
    useEffect(() => {
        if (availableCategories.length > 0 && !selectedCategory) {
            setSelectedCategory(availableCategories[0]);
        }
    }, [availableCategories, selectedCategory]);

    // Sync state to URL
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const newDate = format(selectedDate, 'yyyy-MM-dd');
        const currentDate = params.get('date');
        const currentCategory = params.get('category');

        let changed = false;
        if (currentDate !== newDate) {
            params.set('date', newDate);
            changed = true;
        }
        if (selectedCategory && currentCategory !== selectedCategory) {
            params.set('category', selectedCategory);
            changed = true;
        }
        if (changed) {
            router.replace(`?${params.toString()}`, { scroll: false });
        }
    }, [selectedDate, selectedCategory, router]);

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

    // Fetch spaces
    const fetchSpaces = useCallback(async () => {
        try {
            setAccessDenied(false);
            const data = await api.getSpaces(orgSlug);
            setSpaces(data);
            if (data.length > 0 && !selectedSpace) {
                setSelectedSpace(data[0]);
                setMobileSelectedSpace(data[0]);
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
        fetchSpaces();
    }, [fetchSpaces]);

    // SSE for real-time updates
    const handleSSEMessage = useCallback((msg: any) => {
        if (msg.type === 'BOOKING_CREATED' || msg.type === 'BOOKING_CANCELLED' || msg.type === 'SPACE_UPDATED') {
            if (msg.type === 'SPACE_UPDATED') {
                fetchSpaces();
            }
            setAllSpacesRefreshKey(prev => prev + 1);
        }
    }, [fetchSpaces]);

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
            <DateSelector
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                viewDate={viewDate}
                onViewDateChange={setViewDate}
                weekDates={weekDates}
            />

            {/* Mobile Categories - Pills (Kept here as it's often contextual to the layout below date) */}
            <div className="md:hidden pb-2">
                {/* Mobile View Controls Container */}
                {availableCategories.length > 0 && (
                    <div className="w-full overflow-x-auto no-scrollbar px-4 pb-1">
                        <div className="flex items-center gap-2">
                            {availableCategories.map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setSelectedCategory(type === selectedCategory ? null : type)}
                                    className={cn(
                                        "flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap",
                                        selectedCategory === type
                                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                            : "bg-background border-border text-muted-foreground"
                                    )}
                                >
                                    {SPACE_TYPES[type as SpaceType]?.label || type}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="hidden md:block w-full">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-4 mb-4">
                    {/* Category Tabs (Desktop) */}
                    {/* Moved Category logic to stay near where it was used, or can be extracted further */}
                    <div className="flex-1"></div> {/* Spacer if needed or just align right */}

                    {availableCategories.length > 0 && (
                        <div className="flex items-center gap-8 mr-1 border-b border-border/50 pb-2">
                            {(() => {
                                const MAX_VISIBLE = 5;
                                const showMore = availableCategories.length > MAX_VISIBLE;
                                const visible = showMore ? availableCategories.slice(0, MAX_VISIBLE) : availableCategories;
                                const hidden = showMore ? availableCategories.slice(MAX_VISIBLE) : [];
                                const isHiddenSelected = selectedCategory && hidden.includes(selectedCategory);

                                return (
                                    <>
                                        {visible.map((type) => {
                                            const config = SPACE_TYPES[type as SpaceType];
                                            const isActive = selectedCategory === type;
                                            return (
                                                <button
                                                    key={type}
                                                    onClick={() => setSelectedCategory(type)}
                                                    className={cn(
                                                        'text-sm font-medium transition-all pb-1 whitespace-nowrap',
                                                        isActive
                                                            ? 'text-primary border-b-2 border-primary'
                                                            : 'text-muted-foreground hover:text-foreground border-b-2 border-transparent'
                                                    )}
                                                >
                                                    {config?.label || type}
                                                </button>
                                            );
                                        })}

                                        {hidden.length > 0 && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button
                                                        className={cn(
                                                            'text-sm font-medium transition-all pb-1 flex items-center gap-1',
                                                            isHiddenSelected
                                                                ? 'text-primary border-b-2 border-primary'
                                                                : 'text-muted-foreground hover:text-foreground border-b-2 border-transparent'
                                                        )}
                                                    >
                                                        More
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {hidden.map((type) => (
                                                        <DropdownMenuItem
                                                            key={type}
                                                            onClick={() => setSelectedCategory(type)}
                                                            className={cn(selectedCategory === type && "bg-muted")}
                                                        >
                                                            {SPACE_TYPES[type as SpaceType]?.label || type}
                                                        </DropdownMenuItem>
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    )}
                </div>
            </div>


            {/* Main Content - All Spaces Grid */}
            <div className="flex-1 overflow-hidden w-full">
                <AllSpacesView
                    date={selectedDate}
                    orgSlug={orgSlug}
                    spaceType={selectedCategory || undefined}
                    categoryName={selectedCategory ? (SPACE_TYPES[selectedCategory as SpaceType]?.label || selectedCategory) : undefined}
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
