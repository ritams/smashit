'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { Calendar, Clock, Trash2, Loader2, Archive, ChevronDown, ChevronUp, Hash } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

    // Fetch my bookings
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

    // Upcoming bookings: start time is in the future (start time >= now)
    const upcomingBookings = bookings.filter(
        (b) => new Date(b.startTime) >= now && b.status !== 'CANCELLED'
    );

    // Past bookings: start time is in the past (start time < now) - archived
    const pastBookings = bookings.filter(
        (b) => new Date(b.startTime) < now && b.status !== 'CANCELLED'
    );

    if (loading) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">My Bookings</h1>
                    <p className="text-muted-foreground">Loading your bookings...</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-40" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 p-4 md:p-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">My Bookings</h1>
                <p className="text-muted-foreground text-lg">
                    View and manage your upcoming bookings
                </p>
            </div>

            {upcomingBookings.length === 0 ? (
                <Card className="border-dashed bg-muted/30">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-6">
                            <Calendar className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">No upcoming bookings</h3>
                        <p className="text-muted-foreground max-w-sm mb-8">
                            You don&apos;t have any upcoming bookings scheduled. Book a court to get started!
                        </p>
                        <Link href={`/org/${orgSlug}/book`}>
                            <Button size="lg" className="rounded-full px-8">Book a Space</Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {upcomingBookings.map((booking) => {
                        const startDate = new Date(booking.startTime);
                        const isToday =
                            startDate.toDateString() === new Date().toDateString();
                        const isTomorrow =
                            startDate.toDateString() ===
                            new Date(Date.now() + 86400000).toDateString();

                        return (
                            <Card
                                key={booking.id}
                                className={cn(
                                    'group overflow-hidden transition-all duration-200 border shadow-sm hover:shadow-md rounded-xl',
                                    isToday ? 'border-primary/50 bg-primary/5' : 'bg-card'
                                )}
                            >
                                <CardHeader className="pb-3 pt-5 px-5">
                                    <div className="flex items-start justify-between gap-4">
                                        <CardTitle className="text-lg font-bold leading-tight">
                                            {booking.space.name}
                                        </CardTitle>
                                        {isToday && (
                                            <span className="flex-shrink-0 px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wide">
                                                Today
                                            </span>
                                        )}
                                        {isTomorrow && (
                                            <span className="flex-shrink-0 px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-[10px] font-bold uppercase tracking-wide">
                                                Tomorrow
                                            </span>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4 px-5 pb-5">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3 text-sm">
                                            <div className="p-1.5 rounded-md bg-muted/50 text-muted-foreground">
                                                <Calendar className="h-4 w-4" />
                                            </div>
                                            <span className="font-medium text-foreground/80">
                                                {format(startDate, 'EEEE, MMMM d, yyyy')}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm">
                                            <div className="p-1.5 rounded-md bg-muted/50 text-muted-foreground">
                                                <Clock className="h-4 w-4" />
                                            </div>
                                            <span className="font-medium text-foreground/80">
                                                {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                                            </span>
                                        </div>
                                        {(booking.slot || booking.slotIndex !== undefined) && (
                                            <div className="flex items-center gap-3 text-sm">
                                                <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                                                    <Hash className="h-4 w-4" />
                                                </div>
                                                <span className="font-semibold text-primary">
                                                    {booking.slot?.name || `Slot ${(booking.slotIndex ?? 0) + 1}`}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-2">
                                        <Button
                                            variant="outline"
                                            className="w-full border-dashed text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/5 dark:hover:bg-destructive/10 transition-colors h-10"
                                            onClick={() => setCancelingId(booking.id)}
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Cancel Booking
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Past Bookings Section */}
            {pastBookings.length > 0 && (
                <div className="space-y-4">
                    <button
                        onClick={() => setShowPastBookings(!showPastBookings)}
                        className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors group"
                    >
                        <div className="p-2 rounded-lg bg-muted/50 group-hover:bg-muted transition-colors">
                            <Archive className="h-5 w-5" />
                        </div>
                        <span className="text-lg font-semibold">
                            Past Bookings ({pastBookings.length})
                        </span>
                        {showPastBookings ? (
                            <ChevronUp className="h-5 w-5" />
                        ) : (
                            <ChevronDown className="h-5 w-5" />
                        )}
                    </button>

                    {showPastBookings && (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {pastBookings.map((booking) => {
                                const startDate = new Date(booking.startTime);

                                return (
                                    <Card
                                        key={booking.id}
                                        className="overflow-hidden border border-muted bg-muted/20 rounded-xl opacity-70"
                                    >
                                        <CardHeader className="pb-2 pt-4 px-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <CardTitle className="text-base font-semibold leading-tight text-muted-foreground">
                                                    {booking.space.name}
                                                </CardTitle>
                                                <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-medium uppercase tracking-wide border border-muted-foreground/20">
                                                    Completed
                                                </span>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="px-4 pb-4">
                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    <span className="font-medium">
                                                        {format(startDate, 'EEEE, MMMM d, yyyy')}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Clock className="h-3.5 w-3.5" />
                                                    <span className="font-medium">
                                                        {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                                                    </span>
                                                </div>
                                                {(booking.slot || booking.slotIndex !== undefined) && (
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <Hash className="h-3.5 w-3.5" />
                                                        <span className="font-medium">
                                                            {booking.slot?.name || `Slot ${(booking.slotIndex ?? 0) + 1}`}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Cancel Confirmation Dialog */}
            <Dialog open={!!cancelingId} onOpenChange={() => setCancelingId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cancel Booking</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to cancel this booking? This action cannot be
                            undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCancelingId(null)}>
                            Keep Booking
                        </Button>
                        <Button variant="destructive" onClick={handleCancel} disabled={isCanceling}>
                            {isCanceling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Yes, Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
