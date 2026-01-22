'use client';

import { format, isBefore, isAfter, endOfDay, addDays, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import type { MobileBookingViewProps, SpaceAvailability, SubSlot, Slot } from './types/booking.types';

/**
 * Mobile-optimized booking view with scrollable slots
 */
export function MobileBookingView({
    data,
    timeRows,
    currentUserEmail,
    viewMode,
    onBook,
    onCancel,
}: MobileBookingViewProps) {
    const now = new Date();

    return (
        <div className="md:hidden flex flex-col gap-6 pb-24 px-4 overflow-y-auto no-scrollbar">
            {data.map((item) => (
                <SpaceSection
                    key={item.space.id}
                    item={item}
                    timeRows={timeRows}
                    currentUserEmail={currentUserEmail}
                    viewMode={viewMode}
                    now={now}
                    onBook={onBook}
                    onCancel={onCancel}
                />
            ))}
            {/* Spacer for bottom nav */}
            <div className="h-20" />
        </div>
    );
}

/** Single space section with time slots */
function SpaceSection({
    item,
    timeRows,
    currentUserEmail,
    viewMode,
    now,
    onBook,
    onCancel,
}: {
    item: SpaceAvailability;
    timeRows: Date[];
    currentUserEmail?: string;
    viewMode: 'ALL' | 'SINGLE';
    now: Date;
    onBook: MobileBookingViewProps['onBook'];
    onCancel: MobileBookingViewProps['onCancel'];
}) {
    const configuredSlots = item.space.slots?.length > 0
        ? item.space.slots
        : Array.from({ length: item.space.capacity }, (_, i) => ({
            id: `legacy-${i}`,
            name: `${i + 1}`,
            number: i + 1,
            isActive: true
        }));

    return (
        <div className={cn(
            "overflow-hidden",
            viewMode === 'SINGLE' ? "" : "border-b border-border/50 pb-6 last:border-0"
        )}>
            {/* Header for space - Hide in single view */}
            <div className={cn(
                "flex items-center justify-between mb-3",
                viewMode === 'SINGLE' ? "hidden" : ""
            )}>
                <h3 className="font-semibold text-sm">{item.space.name}</h3>
                <div className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full capitalize">
                    {item.space.type}
                </div>
            </div>

            <div className="space-y-3">
                {timeRows.map((rowTime) => {
                    const rowHour = rowTime.getHours();
                    const slot = item.slots.find(s => {
                        const sTime = new Date(s.startTime);
                        return sTime.getHours() === rowHour && isSameDay(sTime, rowTime);
                    });

                    if (!slot) return null;

                    return (
                        <MobileTimeRow
                            key={rowTime.toISOString()}
                            rowTime={rowTime}
                            slot={slot}
                            space={item.space}
                            configuredSlots={configuredSlots}
                            currentUserEmail={currentUserEmail}
                            now={now}
                            onBook={onBook}
                            onCancel={onCancel}
                        />
                    );
                })}
            </div>
        </div>
    );
}

/** Mobile time row with horizontal scrolling slots */
function MobileTimeRow({
    rowTime,
    slot,
    space,
    configuredSlots,
    currentUserEmail,
    now,
    onBook,
    onCancel,
}: {
    rowTime: Date;
    slot: Slot;
    space: SpaceAvailability['space'];
    configuredSlots: SubSlot[];
    currentUserEmail?: string;
    now: Date;
    onBook: MobileBookingViewProps['onBook'];
    onCancel: MobileBookingViewProps['onCancel'];
}) {
    return (
        <div className="flex items-center gap-3">
            <div className="w-10 flex-shrink-0 text-left">
                <div className="text-xs font-semibold">{format(rowTime, 'h:mm')}</div>
                <div className="text-[9px] text-muted-foreground uppercase font-medium">{format(rowTime, 'a')}</div>
            </div>
            <div className="flex-1 flex gap-2 overflow-x-auto no-scrollbar -mr-4 pr-4 pl-1">
                {configuredSlots.map((subSlot, idx) => (
                    <MobileSlotButton
                        key={`${space.id}-${subSlot.id}-${rowTime.getHours()}`}
                        slot={slot}
                        subSlot={subSlot}
                        subSlotIndex={idx}
                        space={space}
                        currentUserEmail={currentUserEmail}
                        now={now}
                        onBook={onBook}
                        onCancel={onCancel}
                    />
                ))}
            </div>
        </div>
    );
}

/** Individual mobile slot button */
function MobileSlotButton({
    slot,
    subSlot,
    subSlotIndex,
    space,
    currentUserEmail,
    now,
    onBook,
    onCancel,
}: {
    slot: Slot;
    subSlot: SubSlot;
    subSlotIndex: number;
    space: SpaceAvailability['space'];
    currentUserEmail?: string;
    now: Date;
    onBook: MobileBookingViewProps['onBook'];
    onCancel: MobileBookingViewProps['onCancel'];
}) {
    const booked = slot.bookings?.find(b => b.slotId === subSlot.id || b.slotIndex === subSlotIndex);
    const isMine = booked?.userEmail === currentUserEmail;
    const slotStartTime = new Date(slot.startTime);
    const isPast = isBefore(slotStartTime, now);
    const maxAdvanceDays = space.rules?.maxAdvanceDays ?? 7;
    const maxAllowedDate = endOfDay(addDays(now, maxAdvanceDays));
    const isTooFarAhead = isAfter(slotStartTime, maxAllowedDate);
    const isDisabled = isPast || isTooFarAhead;

    const handleClick = () => {
        if (isMine && booked) {
            onCancel({ booking: booked, slot, space });
        } else if (!booked && !isDisabled) {
            onBook({ space, slotRaw: slot, subSlot, idx: subSlotIndex });
        }
    };

    return (
        <button
            disabled={isDisabled || (!!booked && !isMine)}
            onClick={handleClick}
            className={cn(
                "h-8 min-w-[70px] rounded-lg border flex items-center justify-center transition-all text-xs relative overflow-hidden flex-shrink-0",
                booked
                    ? isMine
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "bg-muted border-border text-muted-foreground/50 cursor-not-allowed"
                    : isDisabled
                        ? "bg-muted/10 border-border/10 opacity-30 cursor-not-allowed"
                        : "bg-card border-border shadow-sm hover:border-primary hover:bg-primary/5 active:bg-primary/10"
            )}
        >
            {booked ? (
                <div className="flex items-center justify-center gap-1.5 w-full px-2">
                    {isMine ? (
                        <span className="text-[10px] font-medium">My Book</span>
                    ) : (
                        <span className="truncate text-[10px] text-muted-foreground">Booked</span>
                    )}
                </div>
            ) : (
                <span className="text-muted-foreground/80 font-medium">{subSlot.name}</span>
            )}
        </button>
    );
}
