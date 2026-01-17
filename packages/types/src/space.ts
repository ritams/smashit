export interface Space {
    id: string;
    name: string;
    description?: string;
    capacity: number;
    isActive: boolean;
    orgId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface SpaceWithRules extends Space {
    rules: BookingRules | null;
}

export interface BookingRules {
    id: string;
    spaceId: string;
    slotDurationMin: number;
    openTime: string;
    closeTime: string;
    maxAdvanceDays: number;
    maxDurationMin: number;
    allowRecurring: boolean;
    bufferMinutes: number;
}

export interface CreateSpaceInput {
    name: string;
    description?: string;
    capacity?: number;
}

export interface UpdateSpaceInput {
    name?: string;
    description?: string;
    capacity?: number;
    isActive?: boolean;
}

export interface UpdateBookingRulesInput {
    slotDurationMin?: number;
    openTime?: string;
    closeTime?: string;
    maxAdvanceDays?: number;
    maxDurationMin?: number;
    allowRecurring?: boolean;
    bufferMinutes?: number;
}
