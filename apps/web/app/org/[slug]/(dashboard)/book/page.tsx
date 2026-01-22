'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { format, isSameDay, addDays, startOfToday, startOfDay, endOfDay, isBefore, isAfter } from 'date-fns';
import { ChevronLeft, ChevronRight, Loader2, Calendar as CalendarIcon, Repeat } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api-client';
import { AllSpacesView } from '@/components/booking/AllSpacesView';
import { useSSE } from '@/hooks/use-sse';

// Space type configuration with display names
const SPACE_TYPES: Record<string, { label: string; slotPrefix: string }> = {
    BADMINTON: { label: 'Badminton', slotPrefix: 'Court' },
    TENNIS: { label: 'Tennis', slotPrefix: 'Court' },
    TABLE_TENNIS: { label: 'Table Tennis', slotPrefix: 'Table' },
    FOOTBALL: { label: 'Football', slotPrefix: 'Field' },
    BASKETBALL: { label: 'Basketball', slotPrefix: 'Court' },
    CRICKET: { label: 'Cricket', slotPrefix: 'Net' },
    SWIMMING: { label: 'Swimming', slotPrefix: 'Lane' },
    SQUASH: { label: 'Squash', slotPrefix: 'Court' },
    GENERIC: { label: 'Other', slotPrefix: 'Slot' },
} as const;

