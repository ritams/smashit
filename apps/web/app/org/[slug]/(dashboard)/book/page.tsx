'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { format, isBefore, startOfDay, addHours, isSameDay, isAfter, endOfDay, addDays, startOfToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Clock, Loader2, AlertCircle, User, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn, getInitials } from '@/lib/utils';
import { API_URL } from '@/lib/config';
import { AllSpacesView } from '@/components/booking/AllSpacesView';
import { useSSE } from '@/hooks/use-sse';
import { LayoutGrid, List } from 'lucide-react';

interface Slot {
    id: string;
    name: string;
    number: number;
    isActive: boolean;
}

interface Space {
    id: string;
    name: string;
    description: string | null;
    capacity: number;
    isActive: boolean;
    type: string;
    slots?: Slot[];
    rules?: {
        maxAdvanceDays: number;
    };
}

interface Booking {
    id: string;
    startTime: string;
    endTime: string;
    userId: string;
    userName: string;
    userEmail: string;
    userAvatar?: string;
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

    // Read initial state from URL params
    const urlDate = searchParams.get('date');
    const urlView = searchParams.get('view') as 'single' | 'all' | null;
    const initialDate = urlDate ? new Date(urlDate) : startOfToday();

    const [spaces, setSpaces] = useState<Space[]>([]);
    const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
    const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
    const [loadingSpaces, setLoadingSpaces] = useState(true);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [viewMode, setViewMode] = useState<'single' | 'all'>(urlView || 'all');
    const [mounted, setMounted] = useState(false);
    const [viewDate, setViewDate] = useState<Date>(initialDate);

    const [allSpacesRefreshKey, setAllSpacesRefreshKey] = useState(0);

    // Booking dialog state
    const [bookingInfo, setBookingInfo] = useState<{
        slot: TimeSlot;
        slotId: string;
        slotName: string;
        index: number;
    } | null>(null);
    const [isBooking, setIsBooking] = useState(false);

    // Cancel dialog state
    const [cancelInfo, setCancelInfo] = useState<{
        booking: Booking;
        slot: TimeSlot;
    } | null>(null);
    const [isCanceling, setIsCanceling] = useState(false);

    // Sync state to URL for persistence across refresh
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const newDate = format(selectedDate, 'yyyy-MM-dd');
        const currentDate = params.get('date');
        const currentView = params.get('view');

