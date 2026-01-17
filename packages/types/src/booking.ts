export interface Booking {
    id: string;
    spaceId: string;
    userId: string;
    startTime: Date;
    endTime: Date;
    status: BookingStatus;
    participants: BookingParticipant[];
    notes?: string;
    slotIndex?: number;
    createdAt: Date;
    updatedAt: Date;
}

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

export interface BookingParticipant {
    name: string;
    email?: string;
}

export interface BookingWithDetails extends Booking {
    space: {
        id: string;
        name: string;
    };
    user: {
        id: string;
        name: string;
        avatarUrl?: string;
    };
}

export interface CreateBookingInput {
    spaceId: string;
    startTime: string;
    endTime: string;
    participants?: BookingParticipant[];
    notes?: string;
}

export interface TimeSlot {
    startTime: Date;
    endTime: Date;
    isAvailable: boolean;
    bookings?: Array<{
        id: string;
        userId: string;
        userName: string;
        userAvatar?: string;
        participants: BookingParticipant[];
        slotIndex?: number;
    }>;
}
