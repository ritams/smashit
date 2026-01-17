'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { format, addDays, startOfToday, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Clock, Users, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { cn, formatTime, getInitials } from '@/lib/utils';

// Mock data for demo (replace with actual API calls)
const mockSpaces = [
    { id: 'space-1', name: 'Badminton Court A', capacity: 4 },
    { id: 'space-2', name: 'Badminton Court B', capacity: 4 },
    { id: 'space-3', name: 'Meeting Room 1', capacity: 10 },
];

const generateMockSlots = (date: Date, userId: string) => {
    const slots = [];
    for (let hour = 9; hour < 21; hour++) {
        const startTime = new Date(date);
        startTime.setHours(hour, 0, 0, 0);
        const endTime = new Date(date);
        endTime.setHours(hour + 1, 0, 0, 0);

        const isBooked = Math.random() > 0.7;
        const isMine = isBooked && Math.random() > 0.7;

        slots.push({
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            isAvailable: !isBooked,
            booking: isBooked
                ? {
                    id: `booking-${hour}`,
                    userId: isMine ? userId : 'other-user',
                    userName: isMine ? 'You' : ['Rahul S.', 'Priya M.', 'Amit K.'][hour % 3],
                    userAvatar: null,
                    participants: [],
                }
                : undefined,
        });
    }
    return slots;
};

interface TimeSlot {
    startTime: string;
    endTime: string;
    isAvailable: boolean;
    booking?: {
        id: string;
        userId: string;
        userName: string;
        userAvatar?: string;
        participants: Array<{ name: string }>;
    };
}

export default function BookPage() {
    const params = useParams();
    const { data: session } = useSession();
    const orgSlug = params.slug as string;

    const [selectedSpace, setSelectedSpace] = useState(mockSpaces[0]);
    const [selectedDate, setSelectedDate] = useState(startOfToday());
    const [slots, setSlots] = useState<TimeSlot[]>([]);
    const [loading, setLoading] = useState(true);
    const [bookingSlot, setBookingSlot] = useState<TimeSlot | null>(null);
    const [isBooking, setIsBooking] = useState(false);

    // Generate dates for the week view
    const weekDates = Array.from({ length: 7 }, (_, i) => addDays(startOfToday(), i));

    // Load slots when space or date changes
    useEffect(() => {
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            setSlots(generateMockSlots(selectedDate, session?.user?.email || ''));
            setLoading(false);
        }, 500);
    }, [selectedSpace.id, selectedDate, session?.user?.email]);

    const handleBookSlot = async () => {
        if (!bookingSlot) return;

        setIsBooking(true);
        // Simulate booking
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Update slots
        setSlots((prev) =>
            prev.map((slot) =>
                slot.startTime === bookingSlot.startTime
                    ? {
                        ...slot,
                        isAvailable: false,
                        booking: {
                            id: 'new-booking',
                            userId: session?.user?.email || '',
                            userName: 'You',
                            participants: [],
                        },
                    }
                    : slot
            )
        );

        setIsBooking(false);
        setBookingSlot(null);
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Book a Space</h1>
                <p className="text-muted-foreground">
                    Select a space and time slot to make a booking
                </p>
            </div>

            {/* Space Selector */}
            <Tabs
                value={selectedSpace.id}
                onValueChange={(id) => setSelectedSpace(mockSpaces.find((s) => s.id === id)!)}
            >
                <TabsList className="w-full justify-start h-auto p-1 bg-muted/50">
                    {mockSpaces.map((space) => (
                        <TabsTrigger
                            key={space.id}
                            value={space.id}
                            className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 py-2"
                        >
                            <span className="font-medium">{space.name}</span>
                            <span className="ml-2 text-xs text-muted-foreground">
                                ({space.capacity} max)
                            </span>
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            {/* Date Selector */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-medium">
                            {format(selectedDate, 'MMMM yyyy')}
                        </CardTitle>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSelectedDate((prev) => addDays(prev, -7))}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSelectedDate((prev) => addDays(prev, 7))}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-7 gap-2">
                        {weekDates.map((date) => {
                            const isSelected = isSameDay(date, selectedDate);
                            const isToday = isSameDay(date, startOfToday());

                            return (
                                <button
                                    key={date.toISOString()}
                                    onClick={() => setSelectedDate(date)}
                                    className={cn(
                                        'flex flex-col items-center p-3 rounded-lg transition-all',
                                        isSelected
                                            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                                            : 'hover:bg-muted',
                                        isToday && !isSelected && 'ring-2 ring-primary/30'
                                    )}
                                >
                                    <span className="text-xs font-medium opacity-70">
                                        {format(date, 'EEE')}
                                    </span>
                                    <span className="text-lg font-semibold">{format(date, 'd')}</span>
                                </button>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Time Slots Grid */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-medium">
                            Available Slots - {format(selectedDate, 'EEEE, MMM d')}
                        </CardTitle>
                        <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded bg-success/20 border border-success/50" />
                                <span className="text-muted-foreground">Available</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded bg-primary/20 border border-primary/50" />
                                <span className="text-muted-foreground">Your booking</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded bg-muted border border-border" />
                                <span className="text-muted-foreground">Booked</span>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {Array.from({ length: 12 }).map((_, i) => (
                                <Skeleton key={i} className="h-20 rounded-lg" />
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {slots.map((slot) => {
                                const isMine = slot.booking?.userId === session?.user?.email;

                                return (
                                    <button
                                        key={slot.startTime}
                                        disabled={!slot.isAvailable}
                                        onClick={() => slot.isAvailable && setBookingSlot(slot)}
                                        className={cn(
                                            'p-4 rounded-lg border text-left transition-all',
                                            slot.isAvailable
                                                ? 'slot-available hover:scale-[1.02] hover:shadow-md'
                                                : isMine
                                                    ? 'slot-mine'
                                                    : 'slot-booked'
                                        )}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <Clock className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-medium">
                                                {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                                            </span>
                                        </div>

                                        {slot.booking ? (
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-6 w-6">
                                                    <AvatarImage src={slot.booking.userAvatar} />
                                                    <AvatarFallback className="text-xs">
                                                        {getInitials(slot.booking.userName)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="text-sm text-muted-foreground">
                                                    {slot.booking.userName}
                                                    {slot.booking.participants.length > 0 &&
                                                        ` +${slot.booking.participants.length}`}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-success font-medium">
                                                Click to book
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Booking Confirmation Dialog */}
            <Dialog open={!!bookingSlot} onOpenChange={() => setBookingSlot(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Booking</DialogTitle>
                        <DialogDescription>
                            You are about to book the following slot:
                        </DialogDescription>
                    </DialogHeader>

                    {bookingSlot && (
                        <div className="p-4 rounded-lg bg-muted">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary">
                                    <Clock className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="font-semibold">{selectedSpace.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {format(new Date(bookingSlot.startTime), 'EEEE, MMMM d')}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {formatTime(bookingSlot.startTime)} - {formatTime(bookingSlot.endTime)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setBookingSlot(null)}>
                            Cancel
                        </Button>
                        <Button onClick={handleBookSlot} disabled={isBooking}>
                            {isBooking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm Booking
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
