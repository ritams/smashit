import { prisma } from '@avith/database';

/**
 * Booking service - handles booking-related database operations
 */

interface BookingFilters {
    orgId: string;
    spaceId?: string;
    userId?: string;
    date?: string;
}

interface UserBookingFilters {
    userId: string;
    orgId: string;
}

/**
 * Get bookings with optional filters
 */
export async function getBookings(filters: BookingFilters) {
    const where: any = {
        space: { orgId: filters.orgId },
        status: 'CONFIRMED',
    };

    if (filters.spaceId) where.spaceId = filters.spaceId;
    if (filters.userId) where.userId = filters.userId;
    if (filters.date) {
        const dayStart = new Date(`${filters.date}T00:00:00.000Z`);
        const dayEnd = new Date(`${filters.date}T23:59:59.999Z`);
        where.startTime = { gte: dayStart };
        where.endTime = { lte: dayEnd };
    }

    return prisma.booking.findMany({
        where,
        include: {
            space: { select: { id: true, name: true } },
            user: { select: { id: true, name: true, avatarUrl: true, email: true } },
        },
        orderBy: { startTime: 'asc' },
    });
}

/**
 * Get a user's bookings for an organization
 */
export async function getUserBookings(filters: UserBookingFilters) {
    return prisma.booking.findMany({
        where: {
            userId: filters.userId,
            space: { orgId: filters.orgId },
            status: { in: ['PENDING', 'CONFIRMED'] },
        },
        include: {
            space: { select: { id: true, name: true } },
            slot: { select: { id: true, name: true, number: true } },
        },
        orderBy: { startTime: 'desc' },
    });
}

/**
 * Find a booking by ID within an organization
 */
export async function findBooking(bookingId: string, orgId: string) {
    return prisma.booking.findFirst({
        where: {
            id: bookingId,
            space: { orgId },
        },
        include: {
            space: { select: { id: true, name: true } },
        },
    });
}

/**
 * Cancel a booking by setting status to CANCELLED
 */
export async function cancelBooking(bookingId: string) {
    return prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED' },
    });
}

/**
 * Verify a space belongs to an organization and fetch its rules
 */
export async function verifySpaceOwnership(spaceId: string, orgId: string) {
    return prisma.space.findFirst({
        where: {
            id: spaceId,
            orgId,
            isActive: true,
        },
        include: {
            facility: {
                include: { rules: true },
            },
        },
    });
}

