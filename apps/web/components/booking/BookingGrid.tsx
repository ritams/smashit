'use client';

import { format, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BookingCell } from './BookingCell';
import type { BookingGridProps, SpaceAvailability } from './types/booking.types';

/**
 * Desktop booking grid with sticky headers
 * Displays all spaces in a table format with time rows
 */
export function BookingGrid({
    data,
    timeRows,
    columns,
    spaceGroups,
    currentUserEmail,
    onBook,
    onCancel,
}: BookingGridProps) {
    return (
        <TooltipProvider>
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
                                        "px-2 py-3 text-center border-b border-border/40 transition-colors",
                                        i % 2 === 0 ? "bg-muted/10" : "bg-background",
                                        i > 0 && "border-l-[2px] border-primary/20"
                                    )}
                                >
                                    <span className="font-display text-base font-medium tracking-tight text-foreground/90">
                                        {group.space.name}
                                    </span>
                                </th>
                            ))}
                        </tr>
                        {/* Slot numbers row */}
                        <tr className="border-b bg-muted/50">
                            <th className="sticky left-0 z-30 bg-muted/50 border-r"></th>
                            {columns.map((col, i) => {
                                const isFirstOfSpace = i === 0 || columns[i - 1].space.id !== col.space.id;
                                const spaceGroupIdx = data.findIndex(d => d.space.id === col.space.id);
                                return (
                                    <th
                                        key={`${col.space.id}-${col.subSlot.id}`}
                                        className={cn(
                                            "px-1 py-2 text-center min-w-[70px] border-b border-border/40 transition-colors",
                                            spaceGroupIdx % 2 === 0 ? "bg-muted/10" : "bg-background",
                                            isFirstOfSpace && i > 0 && "border-l-[2px] border-primary/20"
                                        )}
                                    >
                                        <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">
                                            {col.subSlot.name}
                                        </span>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>

                    {/* Body */}
                    <tbody>
                        {timeRows.map((rowTime) => (
                            <TimeRow
                                key={rowTime.toISOString()}
                                rowTime={rowTime}
                                data={data}
                                columns={columns}
                                currentUserEmail={currentUserEmail}
                                onBook={onBook}
                                onCancel={onCancel}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </TooltipProvider>
    );
}

/** Single time row in the grid */
function TimeRow({
    rowTime,
    data,
    columns,
    currentUserEmail,
    onBook,
    onCancel,
}: {
    rowTime: Date;
    data: SpaceAvailability[];
    columns: BookingGridProps['columns'];
    currentUserEmail?: string;
    onBook: BookingGridProps['onBook'];
    onCancel: BookingGridProps['onCancel'];
}) {
    const rowHour = rowTime.getHours();

    return (
        <tr className="border-b border-border/50 hover:bg-muted/30">
            {/* Time cell - sticky left */}
            <td className="sticky left-0 z-10 bg-card border-r px-3 py-2 text-right whitespace-nowrap">
                <div className="text-sm font-medium">{format(rowTime, 'h:mm')}</div>
                <div className="text-[10px] text-muted-foreground uppercase">{format(rowTime, 'a')}</div>
            </td>

            {/* Slot cells */}
            {columns.map((col, colIdx) => {
                const spaceData = data.find(d => d.space.id === col.space.id);
                const slot = spaceData?.slots.find(s => {
                    const sTime = new Date(s.startTime);
                    return sTime.getHours() === rowHour && isSameDay(sTime, rowTime);
                });

                if (!slot) {
                    const isFirstOfSpace = colIdx === 0 || columns[colIdx - 1].space.id !== col.space.id;
                    return (
                        <td
                            key={`${col.space.id}-${col.subSlot.id}-${rowHour}`}
                            className={cn("p-1", isFirstOfSpace && colIdx > 0 && "border-l-[4px] border-border")}
                        >
                            <div className="h-10 bg-muted/30 rounded" />
                        </td>
                    );
                }

                const isFirstOfSpace = colIdx === 0 || columns[colIdx - 1].space.id !== col.space.id;
                const spaceGroupIndex = data.findIndex(d => d.space.id === col.space.id);

                return (
                    <BookingCell
                        key={`${col.space.id}-${col.subSlot.id}-${rowHour}`}
                        slot={slot}
                        column={col}
                        columnIndex={colIdx}
                        rowTime={rowTime}
                        currentUserEmail={currentUserEmail}
                        onBook={onBook}
                        onCancel={onCancel}
                        spaceGroupIndex={spaceGroupIndex}
                        isFirstOfSpace={isFirstOfSpace}
                    />
                );
            })}
        </tr>
    );
}
