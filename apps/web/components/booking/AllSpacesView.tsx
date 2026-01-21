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
    refreshTrigger?: number;
    spaceType?: string;
    categoryName?: string;
}

interface Booking {
    id: string;
    userId: string;
    userEmail: string;
    userName: string;
    userAvatar?: string;
    startTime: string;
    endTime: string;
    slotId?: string;
    slotIndex?: number;
}

interface Slot {
    startTime: string;
    endTime: string;
    isAvailable: boolean;
    bookings?: Booking[];
}

interface SpaceAvailability {
    space: {
        id: string;
        name: string;
        type: string;
        capacity: number;
        slots: any[];
        rules?: {
            maxAdvanceDays: number;
        };
    };
    slots: Slot[];
}

export function AllSpacesView({ date, orgSlug, onBook, onCancel, refreshTrigger, spaceType, categoryName }: AllSpacesViewProps) {
    const { data: session } = useSession();
    const [data, setData] = useState<SpaceAvailability[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter data by space type if provided
    const filteredData = spaceType
        ? data.filter(d => d.space.type === spaceType)
        : data;

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const formattedDate = format(date, 'yyyy-MM-dd');
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const result = await api.getAllAvailability(orgSlug, formattedDate, timezone);
            setData(result);
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
            <div className="h-full flex items-center justify-center">
                <div className="space-y-4 w-full max-w-4xl">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-[400px] w-full" />
                </div>
            </div>
        );
    }

    if (filteredData.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <AlertCircle className="h-8 w-8 mb-3" />
                <p className="text-lg font-medium">No {categoryName ? categoryName.toLowerCase() + ' ' : ''}spaces available</p>
                <p className="text-sm">Contact your administrator to set up booking spaces.</p>
            </div>
        );
    }

    const now = new Date();
    const endHour = 22;
    const timeRows: Date[] = [];
    const baseDate = startOfDay(date);
    const isToday = isSameDay(date, now);
    const openingHour = 6;
    const startHour = isToday ? Math.max(now.getHours(), openingHour) : openingHour;

    for (let h = startHour; h < endHour; h++) {
        const rowTime = addHours(baseDate, h);
        if (!isToday || !isBefore(rowTime, now)) {
            timeRows.push(rowTime);
        }
    }

    if (isToday && now.getHours() >= endHour) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <p className="text-lg font-medium">Booking closed for today</p>
                <p className="text-sm">Select another date to make a reservation.</p>
            </div>
        );
    }

    // Flatten: each space has multiple slots (sub-slots)
    interface ColumnDef {
        space: SpaceAvailability['space'];
        subSlot: { id: string; name: string; number: number };
        subSlotIndex: number;
    }

    const columns: ColumnDef[] = [];
    filteredData.forEach((item) => {
        const configuredSlots = item.space.slots?.length > 0
            ? item.space.slots
            : Array.from({ length: item.space.capacity }, (_, i) => ({
                id: `legacy-${i}`,
                name: `${i + 1}`,
                number: i + 1,
                isActive: true
            }));

        configuredSlots.forEach((subSlot: any, idx: number) => {
            columns.push({
                space: item.space,
                subSlot,
                subSlotIndex: idx
            });
        });
    });

    // Group columns by space for header rendering
    const spaceGroups = filteredData.map((item) => ({
        space: item.space,
        colSpan: item.space.slots?.length > 0 ? item.space.slots.length : item.space.capacity
    }));

    return (
        <TooltipProvider>
            <div className="h-full flex flex-col overflow-hidden">
                {/* Legend */}
                <div className="flex-shrink-0 flex items-center gap-6 text-sm pb-4">
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

                {/* Scrollable Grid Container - Desktop */}
                <div className="hidden md:flex flex-1 overflow-auto border rounded-lg bg-card">
                    <table className="w-full border-collapse min-w-max">
                        {/* Sticky Header - Space Names */}
                        <thead className="sticky top-0 z-20 bg-muted">
                            {/* Space names row */}
                            <tr className="border-b">
                                <th className="sticky left-0 z-30 bg-muted w-20 min-w-20 border-r px-3 py-2">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Time</span>
                                </th>
                                {spaceGroups.map((group, i) => (
                                    <th
                                        key={group.space.id}
                                        colSpan={group.colSpan}
                                        className={cn(
                                            "px-2 py-2 text-left bg-muted/50",
                                            i > 0 && "border-l-[4px] border-border" // Obvious divider
                                        )}
                                    >
                                        <span className="font-medium text-sm">{group.space.name}</span>
                                    </th>
                                ))}
                            </tr>
                            {/* Slot numbers row */}
                            <tr className="border-b bg-muted/50">
                                <th className="sticky left-0 z-30 bg-muted/50 border-r"></th>
                                {columns.map((col, i) => {
                                    const isFirstOfSpace = i === 0 || columns[i - 1].space.id !== col.space.id;
                                    return (
                                        <th
                                            key={`${col.space.id}-${col.subSlot.id}`}
                                            className={cn(
                                                "px-1 py-1.5 text-center min-w-[60px]",
                                                isFirstOfSpace && i > 0 && "border-l-[4px] border-border"
                                            )}
                                        >
                                            <span className="text-xs text-muted-foreground">{col.subSlot.name}</span>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>

                        {/* Body */}
                        <tbody>
                            {timeRows.map((rowTime) => {
                                const rowHour = rowTime.getHours();

                                return (
                                    <tr key={rowTime.toISOString()} className="border-b border-border/50 hover:bg-muted/30">
                                        {/* Time cell - sticky left */}
                                        <td className="sticky left-0 z-10 bg-card border-r px-3 py-2 text-right whitespace-nowrap">
                                            <div className="text-sm font-medium">{format(rowTime, 'h:mm')}</div>
                                            <div className="text-[10px] text-muted-foreground uppercase">{format(rowTime, 'a')}</div>
                                        </td>

                                        {/* Slot cells */}
                                        {columns.map((col, colIdx) => {
                                            const spaceData = filteredData.find(d => d.space.id === col.space.id);
                                            const slot = spaceData?.slots.find(s => {
                                                const sTime = new Date(s.startTime);
                                                return sTime.getHours() === rowHour && isSameDay(sTime, rowTime);
                                            });

                                            if (!slot) {
                                                const isFirstOfSpace = colIdx === 0 || columns[colIdx - 1].space.id !== col.space.id;
                                                return (
                                                    <td
                                                        key={`${col.space.id}-${col.subSlot.id}-${rowHour}`}
                                                        className={cn(
                                                            "p-1",
                                                            isFirstOfSpace && colIdx > 0 && "border-l-[4px] border-border"
                                                        )}
                                                    >
                                                        <div className="h-10 bg-muted/30 rounded" />
                                                    </td>
                                                );
                                            }

                                            const booked = slot.bookings?.find(b =>
                                                b.slotId === col.subSlot.id || b.slotIndex === col.subSlotIndex
                                            );
                                            const isMine = booked?.userEmail === session?.user?.email;
                                            const slotStartTime = new Date(slot.startTime);
                                            const isPast = isBefore(slotStartTime, now);
                                            const maxAdvanceDays = col.space.rules?.maxAdvanceDays ?? 7;
                                            const maxAllowedDate = endOfDay(addDays(now, maxAdvanceDays));
                                            const isTooFarAhead = isAfter(slotStartTime, maxAllowedDate);
                                            const isDisabled = isPast || isTooFarAhead;
                                            const isFirstOfSpace = colIdx === 0 || columns[colIdx - 1].space.id !== col.space.id;

                                            return (
                                                <td
                                                    key={`${col.space.id}-${col.subSlot.id}-${rowHour}`}
                                                    className={cn(
                                                        "p-1",
                                                        isFirstOfSpace && colIdx > 0 && "border-l-[4px] border-border"
                                                    )}
                                                >
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <button
                                                                disabled={isDisabled || (!!booked && !isMine)}
                                                                onClick={() => {
                                                                    if (isMine && booked) {
                                                                        onCancel({ booking: booked, slot, space: col.space });
                                                                    } else if (!booked && !isDisabled) {
                                                                        onBook({ space: col.space, slotRaw: slot, subSlot: col.subSlot, idx: col.subSlotIndex });
                                                                    }
                                                                }}
                                                                className={cn(
                                                                    "w-full h-10 rounded border flex items-center justify-center transition-all text-xs group relative",
                                                                    booked
                                                                        ? isMine
                                                                            ? "bg-primary/10 border-primary/30 hover:bg-primary/20"
                                                                            : "bg-muted border-border cursor-not-allowed"
                                                                        : isDisabled
                                                                            ? "bg-muted/30 border-border/30 opacity-40 cursor-not-allowed"
                                                                            : "bg-background border-border hover:border-primary hover:bg-primary/5 cursor-pointer"
                                                                )}
                                                            >
                                                                {booked ? (
                                                                    <div className="flex items-center gap-1.5 px-1.5 overflow-hidden w-full">
                                                                        <Avatar className="h-5 w-5 flex-shrink-0">
                                                                            {booked.userAvatar && <AvatarImage src={booked.userAvatar} />}
                                                                            <AvatarFallback className={cn(
                                                                                "text-[8px]",
                                                                                isMine ? "bg-primary/20 text-primary" : "bg-muted-foreground/10"
                                                                            )}>
                                                                                {getInitials(booked.userName)}
                                                                            </AvatarFallback>
                                                                        </Avatar>
                                                                        <span className={cn(
                                                                            "text-[10px] font-medium truncate",
                                                                            isMine ? "text-primary" : "text-muted-foreground"
                                                                        )}>
                                                                            {booked.userName.split(' ')[0]}
                                                                        </span>
                                                                        {isMine && (
                                                                            <X className="h-3 w-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity absolute top-0.5 right-0.5" />
                                                                        )}
                                                                    </div>
                                                                ) : null}
                                                            </button>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top" className="text-xs">
                                                            {booked
                                                                ? isMine
                                                                    ? 'Click to cancel'
                                                                    : booked.userName
                                                                : isPast
                                                                    ? 'Past'
                                                                    : isTooFarAhead
                                                                        ? `Available ${maxAdvanceDays}d ahead`
                                                                        : 'Book'}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View - Cards */}
                <div className="md:hidden flex flex-col gap-6 pb-20">
                    {filteredData.map((item) => (
                        <div key={item.space.id} className="bg-card border rounded-xl overflow-hidden shadow-sm">
                            <div className="bg-muted/30 px-4 py-3 border-b">
                                <h3 className="font-semibold text-base">{item.space.name}</h3>
                                <p className="text-xs text-muted-foreground capitalize">{item.space.type}</p>
                            </div>
                            <div className="p-4 space-y-4">
                                {timeRows.map((rowTime) => {
                                    const rowHour = rowTime.getHours();
                                    const slot = item.slots.find(s => {
                                        const sTime = new Date(s.startTime);
                                        return sTime.getHours() === rowHour && isSameDay(sTime, rowTime);
                                    });

                                    if (!slot) return null;

                                    const configuredSlots = item.space.slots?.length > 0
                                        ? item.space.slots
                                        : Array.from({ length: item.space.capacity }, (_, i) => ({
                                            id: `legacy-${i}`,
                                            name: `${i + 1}`,
                                            number: i + 1,
                                            isActive: true
                                        }));

                                    return (
                                        <div key={rowTime.toISOString()} className="flex items-center gap-3">
                                            <div className="w-16 flex-shrink-0 text-right">
                                                <div className="text-sm font-medium">{format(rowTime, 'h:mm')}</div>
                                                <div className="text-[10px] text-muted-foreground uppercase">{format(rowTime, 'a')}</div>
                                            </div>
                                            <div className="flex-1 grid grid-cols-2 gap-2">
                                                {configuredSlots.map((subSlot: any, idx: number) => {
                                                    const booked = slot.bookings?.find(b =>
                                                        b.slotId === subSlot.id || b.slotIndex === idx
                                                    );
                                                    const isMine = booked?.userEmail === session?.user?.email;
                                                    const slotStartTime = new Date(slot.startTime);
                                                    const isPast = isBefore(slotStartTime, now);
                                                    const maxAdvanceDays = item.space.rules?.maxAdvanceDays ?? 7;
                                                    const maxAllowedDate = endOfDay(addDays(now, maxAdvanceDays));
                                                    const isTooFarAhead = isAfter(slotStartTime, maxAllowedDate);
                                                    const isDisabled = isPast || isTooFarAhead;

                                                    return (
                                                        <button
                                                            key={`${item.space.id}-${subSlot.id}-${rowHour}`}
                                                            disabled={isDisabled || (!!booked && !isMine)}
                                                            onClick={() => {
                                                                if (isMine && booked) {
                                                                    onCancel({ booking: booked, slot, space: item.space });
                                                                } else if (!booked && !isDisabled) {
                                                                    onBook({ space: item.space, slotRaw: slot, subSlot, idx });
                                                                }
                                                            }}
                                                            className={cn(
                                                                "h-10 rounded-md border flex items-center justify-center transition-all text-xs relative",
                                                                booked
                                                                    ? isMine
                                                                        ? "bg-primary/10 border-primary/30 text-primary"
                                                                        : "bg-muted border-border text-muted-foreground cursor-not-allowed opacity-70"
                                                                    : isDisabled
                                                                        ? "bg-muted/20 border-border/20 opacity-30 cursor-not-allowed"
                                                                        : "bg-background border-border hover:border-primary hover:bg-primary/5 active:bg-primary/10"
                                                            )}
                                                        >
                                                            {booked ? (
                                                                isMine ? 'My Booking' : 'Booked'
                                                            ) : (
                                                                subSlot.name
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </TooltipProvider >
    );
}
