import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export interface CancelBookingInfo {
    booking: {
        id: string;
        startTime: string; // ISO string 
        endTime: string;   // ISO string
    };
    slot: {
        startTime: Date;
        endTime: Date;
    };
}

interface CancelBookingDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    cancelInfo: CancelBookingInfo | null;
    spaceName: string | undefined;
    isCanceling: boolean;
    onConfirm: () => void;
}

export function CancelBookingDialog({
    open,
    onOpenChange,
    cancelInfo,
    spaceName,
    isCanceling,
    onConfirm
}: CancelBookingDialogProps) {
    if (!cancelInfo) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader className="space-y-3 pb-2">
                    <DialogTitle className="font-display text-2xl font-medium text-foreground/90">Cancel this booking?</DialogTitle>
                    <DialogDescription className="text-muted-foreground/70">
                        The slot will become available for other members.
                    </DialogDescription>
                </DialogHeader>
                {cancelInfo && (
                    <div className="py-2">
                        <div className="flex justify-between py-3 border-b border-border/40">
                            <span className="text-sm text-muted-foreground/70 font-medium uppercase tracking-wider">Space</span>
                            <span className="font-medium text-foreground/90">{spaceName}</span>
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
                    <Button variant="outline" className="h-11 px-8 rounded-lg border-border/60 hover:bg-muted/50 transition-colors" onClick={() => onOpenChange(false)}>Keep booking</Button>
                    <Button
                        variant="ghost"
                        onClick={onConfirm}
                        disabled={isCanceling}
                        className="h-11 px-8 rounded-lg text-muted-foreground/70 hover:text-destructive hover:bg-destructive/[0.03] transition-colors"
                    >
                        {isCanceling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Cancel Appointment
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
