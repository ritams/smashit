'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import {
    Loader2,
    Calendar,
    History,
    MapPin,
    Clock,
    X,
    CalendarDays
} from 'lucide-react';
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
    space: { name: string; location?: string };
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

    // 'upcoming' | 'past'
    const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

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
    ).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    const pastBookings = bookings.filter(
        (b) => new Date(b.startTime) < now && b.status !== 'CANCELLED'
    ).sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

    const activeBookings = activeTab === 'upcoming' ? upcomingBookings : pastBookings;

    if (loading) {
        return (
            <div className="flex flex-col lg:flex-row min-h-[calc(100vh-10rem)] gap-12">
                <div className="hidden lg:block w-64 flex-shrink-0">
                    <Skeleton className="h-48 w-full rounded-2xl bg-muted/20" />
                </div>
                <div className="flex-1 py-4 space-y-8">
                    <Skeleton className="h-12 w-48 rounded-xl bg-muted/20" />
                    <Skeleton className="h-24 w-full rounded-xl bg-muted/20" />
                    <Skeleton className="h-24 w-full rounded-xl bg-muted/20" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:flex-row min-h-[calc(100vh-10rem)]">
            {/* Sidebar Navigation */}
            <aside className="hidden lg:block w-64 flex-shrink-0 border-r border-border/40 pr-10 py-2">
                <nav className="sticky top-20 self-start">
                    <p className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[.25em] mb-8 px-4">
                        My Bookings
                    </p>
                    <div className="space-y-2">
                        <button
                            onClick={() => setActiveTab('upcoming')}
                            className={cn(
                                "group w-full text-left px-5 py-3.5 rounded-2xl transition-all duration-500 relative flex items-center justify-between gap-3 border",
                                activeTab === 'upcoming'
                                    ? "bg-primary/[0.04] border-primary/20"
                                    : "text-muted-foreground hover:bg-muted/30 hover:text-foreground border-transparent"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <Calendar className={cn(
                                    "h-4 w-4 transition-colors",
                                    activeTab === 'upcoming' ? "text-primary" : "opacity-50"
                                )} />
                                <span className={cn(
                                    "text-sm font-medium tracking-wide transition-all duration-300",
                                    activeTab === 'upcoming'
                                        ? "text-primary translate-x-1"
                                        : "group-hover:translate-x-0.5"
                                )}>
                                    Upcoming
                                </span>
                            </div>
                            {upcomingBookings.length > 0 && (
                                <span className={cn(
                                    "text-[10px] font-mono transition-opacity duration-300",
                                    activeTab === 'upcoming' ? "opacity-60 text-primary" : "opacity-30"
                                )}>
                                    {upcomingBookings.length}
                                </span>
                            )}
                        </button>

                        <button
                            onClick={() => setActiveTab('past')}
                            className={cn(
                                "group w-full text-left px-5 py-3.5 rounded-2xl transition-all duration-500 relative flex items-center justify-between gap-3 border",
                                activeTab === 'past'
                                    ? "bg-primary/[0.04] border-primary/20"
                                    : "text-muted-foreground hover:bg-muted/30 hover:text-foreground border-transparent"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <History className={cn(
                                    "h-4 w-4 transition-colors",
                                    activeTab === 'past' ? "text-primary" : "opacity-50"
                                )} />
                                <span className={cn(
                                    "text-sm font-medium tracking-wide transition-all duration-300",
                                    activeTab === 'past'
                                        ? "text-primary translate-x-1"
                                        : "group-hover:translate-x-0.5"
                                )}>
                                    Past History
                                </span>
                            </div>
                        </button>
                    </div>
                </nav>
            </aside>

            {/* Mobile Tab Select (Visible only on small screens) */}
            <div className="lg:hidden mb-8 flex p-1 bg-muted/10 rounded-xl overflow-hidden">
                <button
                    onClick={() => setActiveTab('upcoming')}
                    className={cn(
                        "flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all",
                        activeTab === 'upcoming' ? "bg-background shadow-sm text-primary" : "text-muted-foreground"
                    )}
                >
                    Upcoming
                </button>
                <button
                    onClick={() => setActiveTab('past')}
                    className={cn(
                        "flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all",
                        activeTab === 'past' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
                    )}
                >
                    History
                </button>
            </div>

            {/* Main Content */}
            <main className="flex-1 lg:pl-16 py-2 max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-end justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-display font-medium text-foreground tracking-tight">
                            {activeTab === 'upcoming' ? 'Upcoming Sessions' : 'Booking History'}
                        </h1>
                    </div>
                </div>

                {activeBookings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 border border-dashed border-border/40 rounded-[1.5rem] bg-muted/[0.02]">
                        <CalendarDays className="h-10 w-10 text-muted-foreground/10 mb-4" />
                        <h3 className="text-lg font-display font-medium text-foreground/80 mb-2">No {activeTab} bookings</h3>
                        <p className="text-muted-foreground/50 max-w-xs text-center text-sm font-light mb-6">
                            {activeTab === 'upcoming'
                                ? "You haven't made any reservations yet."
                                : "You have no past booking history."}
                        </p>
                        {activeTab === 'upcoming' && (
                            <Link href={`/org/${orgSlug}/book`}>
                                <Button variant="outline" size="sm" className="rounded-xl px-5 h-9 text-xs font-bold uppercase tracking-widest hover:bg-primary/5 hover:text-primary transition-all">
                                    Book a Space
                                </Button>
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {activeBookings.map((booking) => {
                            const startDate = new Date(booking.startTime);
                            const isToday = startDate.toDateString() === new Date().toDateString();

                            return (
                                <div
                                    key={booking.id}
                                    className="group relative flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:px-6 sm:py-5 rounded-2xl border border-border/30 hover:border-border/60 hover:bg-muted/[0.02] transition-all duration-300"
                                >
                                    <div className="flex items-center gap-5">
                                        {/* Date Box - Compact */}
                                        <div className={cn(
                                            "hidden sm:flex flex-col items-center justify-center h-14 w-14 rounded-xl border transition-colors flex-shrink-0",
                                            isToday
                                                ? "bg-primary/5 border-primary/20 text-primary"
                                                : "bg-background border-border/60 text-muted-foreground/60 group-hover:border-primary/10 group-hover:text-primary/70"
                                        )}>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-current/80">{format(startDate, 'MMM')}</span>
                                            <span className="text-xl font-display font-bold leading-none">{format(startDate, 'd')}</span>
                                        </div>

                                        <div className="space-y-1.5 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2.5">
                                                <h3 className="text-lg font-semibold text-foreground font-display truncate tracking-tight">
                                                    {booking.space.name}
                                                </h3>
                                                {isToday && (
                                                    <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[9px] font-bold uppercase tracking-wider border border-primary/10">
                                                        Today
                                                    </span>
                                                )}
                                                {/* Mobile Date Badge */}
                                                <span className="sm:hidden text-xs text-muted-foreground/80 font-semibold">
                                                    {format(startDate, 'MMM d')}
                                                </span>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground/90 font-medium">
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="h-3.5 w-3.5 opacity-70" />
                                                    <span>
                                                        {formatTime(booking.startTime)} — {formatTime(booking.endTime)}
                                                    </span>
                                                </div>
                                                {(booking.slot || booking.slotIndex !== undefined) && (
                                                    <div className="flex items-center gap-1.5">
                                                        <MapPin className="h-3.5 w-3.5 opacity-70" />
                                                        <span className="opacity-90">
                                                            {booking.slot?.name || `Slot ${(booking.slotIndex ?? 0) + 1}`}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Area - Exposed Button */}
                                    <div className="mt-4 sm:mt-0 flex items-center justify-end sm:pl-6 sm:border-l border-border/60 flex-shrink-0">
                                        {activeTab === 'upcoming' && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-9 px-4 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5 font-semibold transition-colors rounded-lg"
                                                onClick={() => setCancelingId(booking.id)}
                                            >
                                                Cancel
                                            </Button>
                                        )}
                                        {activeTab === 'past' && (
                                            <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest cursor-default select-none">
                                                Completed
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Cancel Dialog */}
            <Dialog open={!!cancelingId} onOpenChange={() => setCancelingId(null)}>
                <DialogContent className="sm:max-w-md rounded-[2rem] p-8">
                    <DialogHeader className="mb-6">
                        <DialogTitle className="text-xl font-display">Cancel booking?</DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground/80 leading-relaxed pt-2">
                            This will release the slot potentially to other users.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={() => setCancelingId(null)}
                            className="flex-1 rounded-xl h-10 text-xs font-bold uppercase tracking-wider hover:bg-muted/10"
                        >
                            Keep it
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleCancel}
                            disabled={isCanceling}
                            className="flex-1 rounded-xl h-10 text-xs font-bold uppercase tracking-wider"
                        >
                            {isCanceling && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                            Confirm Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
