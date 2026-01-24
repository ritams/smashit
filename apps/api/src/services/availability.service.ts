import { prisma } from '@avith/database';
import { fromZonedTime } from 'date-fns-tz';
import { addHours, addMinutes } from 'date-fns';

export interface AvailabilityParams {
    spaceId: string;
    date: string; // YYYY-MM-DD
    orgTimezone: string | undefined;
}

interface BookingWithUser {
    id: string;
    userId: string;
    slotIndex: number | null;
    slotId: string | null;
    participants: unknown; // JsonValue from Prisma
    user: { id: string; name: string; email: string; avatarUrl: string | null };
    startTime: Date;
    endTime: Date;
}

/**
 * Get detailed time slot availability for a space on a specific date
 * 
 * @param params - Availability query parameters
 * @param params.spaceId - The space to check availability for
 * @param params.date - Date in YYYY-MM-DD format
 * @param params.orgTimezone - Organization's timezone (defaults to UTC)
 * @returns Space details with time slots and their booking status
 * @throws Error if space not found or rules missing
 */
export async function getDetailedSpaceAvailability(params: AvailabilityParams) {
    const { spaceId, date, orgTimezone } = params;

    const space = await prisma.space.findUnique({
        where: { id: spaceId },
        include: {
            facility: {
                include: { rules: true },
            },
            slots: { orderBy: { number: 'asc' } },
        },
    });

    if (!space || !space.facility || !space.facility.rules) {
        throw new Error('Space, facility, or rules missing');
    }

    const timezone = orgTimezone || 'UTC';
    const { rules, type } = space.facility;

    // 1. Determine "Start of Day" in the requested timezone
    const clientDateString = `${date}T00:00:00`;
    const startOfDayUTC = fromZonedTime(clientDateString, timezone);

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
            (b: any) => b.startTime < slotEnd && b.endTime > slotStart
        );

        if (overlappingBookings.length > 0) {
            slots.push({
                startTime: slotStart.toISOString(),
                endTime: slotEnd.toISOString(),
                isAvailable: overlappingBookings.length < space.capacity,
                bookings: overlappingBookings.map((b: BookingWithUser) => ({
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
            facilityId: space.facilityId,
            type,
            capacity: space.capacity,
            slots: space.slots,
            rules,
        },
        slots,
    };
}


