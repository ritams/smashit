'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
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
import { cn, formatTime } from '@/lib/utils';
import { api } from '@/lib/api-client';

interface Booking {
    id: string;
    spaceId: string;
    space: { name: string };
    startTime: string;
    endTime: string;
    status: string;
    slotIndex?: number;
    slot?: { id: string; name: string; number: number } | null;
}

export default function MyBookingsPage() {
    const params = useParams();
    const { data: session } = useSession();
    const orgSlug = params.slug as string;

    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [cancelingId, setCancelingId] = useState<string | null>(null);
    const [isCanceling, setIsCanceling] = useState(false);
    const [showPastBookings, setShowPastBookings] = useState(false);

    useEffect(() => {
        async function fetchBookings() {
            if (!session?.user?.email) return;
            setLoading(true);
            try {
                const data = await api.getMyBookings(orgSlug);
                setBookings(data);
            } catch (err) {
                console.error('Failed to fetch bookings:', err);
            }
            setLoading(false);
        }
        fetchBookings();
    }, [orgSlug, session?.user?.email]);

    const handleCancel = async () => {
        if (!cancelingId || !session?.user?.email) return;
        setIsCanceling(true);
        try {
            await api.cancelBooking(orgSlug, cancelingId);
            setBookings((prev) => prev.filter((b) => b.id !== cancelingId));
        } catch (err) {
            console.error('Failed to cancel booking:', err);
        }
        setIsCanceling(false);
        setCancelingId(null);
    };

    const now = new Date();
    const upcomingBookings = bookings.filter(
        (b) => new Date(b.startTime) >= now && b.status !== 'CANCELLED'
    );
    const pastBookings = bookings.filter(
        (b) => new Date(b.startTime) < now && b.status !== 'CANCELLED'
    );

    if (loading) {
        return (
            <div className="max-w-3xl mx-auto py-8 space-y-6">
                <Skeleton className="h-8 w-48" />
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-24" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto py-8">
            {/* Header */}
            <div className="mb-10">
                <h1 className="text-2xl font-medium tracking-tight">My Bookings</h1>
                <p className="text-muted-foreground mt-1">
                    Manage your upcoming reservations
                </p>
            </div>

            {/* Upcoming Bookings */}
            {upcomingBookings.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-border rounded-lg">
                    <p className="text-lg font-medium mb-2">No upcoming bookings</p>
                    <p className="text-muted-foreground mb-6">
                        You don't have any reservations scheduled
                    </p>
                    <Link href={`/org/${orgSlug}/book`}>
                        <Button>Make a Booking</Button>
                    </Link>
                </div>
            ) : (
                <div className="space-y-3">
                    {upcomingBookings.map((booking) => {
                        const startDate = new Date(booking.startTime);
                        const isToday = startDate.toDateString() === new Date().toDateString();
                        const isTomorrow = startDate.toDateString() === new Date(Date.now() + 86400000).toDateString();

                        return (
                            <div
                                key={booking.id}
                                className={cn(
                                    "group border rounded-lg p-5 transition-all",
                                    isToday
                                        ? "bg-primary/5 border-primary/20"
                                        : "bg-background border-border hover:border-border/80"
                                )}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-2 flex-1">
                                        <div className="flex items-center gap-3">
                                            <h3 className="font-medium">{booking.space.name}</h3>
                                            {isToday && (
                                                <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                                                    Today
                                                </span>
                                            )}
                                            {isTomorrow && (
                                                <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                                    Tomorrow
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                            <span>{format(startDate, 'EEEE, MMM d')}</span>
                                            <span className="text-border">·</span>
                                            <span>{formatTime(booking.startTime)} – {formatTime(booking.endTime)}</span>
                                            {(booking.slot || booking.slotIndex !== undefined) && (
                                                <>
                                                    <span className="text-border">·</span>
                                                    <span className="text-primary font-medium">
                                                        {booking.slot?.name || `Slot ${(booking.slotIndex ?? 0) + 1}`}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => setCancelingId(booking.id)}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Past Bookings */}
            {pastBookings.length > 0 && (
                <div className="mt-12 pt-8 border-t border-border">
                    <button
                        onClick={() => setShowPastBookings(!showPastBookings)}
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <span className="text-sm font-medium">Past bookings ({pastBookings.length})</span>
                        {showPastBookings ? (
                            <ChevronUp className="h-4 w-4" />
                        ) : (
                            <ChevronDown className="h-4 w-4" />
                        )}
                    </button>

                    {showPastBookings && (
                        <div className="mt-4 space-y-2">
                            {pastBookings.map((booking) => {
                                const startDate = new Date(booking.startTime);
                                return (
                                    <div
                                        key={booking.id}
                                        className="border border-border/50 rounded-lg p-4 bg-muted/30"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4 text-sm">
                                                <span className="font-medium text-muted-foreground">{booking.space.name}</span>
                                                <span className="text-muted-foreground/60">{format(startDate, 'MMM d, yyyy')}</span>
                                                <span className="text-muted-foreground/60">{formatTime(booking.startTime)}</span>
                                            </div>
                                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
                                                Completed
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Cancel Dialog */}
            <Dialog open={!!cancelingId} onOpenChange={() => setCancelingId(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Cancel booking?</DialogTitle>
                        <DialogDescription>
                            This will release the slot for other members.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-2">
                        <Button variant="outline" onClick={() => setCancelingId(null)}>
                            Keep
                        </Button>
                        <Button variant="destructive" onClick={handleCancel} disabled={isCanceling}>
                            {isCanceling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Cancel booking
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