        if (currentDate !== newDate || currentView !== viewMode) {
            params.set('date', newDate);
            params.set('view', viewMode);
            router.replace(`?${params.toString()}`, { scroll: false });
        }
    }, [selectedDate, viewMode, router]);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Only shift the week view if the selected date is outside the visible 7-day range
    // Using a function component approach to avoid dependency on viewDate which causes arrow conflicts
    const handleSelectedDateChange = (date: Date, currentViewDate: Date) => {
        const weekStart = startOfDay(currentViewDate);
        const weekEnd = endOfDay(addDays(currentViewDate, 6));

        // If date is before the current week start or after the week end, shift the view
        if (isBefore(date, weekStart) || isAfter(date, weekEnd)) {
            return date;
        }
        return null; // No change needed
    };

    // Effect that only runs when selectedDate changes (not viewDate)
    const [prevSelectedDate, setPrevSelectedDate] = useState(selectedDate);
    if (selectedDate !== prevSelectedDate) {
        setPrevSelectedDate(selectedDate);
        const newViewDate = handleSelectedDateChange(selectedDate, viewDate);
        if (newViewDate) {
            setViewDate(newViewDate);
        }
    }

    // Generate week dates from viewDate
    const weekDates = Array.from({ length: 7 }, (_, i) => addDays(viewDate, i));

    // Fetch spaces
    useEffect(() => {
        async function fetchSpaces() {
            try {
                const res = await fetch(`${API_URL}/api/orgs/${orgSlug}/spaces`);
                const data = await res.json();
                if (data.success && data.data) {
                    setSpaces(data.data);
                    if (data.data.length > 0) {
                        setSelectedSpace(data.data[0]);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch spaces:', err);
            }
            setLoadingSpaces(false);
        }
        fetchSpaces();
    }, [orgSlug]);

    // Fetch time slots for selected space and date
    const fetchSlots = useCallback(async () => {
        if (!selectedSpace || !session?.user?.email) return;

        setLoadingSlots(true);
        try {
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const res = await fetch(
                `${API_URL}/api/orgs/${orgSlug}/spaces/${selectedSpace.id}/availability?date=${dateStr}&timezone=${timezone}`,
                {
                    headers: {
                        'x-user-email': session.user.email,
                        'x-user-name': session.user.name || '',
                    },
                }
            );
            const data = await res.json();
            if (data.success && data.data?.slots) {
                // Process slots into TimeSlot format
                const slots: TimeSlot[] = data.data.slots.map((slot: any) => ({
                    hour: new Date(slot.startTime).getHours(),
                    startTime: new Date(slot.startTime),
                    endTime: new Date(slot.endTime),
                    bookings: slot.bookings || [],
                }));
                setTimeSlots(slots);
            }
        } catch (err) {
            console.error('Failed to fetch slots:', err);
            toast.error('Failed to load time slots');
        }
        setLoadingSlots(false);
    }, [selectedSpace, selectedDate, orgSlug, session?.user?.email, session?.user?.name]);

    useEffect(() => {
        if (viewMode === 'single') {
            fetchSlots();
        }
    }, [fetchSlots, viewMode]);

    // SSE for real-time updates - refetch when other users create/cancel bookings
    useSSE({
        orgSlug,
        onMessage: (msg) => {
            if (msg.type === 'BOOKING_CREATED' || msg.type === 'BOOKING_CANCELLED') {
                // Refresh all spaces view
                setAllSpacesRefreshKey(prev => prev + 1);
                // Refresh single space view
                fetchSlots();
            }
        },
    });

    // Handle booking
    const handleBook = async () => {
        if (!bookingInfo || !selectedSpace || !session?.user?.email) return;

        setIsBooking(true);
        try {
            const res = await fetch(`${API_URL}/api/orgs/${orgSlug}/bookings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-email': session.user.email,
                    'x-user-name': session.user.name || '',
                },
                body: JSON.stringify({
                    spaceId: selectedSpace.id,
                    startTime: bookingInfo.slot.startTime.toISOString(),
                    endTime: bookingInfo.slot.endTime.toISOString(),
                    slotIndex: bookingInfo.index,
                    slotId: bookingInfo.slotId,
                }),
            });

            const data = await res.json();
            if (data.success) {
                toast.success('Booking confirmed!', {
                    description: `${selectedSpace.name} at ${format(bookingInfo.slot.startTime, 'h:mm a')}`,
                });
                setBookingInfo(null);
                fetchSlots();
                setAllSpacesRefreshKey(prev => prev + 1);
            } else {
                toast.error('Booking failed', { description: data.error?.message });
            }
        } catch (err) {
            toast.error('Booking failed');
        }
        setIsBooking(false);
    };

    // Handle cancellation
    const handleCancel = async () => {
        if (!cancelInfo || !session?.user?.email) return;

        setIsCanceling(true);
        try {
            const res = await fetch(
                `${API_URL}/api/orgs/${orgSlug}/bookings/${cancelInfo.booking.id}`,
                {
                    method: 'DELETE',
                    headers: {
                        'x-user-email': session.user.email,
                        'x-user-name': session.user.name || '',
                    },
                }
            );

            const data = await res.json();
            if (data.success) {
                toast.success('Booking cancelled');
                setCancelInfo(null);
                fetchSlots();
                setAllSpacesRefreshKey(prev => prev + 1);
            } else {
                toast.error('Cancellation failed', { description: data.error?.message });
            }
        } catch (err) {
            toast.error('Cancellation failed');
        }
        setIsCanceling(false);
    };

    if (loadingSpaces) {
        return (
            <div className="max-w-7xl mx-auto space-y-6 p-4 md:p-6">
                <Skeleton className="h-8 w-48" />
                <div className="flex gap-2">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-10 w-32" />
                    ))}
                </div>
                <Skeleton className="h-[400px] w-full" />
            </div>
        );
    }

    if (!mounted) return null;

    return (

        <TooltipProvider>
            <div className="h-[calc(100vh-64px-48px)] flex flex-col overflow-hidden">
                {/* Controls Bar - Fixed at top */}
                <div className="flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
                    <div className="max-w-[1600px] mx-auto px-4 py-3">
                        <div className="flex items-center gap-4 flex-wrap">
                            {/* Date Picker */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-9 gap-2">
                                        <Clock className="w-4 h-4" />
                                        {format(selectedDate, 'MMM d, yyyy')}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={selectedDate}
                                        onSelect={(date) => {
                                            if (date) {
                                                setSelectedDate(date);
                                            }
                                        }}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>

                            {/* Week Navigation */}
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setViewDate((prev) => addDays(prev, -7))}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <div className="flex gap-1">
                                    {weekDates.map((date) => {
                                        const isSelected = isSameDay(date, selectedDate);
                                        const isToday = isSameDay(date, startOfToday());

                                        return (
                                            <button
                                                key={date.toISOString()}
                                                onClick={() => setSelectedDate(date)}
                                                className={cn(
                                                    'flex flex-col items-center justify-center min-w-[40px] h-[44px] rounded-lg border text-xs transition-all',
                                                    isSelected
                                                        ? 'bg-primary text-primary-foreground border-primary'
                                                        : 'hover:border-primary/50 hover:bg-muted/50',
                                                    isToday && !isSelected && 'border-primary/50 bg-primary/5'
                                                )}
                                            >
                                                <span className={cn("text-[9px] font-medium uppercase", isSelected ? "text-primary-foreground/80" : "text-muted-foreground")}>
                                                    {format(date, 'EEE')}
                                                </span>
                                                <span className="font-bold leading-none">
                                                    {format(date, 'd')}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setViewDate((prev) => addDays(prev, 7))}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Spacer */}
                            <div className="flex-1" />

                            {/* Space Selector (Single View only) */}
                            {viewMode === 'single' && spaces.length > 0 && (
                                <Select
                                    value={selectedSpace?.id || ''}
                                    onValueChange={(value) => {
                                        const space = spaces.find(s => s.id === value);
                                        if (space) setSelectedSpace(space);
                                    }}
                                >
                                    <SelectTrigger className="w-[200px] h-9">
                                        <SelectValue placeholder="Select a space" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {spaces.map((space) => (
                                            <SelectItem key={space.id} value={space.id}>
                                                {space.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}

                            {/* View Mode Toggle */}
                            <div className="bg-muted p-1 rounded-lg inline-flex gap-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setViewMode('single')}
                                    className={cn(
                                        "h-8 gap-2 text-xs",
                                        viewMode === 'single' && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                                    )}
                                >
                                    <LayoutGrid className="w-3.5 h-3.5" />
                                    Single
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setViewMode('all')}
                                    className={cn(
                                        "h-8 gap-2 text-xs",
                                        viewMode === 'all' && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                                    )}
                                >
                                    <List className="w-3.5 h-3.5" />
                                    All Spaces
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content - Fills remaining space */}
                <div className="flex-1 overflow-hidden max-w-[1600px] mx-auto px-4 py-4 w-full">
                    {viewMode === 'all' ? (
                        <AllSpacesView
                            date={selectedDate}
                            orgSlug={orgSlug}
                            refreshTrigger={allSpacesRefreshKey}
                            onBook={({ space, slotRaw, subSlot, idx }) => {
                                setSelectedSpace(space);
                                setBookingInfo({
                                    slot: {
                                        hour: new Date(slotRaw.startTime).getHours(),
                                        startTime: new Date(slotRaw.startTime),
                                        endTime: new Date(slotRaw.endTime),
                                        bookings: slotRaw.bookings || []
                                    },
                                    slotId: subSlot.id,
                                    slotName: subSlot.name,
                                    index: idx
                                });
                            }}
                            onCancel={({ booking, slot, space }) => {
                                setSelectedSpace(space);
                                setCancelInfo({
                                    booking: {
                                        ...booking,
                                        startTime: booking.startTime,
                                        endTime: booking.endTime
                                    },
                                    slot: {
                                        hour: new Date(slot.startTime).getHours(),
                                        startTime: new Date(slot.startTime),
                                        endTime: new Date(slot.endTime),
                                        bookings: slot.bookings || []
                                    }
                                });
                            }}
                        />
                    ) : (
                        <div className="flex flex-col h-full space-y-4">
                            {/* Legend */}
                            <div className="flex items-center gap-6 px-4 py-2 bg-muted/30 rounded-lg border border-foreground/5 w-fit">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded border border-emerald-300 bg-emerald-50" />
                                    <span className="text-xs font-medium text-muted-foreground">Available</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded border border-primary bg-primary/10" />
                                    <span className="text-xs font-medium text-muted-foreground">My Booking</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded border border-slate-200 bg-slate-100" />
                                    <span className="text-xs font-medium text-muted-foreground">Booked</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded border border-muted bg-muted/30 opacity-50" />
                                    <span className="text-xs font-medium text-muted-foreground">Unavailable / Past</span>
                                </div>
                            </div>

                            {/* Time Slots Table */}
                            <div className="border rounded-xl overflow-hidden flex flex-col h-full bg-card shadow-sm">
                                {/* Header Row - Sticky */}
                                <div className="flex items-center bg-muted p-3 border-b-2 border-foreground/20 flex-shrink-0">
                                    <div className="w-24 font-semibold text-foreground">Time</div>
                                    <div className="flex-1 grid grid-cols-4 gap-2">
                                        {(selectedSpace?.slots && selectedSpace.slots.length > 0
                                            ? selectedSpace.slots
                                            : Array.from({ length: selectedSpace?.capacity || 4 }, (_, i) => ({
                                                id: `legacy-${i}`,
                                                name: `Slot ${i + 1}`,
                                                number: i + 1,
                                                isActive: true,
                                            }))
                                        ).map((subSlot) => (
                                            <div key={subSlot.id} className="text-center text-sm font-medium text-muted-foreground">
                                                {subSlot.name}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Body - Scrollable */}
                                <div className="flex-1 overflow-y-auto">

                                    {/* Body Rows */}
                                    {loadingSlots ? (
                                        <div className="p-4 space-y-2">
                                            {[1, 2, 3].map((i) => (
                                                <Skeleton key={i} className="h-12 w-full" />
                                            ))}
                                        </div>
                                    ) : (
                                        <div>
                                            {timeSlots
                                                .filter(slot => !isBefore(slot.startTime, new Date()))
                                                .map((slot) => {
                                                    const maxAdvanceDays = selectedSpace?.rules?.maxAdvanceDays ?? 7;
                                                    const maxAllowedDate = endOfDay(addDays(new Date(), maxAdvanceDays));
                                                    const isSlotBookable = isBefore(slot.startTime, maxAllowedDate);

                                                    return (
                                                        <div
                                                            key={slot.startTime.toISOString()}
                                                            className={cn(
                                                                "flex items-center p-3 border-b border-foreground/10 hover:bg-muted/30 transition-colors",
                                                                !isSlotBookable && "opacity-50 bg-muted/20"
                                                            )}
                                                        >
                                                            {/* Time Column */}
                                                            <div className="w-24 pr-4 border-r-2 border-foreground/10 flex flex-col items-end justify-center py-1">
                                                                <div className="text-lg font-bold text-primary leading-tight">
                                                                    {format(slot.startTime, 'h:mm')}
                                                                </div>
                                                                <div className="text-[10px] font-bold text-primary/80 uppercase tracking-tighter">
                                                                    {format(slot.startTime, 'a')}
                                                                </div>
                                                                <div className="text-[10px] font-normal text-muted-foreground mt-1 text-right">
                                                                    to {format(slot.endTime, 'h:mm a')}
                                                                </div>
                                                            </div>

                                                            {/* Slots Grid */}
                                                            <div className="flex-1 grid grid-cols-4 gap-2 pl-3">
                                                                {(selectedSpace?.slots && selectedSpace.slots.length > 0
                                                                    ? selectedSpace.slots
                                                                    : Array.from({ length: selectedSpace?.capacity || 4 }, (_, i) => ({
                                                                        id: `legacy-${i}`,
                                                                        name: `Slot ${i + 1}`,
                                                                        number: i + 1,
                                                                        isActive: true,
                                                                    }))
                                                                ).map((subSlot, idx) => {
                                                                    const booking = slot.bookings?.find(
                                                                        (b) => b.slotId === subSlot.id || b.slotIndex === idx
                                                                    );
                                                                    const isMyBooking = booking?.userEmail === session?.user?.email;
                                                                    const isPast = isBefore(slot.startTime, new Date());
                                                                    const isAvailable = !booking && isSlotBookable && !isPast;
                                                                    const firstName = booking?.userName?.split(' ')[0] || 'Booked';

                                                                    return (
                                                                        <Tooltip key={subSlot.id}>
                                                                            <TooltipTrigger asChild>
                                                                                <button
                                                                                    disabled={(!isAvailable && !isMyBooking)}
                                                                                    onClick={() => {
                                                                                        if (isMyBooking && booking) {
                                                                                            setCancelInfo({ booking, slot });
                                                                                        } else if (isAvailable) {
                                                                                            setBookingInfo({
                                                                                                slot,
                                                                                                slotId: subSlot.id,
                                                                                                slotName: subSlot.name,
                                                                                                index: idx,
                                                                                            });
                                                                                        }
                                                                                    }}
                                                                                    className={cn(
                                                                                        "relative flex items-center justify-start px-2 py-3 rounded-lg border text-[11px] font-semibold transition-all duration-200 group overflow-hidden",
                                                                                        isAvailable && "border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:border-emerald-400 hover:bg-emerald-100/50 hover:shadow-sm cursor-pointer",
                                                                                        isMyBooking && "border-primary bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer shadow-sm",
                                                                                        booking && !isMyBooking && "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed",
                                                                                        (isPast || !isSlotBookable) && !booking && "opacity-30 cursor-not-allowed bg-slate-200/40 border-slate-200 grayscale"
                                                                                    )}
                                                                                >
                                                                                    {booking ? (
                                                                                        <div className="flex items-center gap-2 w-full pr-4">
                                                                                            <Avatar className="h-6 w-6 border-2 border-background flex-shrink-0 shadow-sm">
                                                                                                {booking.userAvatar && <AvatarImage src={booking.userAvatar} />}
                                                                                                <AvatarFallback className="text-[8px] bg-primary/5 font-bold">{getInitials(booking.userName)}</AvatarFallback>
                                                                                            </Avatar>
                                                                                            <span className="truncate text-left font-bold leading-tight">
                                                                                                {booking.userName}
                                                                                            </span>
                                                                                            {isMyBooking && (
                                                                                                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-destructive/10 p-1 rounded-md text-destructive hover:bg-destructive hover:text-white">
                                                                                                    <X className="w-2.5 h-2.5" />
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    ) : (
                                                                                        <span className="opacity-0 w-full text-center">—</span>
                                                                                    )}
                                                                                </button>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent>
                                                                                {booking
                                                                                    ? isMyBooking
                                                                                        ? 'Click to cancel'
                                                                                        : `Booked by ${booking.userName}`
                                                                                    : isPast
                                                                                        ? 'This time slot has passed'
                                                                                        : isSlotBookable
                                                                                            ? 'Available - Click to book'
                                                                                            : `Booking available ${maxAdvanceDays} days in advance`}
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Dialogs */}
                    <Dialog open={!!bookingInfo} onOpenChange={() => setBookingInfo(null)}>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle className="text-xl">Confirm Reservation</DialogTitle>
                                <DialogDescription>
                                    Review your booking details before confirming.
                                </DialogDescription>
                            </DialogHeader>
                            {bookingInfo && selectedSpace && (
                                <div className="space-y-4 py-2">
                                    {/* Space & Date */}
                                    <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
                                        <div className="flex items-start gap-4">
                                            <div className="bg-primary/15 p-3 rounded-xl">
                                                <Clock className="h-6 w-6 text-primary" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-lg text-foreground">{selectedSpace.name}</h4>
                                                <p className="text-sm text-muted-foreground">
                                                    {format(bookingInfo.slot.startTime, 'EEEE, MMMM do, yyyy')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Details Grid */}
                                    <div className="grid gap-2">
                                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                                            <span className="text-sm text-muted-foreground font-medium">Time</span>
                                            <span className="font-semibold text-foreground">
                                                {format(bookingInfo.slot.startTime, 'h:mm a')} - {format(bookingInfo.slot.endTime, 'h:mm a')}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                                            <span className="text-sm text-muted-foreground font-medium">Slot</span>
                                            <span className="font-semibold text-primary">
                                                {bookingInfo.slotName}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <DialogFooter className="gap-2 sm:gap-0">
                                <Button variant="ghost" onClick={() => setBookingInfo(null)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleBook} disabled={isBooking} className="bg-primary hover:bg-primary/90">
                                    {isBooking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Confirm Booking
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <AlertDialog open={!!cancelInfo} onOpenChange={() => setCancelInfo(null)}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Cancel Booking?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Are you sure you want to cancel {cancelInfo?.booking?.slotIndex !== undefined ? `Slot ${(cancelInfo.booking.slotIndex + 1)}` : 'this booking'}?
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Keep it</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleCancel}
                                    disabled={isCanceling}
                                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                >
                                    {isCanceling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Yes, Cancel it
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>
        </TooltipProvider >
    );
}
