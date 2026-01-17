import { prisma } from '@smashit/database';
import { fromZonedTime } from 'date-fns-tz';
import { addHours, addMinutes } from 'date-fns';

export interface AvailabilityParams {
    spaceId: string;
    date: string; // YYYY-MM-DD
    orgTimezone: string | undefined;
}
// ... (keep TimeSlot interface)

export async function getDetailedSpaceAvailability(params: AvailabilityParams): Promise<{ space: any; slots: any[] }> {
    const { spaceId, date, orgTimezone } = params;
    console.log(`[Service] getDetailedSpaceAvailability for space ${spaceId} date ${date} tz ${orgTimezone}`);

    const space = await prisma.space.findUnique({
        where: { id: spaceId },
        include: {
            rules: true,
            slots: { orderBy: { number: 'asc' } },
        },
    });

    if (!space || !space.rules) {
        console.error(`[Service] Space ${spaceId} not found or rules missing`);
        throw new Error('Space not found or rules missing');
    }

    const timezone = orgTimezone || 'UTC';
    const { rules } = space;

    // 1. Determine "Start of Day" in the requested timezone
    const clientDateString = `${date}T00:00:00`;
    const startOfDayUTC = fromZonedTime(clientDateString, timezone);
    // ... rest of the function remains same, just ensuring logic is preserved
    // Parse open and close times from rules (e.g., "09:00", "17:00")
    const [openHourStr, openMinuteStr] = rules.openTime.split(':');
    const [closeHourStr, closeMinuteStr] = rules.closeTime.split(':');

    const openHour = parseInt(openHourStr, 10);
    const openMinute = parseInt(openMinuteStr, 10);
    const closeHour = parseInt(closeHourStr, 10);
    const closeMinute = parseInt(closeMinuteStr, 10);

    // Calculate actual start and end times for the day in UTC
    let dayStartUTC = addMinutes(addHours(startOfDayUTC, openHour), openMinute);
    let dayEndUTC = addMinutes(addHours(startOfDayUTC, closeHour), closeMinute);

    // Handle cases where close time might be on the next day
    if (dayEndUTC < dayStartUTC) {
        dayEndUTC = addHours(dayEndUTC, 24);
    }

    // Get all bookings for this space on this date
    const bookings = await prisma.booking.findMany({
        where: {
            spaceId,
            status: 'CONFIRMED',
            startTime: { gte: dayStartUTC },
            endTime: { lte: dayEndUTC },
        },
        include: {
            user: {
                select: { id: true, name: true, email: true, avatarUrl: true },
            },
        },
        orderBy: { startTime: 'asc' },
    });

    // Generate time slots
    const slots = [];
    const slotDurationMs = rules.slotDurationMin * 60 * 1000;
    let currentTime = dayStartUTC.getTime();

    while (currentTime + slotDurationMs <= dayEndUTC.getTime()) {
        const slotStart = new Date(currentTime);
        const slotEnd = new Date(currentTime + slotDurationMs);

        const overlappingBookings = bookings.filter(
            (b) => b.startTime < slotEnd && b.endTime > slotStart
        );

        if (overlappingBookings.length > 0) {
            slots.push({
                startTime: slotStart.toISOString(),
                endTime: slotEnd.toISOString(),
                isAvailable: overlappingBookings.length < space.capacity,
                bookings: overlappingBookings.map((b: any) => ({
                    id: b.id,
                    userId: b.userId,
                    userEmail: b.user.email,
                    userName: b.user.name,
                    userAvatar: b.user.avatarUrl,
                    participants: b.participants,
                    slotIndex: b.slotIndex,
                    slotId: b.slotId,
                })),
            });
        } else {
            slots.push({
                startTime: slotStart.toISOString(),
                endTime: slotEnd.toISOString(),
                isAvailable: true,
            });
        }

        currentTime += slotDurationMs;
    }

    return {
        space: {
            id: space.id,
            name: space.name,
            capacity: space.capacity,
            slots: space.slots,
            rules: space.rules,
        },
        slots,
    };
}
