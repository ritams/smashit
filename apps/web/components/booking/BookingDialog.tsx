import { format } from 'date-fns';
import { Loader2, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface BookingSlotInfo {
    slot: {
        startTime: Date;
        endTime: Date;
    };
    slotId: string;
    slotName: string;
    index: number;
}

interface BookingDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    bookingInfo: BookingSlotInfo | null;
    spaceName: string | undefined;
    isAdmin: boolean;
    isBooking: boolean;
    onConfirm: () => void;
    recurrence: 'NONE' | 'DAILY' | 'WEEKLY';
    setRecurrence: (value: 'NONE' | 'DAILY' | 'WEEKLY') => void;
    recurrenceCount: string;
    setRecurrenceCount: (value: string) => void;
}

export function BookingDialog({
    open,
    onOpenChange,
    bookingInfo,
    spaceName,
    isAdmin,
    isBooking,
    onConfirm,
    recurrence,
    setRecurrence,
    recurrenceCount,
    setRecurrenceCount
}: BookingDialogProps) {
    if (!bookingInfo) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader className="space-y-3 pb-2">
                    <DialogTitle className="font-display text-2xl font-medium text-foreground/90">Confirm Booking</DialogTitle>
                    <DialogDescription className="text-muted-foreground/70">
                        Review your reservation details.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-2">
                    <div className="flex justify-between py-3 border-b border-border/40">
                        <span className="text-sm text-muted-foreground/70 font-medium uppercase tracking-wider">Space</span>
                        <span className="font-medium text-foreground/90">{spaceName}</span>
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
                <DialogFooter className="pt-6 sm:justify-end gap-3">
                    <Button variant="outline" className="h-11 px-8 rounded-lg border-border/60 hover:bg-muted/50 transition-colors" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button className="h-11 px-10 rounded-lg shadow-[0_4px_12px_-4px_rgba(var(--primary),0.3)] hover:shadow-[0_6px_16px_-4px_rgba(var(--primary),0.4)] transition-all" onClick={onConfirm} disabled={isBooking}>
                        {isBooking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
