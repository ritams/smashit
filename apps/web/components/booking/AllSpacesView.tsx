import { useState, useEffect, useCallback } from 'react';
import { format, isBefore, startOfDay, addHours, isSameDay, isAfter, endOfDay, addDays } from 'date-fns';
import { useSession } from 'next-auth/react';
import { AlertCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn, getInitials } from '@/lib/utils';
import { api } from '@/lib/api-client';
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

            const data = await api.getAllAvailability(orgSlug, formattedDate, timezone);
            setData(data);
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
            <div className="flex flex-wrap items-center gap-4 px-4 py-2 bg-muted/20 rounded-lg border border-foreground/5 w-fit">
                <div className="flex items-center gap-2 leading-none">
                    <div className="w-6 h-4 rounded-sm border border-emerald-200 bg-emerald-50 relative overflow-hidden">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-full h-[1px] bg-emerald-500/10" />
                            <div className="h-full w-[1px] bg-emerald-500/10" />
                        </div>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">Available</span>
                </div>
                <div className="flex items-center gap-2 leading-none">
                    <div className="w-6 h-4 rounded-sm border border-primary/20 bg-primary/5 relative overflow-hidden">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-full h-[1px] bg-primary/20" />
                            <div className="h-full w-[1px] bg-primary/20" />
                        </div>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">My Booking</span>
                </div>
                <div className="flex items-center gap-2 leading-none">
                    <div className="w-6 h-4 rounded-sm border border-slate-200 bg-slate-50 relative overflow-hidden grayscale">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-full h-[1px] bg-black/[0.03]" />
                            <div className="h-full w-[1px] bg-black/[0.03]" />
                        </div>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">Booked</span>
                </div>
                <div className="flex items-center gap-2 leading-none">
                    <div className="w-6 h-4 rounded-sm border border-slate-100 bg-slate-50/50 relative overflow-hidden opacity-40">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-full h-[1px] bg-black/[0.02]" />
                            <div className="h-full w-[1px] bg-black/[0.02]" />
                        </div>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">Disabled</span>
                </div>
            </div>

            <div className="border rounded-xl shadow-sm overflow-hidden flex flex-col h-full bg-card">
                {/* Scrollable Table Container */}
                <div className="flex-1 overflow-auto">
                    <table className="w-full border-collapse table-fixed">
                        {/* Sticky Header */}
                        <thead className="sticky top-0 z-20">
                            <tr className="bg-muted border-b-2 border-foreground/20">
                                <th className="p-4 bg-muted text-left w-32 font-semibold text-foreground border-r-2 border-foreground/20">
                                    Time
                                </th>
                                {data.map((item) => (
                                    <th key={item.space.id} className="p-4 bg-muted border-l-2 border-foreground/20 text-left w-[200px]">
                                        <div className="font-semibold text-foreground truncate">{item.space.name}</div>
                                        <div className="text-xs font-normal text-muted-foreground mt-0.5 whitespace-nowrap">
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
                                            "p-3 border-b-2 border-foreground/10 sticky left-0 z-10 border-r-2 border-foreground/20 w-32",
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
                                                                                    "h-14 rounded-lg border flex flex-col items-center justify-center p-1 text-[11px] transition-all duration-300 relative group overflow-hidden",
                                                                                    booked
                                                                                        ? isMine
                                                                                            ? "bg-primary/10 border-primary/20 text-primary hover:bg-primary/20 cursor-pointer"
                                                                                            : "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
                                                                                        : isDisabled
                                                                                            ? "opacity-30 cursor-not-allowed bg-slate-50/50 border-slate-100 grayscale-[0.5]"
                                                                                            : "bg-emerald-50 border-emerald-200/40 text-emerald-700 hover:bg-emerald-100/60 hover:border-emerald-300/40"
                                                                                )}
                                                                            >
                                                                                {/* Subtle Court Lines */}
                                                                                <div className={cn(
                                                                                    "absolute inset-0 pointer-events-none transition-opacity",
                                                                                    booked ? "opacity-[0.05]" : "opacity-[0.15] group-hover:opacity-[0.25]"
                                                                                )}>
                                                                                    {/* Half Court Line */}
                                                                                    <div className={cn(
                                                                                        "absolute top-1/2 left-0 w-full h-[1px]",
                                                                                        isMine ? "bg-primary" : booked ? "bg-black" : "bg-emerald-600"
                                                                                    )} />
                                                                                    {/* Center Line */}
                                                                                    <div className={cn(
                                                                                        "absolute top-0 left-1/2 w-[1px] h-full",
                                                                                        isMine ? "bg-primary" : booked ? "bg-black" : "bg-emerald-600"
                                                                                    )} />
                                                                                    {/* Inner Rect (Service Lines) */}
                                                                                    <div className={cn(
                                                                                        "absolute inset-2 border-[1px]",
                                                                                        isMine ? "border-primary" : booked ? "border-black" : "border-emerald-600"
                                                                                    )} />
                                                                                </div>

                                                                                <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
                                                                                    {booked ? (
                                                                                        <div className="flex items-center gap-1.5 w-full px-2">
                                                                                            <Avatar className="h-6 w-6 border border-background shadow-sm flex-shrink-0">
                                                                                                {booked.userAvatar && <AvatarImage src={booked.userAvatar} />}
                                                                                                <AvatarFallback className={cn(
                                                                                                    "text-[7px] font-bold",
                                                                                                    isMine ? "bg-primary/10 text-primary" : "bg-muted"
                                                                                                )}>
                                                                                                    {getInitials(booked.userName)}
                                                                                                </AvatarFallback>
                                                                                            </Avatar>
                                                                                            <span className={cn(
                                                                                                "truncate text-left font-semibold leading-tight flex-1 text-[10px]",
                                                                                                isMine ? "text-primary" : "text-muted-foreground"
                                                                                            )}>
                                                                                                {booked.userName}
                                                                                            </span>
                                                                                            {isMine && !isDisabled && (
                                                                                                <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-all bg-destructive/10 p-0.5 rounded text-destructive hover:bg-destructive hover:text-white">
                                                                                                    <X className="w-2.5 h-2.5" />
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    ) : (
                                                                                        <span className={cn(
                                                                                            "font-medium text-xs opacity-40 transition-opacity group-hover:opacity-60",
                                                                                            isDisabled ? "text-slate-300" : "text-emerald-700"
                                                                                        )}>
                                                                                            {subSlot.name.replace('Slot ', '')}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
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
