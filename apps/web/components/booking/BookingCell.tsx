'use client';

import { isBefore, isAfter, endOfDay, addDays, format } from 'date-fns';
import { X } from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import type { BookingCellProps, Booking } from './types/booking.types';

/**
 * Individual booking cell in the grid
 * Handles booked/available states, tooltips, and click interactions
 */
export function BookingCell({
    slot,
    column,
    columnIndex,
    rowTime,
    currentUserEmail,
    onBook,
    onCancel,
    spaceGroupIndex,
    isFirstOfSpace,
}: BookingCellProps) {
    const now = new Date();
    const slotStartTime = new Date(slot.startTime);

    // Find booking for this specific sub-slot
    const booked = slot.bookings?.find(
        (b) => b.slotId === column.subSlot.id || b.slotIndex === column.subSlotIndex
    );

    const isMine = booked?.userEmail === currentUserEmail;
    const isPast = isBefore(slotStartTime, now);
    const maxAdvanceDays = column.space.rules?.maxAdvanceDays ?? 7;
    const maxAllowedDate = endOfDay(addDays(now, maxAdvanceDays));
    const isTooFarAhead = isAfter(slotStartTime, maxAllowedDate);
    const isDisabled = isPast || isTooFarAhead;

    const handleClick = () => {
        if (isMine && booked) {
            onCancel({ booking: booked, slot, space: column.space });
        } else if (!booked && !isDisabled) {
            onBook({ space: column.space, slotRaw: slot, subSlot: column.subSlot, idx: column.subSlotIndex });
        }
    };

    return (
        <td
            className={cn(
                "p-1 transition-colors",
                spaceGroupIndex % 2 === 0 ? "bg-muted/10" : "bg-background",
                isFirstOfSpace && columnIndex > 0 && "border-l-[2px] border-primary/20"
            )}
        >
            <Tooltip delayDuration={0} disableHoverableContent>
                <TooltipTrigger asChild>
                    <button
                        disabled={isDisabled || (!!booked && !isMine)}
                        onClick={handleClick}
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
                        {booked && <BookedContent booking={booked} isMine={isMine} />}
                    </button>
                </TooltipTrigger>
                <TooltipContent
                    side="top"
                    className="p-0 border-none bg-transparent shadow-none pointer-events-none"
                    sideOffset={10}
                >
                    <CellTooltip
                        spaceName={column.space.name}
                        subSlotName={column.subSlot.name}
                        startTime={slotStartTime}
                        endTime={new Date(slot.endTime)}
                        booking={booked}
                        isMine={isMine}
                        isPast={isPast}
                    />
                </TooltipContent>
            </Tooltip>
        </td>
    );
}

/** Booking avatar and name display */
function BookedContent({ booking, isMine }: { booking: Booking; isMine: boolean }) {
    return (
        <div className="flex items-center gap-1.5 px-1.5 overflow-hidden w-full">
            <Avatar className="h-5 w-5 flex-shrink-0">
                {booking.userAvatar && <AvatarImage src={booking.userAvatar} />}
                <AvatarFallback className={cn(
                    "text-[8px]",
                    isMine ? "bg-primary/20 text-primary" : "bg-muted-foreground/10"
                )}>
                    {getInitials(booking.userName)}
                </AvatarFallback>
            </Avatar>
            <span className={cn(
                "text-[10px] font-medium truncate",
                isMine ? "text-primary" : "text-muted-foreground"
            )}>
                {booking.userName.split(' ')[0]}
            </span>
            {isMine && (
                <X className="h-3 w-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity absolute top-0.5 right-0.5" />
            )}
        </div>
    );
}

/** Rich tooltip content */
function CellTooltip({
    spaceName,
    subSlotName,
    startTime,
    endTime,
    booking,
    isMine,
    isPast,
}: {
    spaceName: string;
    subSlotName: string;
    startTime: Date;
    endTime: Date;
    booking?: Booking;
    isMine: boolean;
    isPast: boolean;
}) {
    const statusText = booking
        ? (isMine ? 'Your Reservation' : `Booked by ${booking.userName}`)
        : (isPast ? 'Reservations closed' : 'Available for booking');

    return (
        <div className="bg-card border border-border/60 shadow-xl rounded-xl p-4 min-w-[180px] backdrop-blur-md">
            <div className="space-y-3">
                <div className="space-y-1">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold leading-none">
                        {spaceName}
                    </div>
                    <div className="text-sm uppercase tracking-widest text-primary font-bold">
                        {subSlotName}
                    </div>
                </div>
                <div className="h-px w-full bg-border/40" />
                <div className="space-y-1">
                    <div className="text-base font-medium text-foreground tracking-tight">
                        {format(startTime, 'h:mm a')} – {format(endTime, 'h:mm a')}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                        {statusText}
                    </div>
                </div>
            </div>
        </div>
    );
}
