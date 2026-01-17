import { useState, useEffect, useCallback } from 'react';
import { format, isBefore, startOfDay, addHours, isSameDay, isAfter, endOfDay, addDays } from 'date-fns';
import { useSession } from 'next-auth/react';
import { AlertCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn, getInitials } from '@/lib/utils';
import { API_URL } from '@/lib/config';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface AllSpacesViewProps {
    date: Date;
    orgSlug: string;
    onBook: (val: any) => void;
    onCancel: (val: any) => void;
    refreshTrigger?: number; // Increment this to force refetch
}

interface Booking {
    id: string;
    userId: string;
    userEmail: string;
    userName: string;
    userAvatar?: string;
    startTime: string; // ISO
    endTime: string; // ISO
    slotId?: string;
    slotIndex?: number;
}

interface Slot {
    startTime: string; // ISO
    endTime: string; // ISO
    isAvailable: boolean;
    bookings?: Booking[];
}

interface SpaceAvailability {
    space: {
        id: string;
        name: string;
        capacity: number;
        slots: any[];
        rules?: {
            maxAdvanceDays: number;
        };
    };
    slots: Slot[];
}

export function AllSpacesView({ date, orgSlug, onBook, onCancel, refreshTrigger }: AllSpacesViewProps) {
    const { data: session } = useSession();
    const [data, setData] = useState<SpaceAvailability[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const formattedDate = format(date, 'yyyy-MM-dd');
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

            const res = await fetch(`${API_URL}/api/orgs/${orgSlug}/spaces/all/availability?date=${formattedDate}&timezone=${timezone}`);
            const json = await res.json();

            if (json.success) {
                setData(json.data);
            } else {
                toast.error('Failed to load availability');
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to load availability');
        }
        setLoading(false);
    }, [date, orgSlug]);

    useEffect(() => {
        if (orgSlug) {
            fetchData();
        }
    }, [date, orgSlug, refreshTrigger, fetchData]);

    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-4">
                        <Skeleton className="h-24 w-24" />
                        <Skeleton className="h-24 flex-1" />
                    </div>
                ))}
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mb-2" />
                <p>No spaces found</p>
            </div>
        );
    }

    // Generate hourly time rows from current hour to 10 PM
    const now = new Date();
    const endHour = 22; // 10 PM
    const timeRows: Date[] = [];
    const baseDate = startOfDay(date);
    const isToday = isSameDay(date, now);
    const currentHour = now.getHours();

    // If viewing today, start from current hour; otherwise start from 6 AM
    const openingHour = 6;
    const startHour = isToday ? Math.max(now.getHours(), openingHour) : openingHour;

    for (let h = startHour; h < endHour; h++) {
        const rowTime = addHours(baseDate, h);
        // Only add if it's in the future or the current hour hasn't passed its start
        if (!isToday || !isBefore(rowTime, now)) {
            timeRows.push(rowTime);
        }
    }

    // If it's today and current time is past 10 PM, show nothing
    if (isToday && currentHour >= endHour) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mb-2" />
                <p>All slots for today have passed</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full space-y-4">
            {/* Legend */}
            <div className="flex items-center gap-4 px-4 py-2 bg-muted/30 rounded-lg border border-foreground/5 w-fit">
                <div className="flex items-center gap-1.5 leading-none">
                    <div className="w-3 h-3 rounded-sm border border-emerald-200 bg-emerald-50/50" />
                    <span className="text-xs font-medium text-muted-foreground">Available</span>
                </div>
                <div className="flex items-center gap-1.5 leading-none">
                    <div className="w-3 h-3 rounded-sm border border-primary bg-primary/10" />
                    <span className="text-xs font-medium text-muted-foreground">My Booking</span>
                </div>
                <div className="flex items-center gap-1.5 leading-none">
                    <div className="w-3 h-3 rounded-sm border border-slate-200 bg-slate-100" />
                    <span className="text-xs font-medium text-muted-foreground">Booked</span>
                </div>
                <div className="flex items-center gap-1.5 leading-none">
                    <div className="w-3 h-3 rounded-sm border border-slate-200 bg-slate-200/40 opacity-60" />
                    <span className="text-xs font-medium text-muted-foreground">Disabled</span>
                </div>
            </div>

            <div className="border rounded-xl shadow-sm overflow-hidden flex flex-col h-full bg-card">
                {/* Scrollable Table Container */}
                <div className="flex-1 overflow-auto">
                    <table className="w-full border-collapse">
                        {/* Sticky Header */}
                        <thead className="sticky top-0 z-20">
                            <tr className="bg-muted border-b-2 border-foreground/20">
                                <th className="p-4 bg-muted text-left w-28 font-semibold text-foreground border-r-2 border-foreground/20">
                                    Time
                                </th>
                                {data.map((item) => (
                                    <th key={item.space.id} className="p-4 bg-muted border-l-2 border-foreground/20 text-left min-w-[180px]">
                                        <div className="font-semibold text-foreground">{item.space.name}</div>
                                        <div className="text-xs font-normal text-muted-foreground mt-0.5">
                                            Cap: {item.space.capacity}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {timeRows.map((rowTime) => {
                                const rowHour = rowTime.getHours();
                                // Check if this is the current hour (partially elapsed)
                                const isCurrentHourRow = isToday && rowHour === currentHour;
                                // For current hour row, slots are still visible but greyed/disabled

                                return (
                                    <tr key={rowTime.toISOString()} className={cn("group hover:bg-muted/5", isCurrentHourRow && "bg-muted/10")}>
                                        <td className={cn(
                                            "p-3 border-b-2 border-foreground/10 sticky left-0 z-10 border-r-2 border-foreground/20 w-24",
                                            isCurrentHourRow
                                                ? "bg-muted/10 font-bold"
                                                : "bg-background group-hover:bg-muted/5 font-semibold"
                                        )}>
                                            <div className="flex flex-col items-end justify-center py-1 pr-3">
                                                <div className={cn(
                                                    "text-lg font-bold leading-tight",
                                                    isCurrentHourRow ? "text-primary/50" : "text-primary"
                                                )}>
                                                    {format(rowTime, 'h:mm')}
                                                </div>
                                                <div className={cn(
                                                    "text-[10px] font-bold uppercase tracking-tighter leading-none",
                                                    isCurrentHourRow ? "text-primary/40" : "text-primary/80"
                                                )}>
                                                    {format(rowTime, 'a')}
                                                </div>
                                                <div className="text-[10px] font-normal text-muted-foreground mt-1 text-right whitespace-nowrap">
                                                    to {format(addHours(rowTime, 1), 'h:mm a')}
                                                    {isCurrentHourRow && <div className="font-bold text-[9px] mt-0.5">(now)</div>}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Space Columns */}
                                        {data.map((item) => {
                                            const { space, slots } = item;
                                            const slot = slots.find(s => {
                                                const sTime = new Date(s.startTime);
                                                return sTime.getHours() === rowTime.getHours() && isSameDay(sTime, rowTime);
                                            });

                                            if (!slot) return <td key={space.id} className="p-3 border-b-2 border-l-2 border-foreground/10 bg-muted/5"></td>;

                                            const configuredSlots = space.slots && space.slots.length > 0
                                                ? space.slots
                                                : Array.from({ length: space.capacity }, (_, i) => ({ id: `legacy-${i}`, name: `${i + 1}`, number: i + 1, isActive: true }));

                                            return (
                                                <td key={space.id} className={cn("p-3 border-b-2 border-l-2 border-foreground/10 align-top", isCurrentHourRow && "bg-muted/5")}>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {configuredSlots.map((subSlot: any, idx: number) => {
                                                            const booked = slot.bookings?.find(b =>
                                                                b.slotId === subSlot.id || b.slotIndex === subSlot.number - 1
                                                            );
                                                            const isMine = booked?.userEmail === session?.user?.email;
                                                            const slotStartTime = new Date(slot.startTime);
                                                            const isPast = isBefore(slotStartTime, now);

                                                            // Check maxAdvanceDays - interpret as "booking allowed through X days from now"
                                                            const maxAdvanceDays = space.rules?.maxAdvanceDays ?? 7;
                                                            // Example: If today is 17th and max is 2, allowed through 19th.
                                                            const maxAllowedDate = endOfDay(addDays(now, maxAdvanceDays));
                                                            const isTooFarAhead = isAfter(slotStartTime, maxAllowedDate);

                                                            const isDisabled = isPast || isTooFarAhead;

                                                            return (
                                                                <TooltipProvider key={idx}>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <button
                                                                                disabled={isDisabled || (!!booked && !isMine)}
                                                                                onClick={() => {
                                                                                    if (isMine && booked) {
                                                                                        onCancel({
                                                                                            booking: booked,
                                                                                            slot,
                                                                                            space
                                                                                        });
                                                                                    } else if (!booked && !isDisabled) {
                                                                                        onBook({
                                                                                            space,
                                                                                            slotRaw: slot,
                                                                                            subSlot,
                                                                                            idx
                                                                                        });
                                                                                    }
                                                                                }}
                                                                                className={cn(
                                                                                    "h-12 rounded-lg border flex flex-col items-center justify-center p-1 text-[11px] transition-all duration-200 relative group overflow-hidden",
                                                                                    booked
                                                                                        ? isMine
                                                                                            ? "bg-primary/10 border-primary/50 text-foreground hover:bg-primary/20 cursor-pointer shadow-sm"
                                                                                            : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                                                                                        : isDisabled
                                                                                            ? "opacity-30 cursor-not-allowed bg-slate-200/40 border-slate-200 grayscale"
                                                                                            : "bg-emerald-50/50 border-emerald-200/50 text-emerald-700 hover:bg-emerald-100/50 hover:border-emerald-300 hover:shadow-sm"
                                                                                )}
                                                                            >
                                                                                {booked ? (
                                                                                    <div className="flex items-center gap-1.5 w-full px-1">
                                                                                        <Avatar className="h-5 w-5 border border-background flex-shrink-0 shadow-sm">
                                                                                            {booked.userAvatar && <AvatarImage src={booked.userAvatar} />}
                                                                                            <AvatarFallback className="text-[7px] bg-primary/5 font-bold">{getInitials(booked.userName)}</AvatarFallback>
                                                                                        </Avatar>
                                                                                        <span className="truncate text-left font-bold leading-tight flex-1">
                                                                                            {booked.userName}
                                                                                        </span>
                                                                                        {isMine && !isDisabled && (
                                                                                            <div className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-destructive/10 p-0.5 rounded text-destructive hover:bg-destructive hover:text-white">
                                                                                                <X className="w-2 h-2" />
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                ) : (
                                                                                    <span className="font-semibold opacity-60">
                                                                                        {subSlot.name.replace('Slot ', '')}
                                                                                    </span>
                                                                                )}
                                                                            </button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>
                                                                            {booked
                                                                                ? isMine
                                                                                    ? <p>Click to cancel your booking</p>
                                                                                    : <p>Booked by {booked.userName}</p>
                                                                                : isPast
                                                                                    ? <p>This slot has passed</p>
                                                                                    : isTooFarAhead
                                                                                        ? <p>Booking available {maxAdvanceDays} days in advance</p>
                                                                                        : <p>Available - Click to book</p>}
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            );
                                                        })}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
