'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar, Clock, MapPin, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { cn, formatTime } from '@/lib/utils';

// Mock data
const mockBookings = [
    {
        id: '1',
        space: { id: 'space-1', name: 'Badminton Court A' },
        startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
        status: 'CONFIRMED',
    },
    {
        id: '2',
        space: { id: 'space-2', name: 'Meeting Room 1' },
        startTime: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 27 * 60 * 60 * 1000).toISOString(),
        status: 'CONFIRMED',
    },
];

export default function MyBookingsPage() {
    const [bookings, setBookings] = useState(mockBookings);
    const [cancelingId, setCancelingId] = useState<string | null>(null);

    const handleCancel = async () => {
        if (!cancelingId) return;

        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 500));

        setBookings((prev) => prev.filter((b) => b.id !== cancelingId));
        setCancelingId(null);
    };

    const upcomingBookings = bookings.filter(
        (b) => new Date(b.startTime) > new Date()
    );

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">My Bookings</h1>
                <p className="text-muted-foreground">
                    View and manage your upcoming bookings
                </p>
            </div>

            {upcomingBookings.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No upcoming bookings</h3>
                        <p className="text-muted-foreground text-center mb-4">
                            You don&apos;t have any upcoming bookings. Book a space to get started!
                        </p>
                        <Button>Book a Space</Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                                    'transition-all hover:shadow-lg',
                                    isToday && 'border-primary/50 bg-primary/5'
                                )}
                            >
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <CardTitle className="text-base font-medium">
                                            {booking.space.name}
                                        </CardTitle>
                                        {isToday && (
                                            <span className="px-2 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                                                Today
                                            </span>
                                        )}
                                        {isTomorrow && (
                                            <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                                                Tomorrow
                                            </span>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Calendar className="h-4 w-4" />
                                        <span>{format(startDate, 'EEEE, MMMM d, yyyy')}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Clock className="h-4 w-4" />
                                        <span>
                                            {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                                        </span>
                                    </div>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => setCancelingId(booking.id)}
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Cancel Booking
                                    </Button>
                                </CardContent>
                            </Card>
                        );
                    })}
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
                        <Button variant="destructive" onClick={handleCancel}>
                            Yes, Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
