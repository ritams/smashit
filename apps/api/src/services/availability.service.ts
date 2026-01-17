import { prisma } from '@smashit/database';

export interface AvailabilityParams {
    spaceId: string;
    date: string; // YYYY-MM-DD
    orgTimezone: string;
}

export interface TimeSlot {
    startTime: Date;
    endTime: Date;
    isAvailable: boolean;
    booking?: {
        id: string;
        userId: string;
        userName: string;
        userAvatar?: string;
        participants: Array<{ name: string; email?: string }>;
    };
}

export async function getSpaceAvailability(params: AvailabilityParams): Promise<TimeSlot[]> {
    const { spaceId, date } = params;

    // Get space with rules
    const space = await prisma.space.findUnique({
        where: { id: spaceId },
        include: { rules: true },
    });

    if (!space || !space.rules) {
        return [];
    }

    const { rules } = space;

    // Parse date and create time range
    const dayStart = new Date(`${date}T${rules.openTime}:00.000Z`);
    const dayEnd = new Date(`${date}T${rules.closeTime}:00.000Z`);

    // Get all bookings for this space on this date
    const bookings = await prisma.booking.findMany({
        where: {
            spaceId,
            status: 'CONFIRMED',
            startTime: { gte: dayStart },
            endTime: { lte: dayEnd },
        },
        include: {
            user: {
                select: { id: true, name: true, avatarUrl: true },
            },
        },
        orderBy: { startTime: 'asc' },
    });

    // Generate time slots
    const slots: TimeSlot[] = [];
    const slotDuration = rules.slotDurationMin * 60 * 1000; // Convert to ms
    let currentTime = dayStart.getTime();

    while (currentTime + slotDuration <= dayEnd.getTime()) {
        const slotStart = new Date(currentTime);
        const slotEnd = new Date(currentTime + slotDuration);

        // Check if this slot overlaps with any booking
        const overlappingBooking = bookings.find(
            (b) => b.startTime < slotEnd && b.endTime > slotStart
        );

        if (overlappingBooking) {
            slots.push({
                startTime: slotStart,
                endTime: slotEnd,
                isAvailable: false,
                booking: {
                    id: overlappingBooking.id,
                    userId: overlappingBooking.userId,
                    userName: overlappingBooking.user.name,
                    userAvatar: overlappingBooking.user.avatarUrl || undefined,
                    participants: overlappingBooking.participants as any,
                },
            });
        } else {
            slots.push({
                startTime: slotStart,
                endTime: slotEnd,
                isAvailable: true,
            });
        }

        currentTime += slotDuration;
    }

    return slots;
}
