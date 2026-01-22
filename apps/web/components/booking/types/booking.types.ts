/**
 * Shared types for booking components
 */

/** Props for the main AllSpacesView component */
export interface AllSpacesViewProps {
    date: Date;
    orgSlug: string;
    onBook: (data: BookingAction) => void;
    onCancel: (data: CancelAction) => void;
    refreshTrigger?: number;
    spaceType?: string;
    categoryName?: string;
    viewMode?: 'ALL' | 'SINGLE';
    mobileSelectedSpaceId?: string;
}

/** A booking entry */
export interface Booking {
    id: string;
    userId: string;
    userEmail: string;
    userName: string;
    userAvatar?: string;
    startTime: string;
    endTime: string;
    slotId?: string;
    slotIndex?: number;
}

/** A time slot with availability info */
export interface Slot {
    startTime: string;
    endTime: string;
    isAvailable: boolean;
    bookings?: Booking[];
}

/** Sub-slot within a space (e.g., Court 1, Court 2) */
export interface SubSlot {
    id: string;
    name: string;
    number: number;
    isActive?: boolean;
}

/** Space with its rules and availability slots */
export interface SpaceAvailability {
    space: {
        id: string;
        name: string;
        type: string;
        capacity: number;
        slots: SubSlot[];
        rules?: {
            maxAdvanceDays: number;
        };
    };
    slots: Slot[];
}

/** Column definition for grid view */
export interface ColumnDef {
    space: SpaceAvailability['space'];
    subSlot: SubSlot;
    subSlotIndex: number;
}

/** Action payloads for callbacks */
export interface BookingAction {
    space: SpaceAvailability['space'];
    slotRaw: Slot;
    subSlot: SubSlot;
    idx: number;
}

export interface CancelAction {
    booking: Booking;
    slot: Slot;
    space: SpaceAvailability['space'];
}

/** Props for BookingCell */
export interface BookingCellProps {
    slot: Slot;
    column: ColumnDef;
    columnIndex: number;
    rowTime: Date;
    currentUserEmail?: string;
    onBook: (data: BookingAction) => void;
    onCancel: (data: CancelAction) => void;
    spaceGroupIndex: number;
    isFirstOfSpace: boolean;
}

/** Props for BookingGrid */
export interface BookingGridProps {
    data: SpaceAvailability[];
    timeRows: Date[];
    columns: ColumnDef[];
    spaceGroups: { space: SpaceAvailability['space']; colSpan: number }[];
    currentUserEmail?: string;
    onBook: (data: BookingAction) => void;
    onCancel: (data: CancelAction) => void;
}

/** Props for MobileBookingView */
export interface MobileBookingViewProps {
    data: SpaceAvailability[];
    timeRows: Date[];
    currentUserEmail?: string;
    viewMode: 'ALL' | 'SINGLE';
    onBook: (data: BookingAction) => void;
    onCancel: (data: CancelAction) => void;
}