type SpaceType = keyof typeof SPACE_TYPES;

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
    const [bookingInfo, setBookingInfo] = useState<{
        slot: TimeSlot;
        slotId: string;
        slotName: string;
        index: number;
    } | null>(null);
    const [isBooking, setIsBooking] = useState(false);
    const [recurrence, setRecurrence] = useState<'NONE' | 'DAILY' | 'WEEKLY'>('NONE');
    const [recurrenceCount, setRecurrenceCount] = useState('10');
    const [isAdmin, setIsAdmin] = useState(false);


    // Cancel dialog state
    const [cancelInfo, setCancelInfo] = useState<{
        booking: Booking;
        slot: TimeSlot;
    } | null>(null);
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
            {/* Mobile View Controls */}
            <div className="md:hidden flex flex-col gap-4 pb-2">
                {/* Date Selection Area */}
                <div className="flex items-center gap-3 pl-4 pr-2 pt-2">
                    {/* Scrollable Date Strip */}
                    <div className="flex-1 -mr-2 overflow-hidden">
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pr-4 pb-2 snap-x mask-fade-right">
                            {weekDates.map((date) => {
                                const isSelected = isSameDay(date, selectedDate);
                                // const isToday = isSameDay(date, startOfToday());
                                return (
                                    <button
                                        key={date.toISOString()}
                                        onClick={() => setSelectedDate(date)}
                                        className={cn(
                                            'flex-shrink-0 flex flex-col items-center justify-center min-w-[48px] h-12 rounded-xl transition-all snap-start border',
                                            isSelected
                                                ? 'bg-primary border-primary text-primary-foreground shadow-sm scale-100'
                                                : 'bg-card border-border/50 text-muted-foreground scale-95 opacity-70'
                                        )}
                                    >
                                        <span className="text-[9px] uppercase font-bold tracking-wider opacity-90">
                                            {format(date, 'EEE')}
                                        </span>
                                        <span className={cn("text-lg font-bold leading-none", isSelected ? "text-primary-foreground" : "text-foreground")}>
                                            {format(date, 'd')}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Calendar Picker Trigger */}
                    <div className="flex-shrink-0 pl-1 border-l border-border/50">
                        <Popover>
                            <PopoverTrigger asChild>
                                <button className="h-10 w-10 flex items-center justify-center rounded-full bg-muted/50 text-muted-foreground hover:text-foreground active:scale-95 transition-all">
                                    <CalendarIcon className="h-5 w-5" />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={(date) => date && setSelectedDate(date)}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                {/* Mobile Categories - Pills */}
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
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-border/50 pb-4 mb-4">
                    {/* Desktop Date Navigation */}
                    <div className="flex items-center gap-4">
                        <div className="flex items-center bg-background rounded-full border border-border/50 p-1">
                            <button
                                className="p-1.5 text-muted-foreground hover:text-foreground transition-colors hover:bg-muted rounded-full"
                                onClick={() => setViewDate((prev) => addDays(prev, -7))}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>

                            <div className="flex items-center px-1">
                                {weekDates.map((date) => {
                                    const isSelected = isSameDay(date, selectedDate);
                                    const isToday = isSameDay(date, startOfToday());

                                    return (
                                        <button
                                            key={date.toISOString()}
                                            onClick={() => setSelectedDate(date)}
                                            className={cn(
                                                'flex flex-col items-center justify-center w-10 h-10 rounded-full transition-all relative mx-0.5',
                                                isSelected
                                                    ? 'bg-primary/5 text-primary border border-primary/20 font-medium'
                                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                            )}
                                        >
                                            <span className="text-[9px] uppercase tracking-wider leading-none mb-0.5 opacity-70">
                                                {format(date, 'EEE')}
                                            </span>
                                            <span className="text-sm font-medium leading-none">
                                                {format(date, 'd')}
                                            </span>
                                            {isToday && !isSelected && (
                                                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-0.5 h-0.5 bg-primary rounded-full" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                className="p-1.5 text-muted-foreground hover:text-foreground transition-colors hover:bg-muted rounded-full"
                                onClick={() => setViewDate((prev) => addDays(prev, 7))}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>

                        <Popover>
                            <PopoverTrigger asChild>
                                <button className="font-display text-lg font-medium text-foreground tracking-tight hover:text-primary transition-colors">
                                    {format(selectedDate, 'MMMM yyyy')}
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={(date) => date && setSelectedDate(date)}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Category Tabs */}
                    {availableCategories.length > 0 && (
                        <div className="flex items-center gap-8 mr-1">
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
            </div>

            {/* Booking Dialog */}
            <Dialog open={!!bookingInfo} onOpenChange={() => setBookingInfo(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader className="space-y-3 pb-2">
                        <DialogTitle className="font-display text-2xl font-medium text-foreground/90">Confirm Booking</DialogTitle>
                        <DialogDescription className="text-muted-foreground/70">
                            Review your reservation details.
                        </DialogDescription>
                    </DialogHeader>
                    {bookingInfo && selectedSpace && (
                        <div className="py-2">
                            <div className="flex justify-between py-3 border-b border-border/40">
                                <span className="text-sm text-muted-foreground/70 font-medium uppercase tracking-wider">Space</span>
                                <span className="font-medium text-foreground/90">{selectedSpace.name}</span>
                            </div>
                            <div className="flex justify-between py-3 border-b border-border/40">
                                <span className="text-sm text-muted-foreground/70 font-medium uppercase tracking-wider">Date</span>
                                <span className="font-medium text-foreground/90">{format(bookingInfo.slot.startTime, 'EEEE, MMM d')}</span>
                            </div>
                            <div className="flex justify-between py-3 border-b border-border/40">
                                <span className="text-sm text-muted-foreground/70 font-medium uppercase tracking-wider">Time</span>
                                <span className="font-medium text-foreground/90">{format(bookingInfo.slot.startTime, 'h:mm a')} – {format(bookingInfo.slot.endTime, 'h:mm a')}</span>
                            </div>
                            <div className="flex justify-between py-3">
                                <span className="text-sm text-muted-foreground/70 font-medium uppercase tracking-wider">Slot</span>
                                <span className="font-semibold text-primary/80">{bookingInfo.slotName}</span>
                            </div>

                            {/* Recurrence Options (Admin Only) */}
                            {isAdmin && (
                                <div className="space-y-4 pt-4 mt-2 border-t border-border/60">
                                    <div className="flex items-center gap-2">
                                        <Repeat className="h-4 w-4 text-muted-foreground/60" />
                                        <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">Recurrence</Label>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <Select value={recurrence} onValueChange={(v: any) => setRecurrence(v)}>
                                            <SelectTrigger className="h-10 border-border/40 bg-muted/5 focus:ring-primary/20">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="NONE">One time</SelectItem>
                                                <SelectItem value="DAILY">Daily</SelectItem>
                                                <SelectItem value="WEEKLY">Weekly</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {recurrence !== 'NONE' && (
                                            <div className="flex items-center gap-3">
                                                <Input
                                                    type="number"
                                                    value={recurrenceCount}
                                                    onChange={(e) => setRecurrenceCount(e.target.value)}
                                                    className="h-10 border-border/40 bg-muted/5 focus:ring-primary/20"
                                                    min={2}
                                                    max={52}
                                                    placeholder="Count"
                                                />
                                                <span className="text-xs font-medium text-muted-foreground/60 whitespace-nowrap uppercase tracking-wider">times</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter className="pt-6 sm:justify-end gap-3">
                        <Button variant="outline" className="h-11 px-8 rounded-lg border-border/60 hover:bg-muted/50 transition-colors" onClick={() => setBookingInfo(null)}>Cancel</Button>
                        <Button className="h-11 px-10 rounded-lg shadow-[0_4px_12px_-4px_rgba(var(--primary),0.3)] hover:shadow-[0_6px_16px_-4px_rgba(var(--primary),0.4)] transition-all" onClick={handleBook} disabled={isBooking}>
                            {isBooking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Cancel Dialog */}
            <Dialog open={!!cancelInfo} onOpenChange={() => setCancelInfo(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader className="space-y-3 pb-2">
                        <DialogTitle className="font-display text-2xl font-medium text-foreground/90">Cancel this booking?</DialogTitle>
                        <DialogDescription className="text-muted-foreground/70">
                            The slot will become available for other members.
                        </DialogDescription>
                    </DialogHeader>
                    {cancelInfo && selectedSpace && (
                        <div className="py-2">
                            <div className="flex justify-between py-3 border-b border-border/40">
                                <span className="text-sm text-muted-foreground/70 font-medium uppercase tracking-wider">Space</span>
                                <span className="font-medium text-foreground/90">{selectedSpace.name}</span>
                            </div>
                            <div className="flex justify-between py-3 border-b border-border/40">
                                <span className="text-sm text-muted-foreground/70 font-medium uppercase tracking-wider">Date</span>
                                <span className="font-medium text-foreground/90">{format(cancelInfo.slot.startTime, 'EEEE, MMM d')}</span>
                            </div>
                            <div className="flex justify-between py-3">
                                <span className="text-sm text-muted-foreground/70 font-medium uppercase tracking-wider">Time</span>
                                <span className="font-medium text-primary/80">{format(cancelInfo.slot.startTime, 'h:mm a')} – {format(cancelInfo.slot.endTime, 'h:mm a')}</span>
                            </div>
                        </div>
                    )}
                    <DialogFooter className="pt-8 sm:justify-end gap-3 text-center sm:text-left">
                        <Button variant="outline" className="h-11 px-8 rounded-lg border-border/60 hover:bg-muted/50 transition-colors" onClick={() => setCancelInfo(null)}>Keep booking</Button>
                        <Button
                            variant="ghost"
                            onClick={handleCancel}
                            disabled={isCanceling}
                            className="h-11 px-8 rounded-lg text-muted-foreground/70 hover:text-destructive hover:bg-destructive/[0.03] transition-colors"
                        >
                            {isCanceling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Cancel Appointment
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
