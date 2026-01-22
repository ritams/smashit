export const SPACE_TYPES: Record<string, { label: string; slotPrefix: string }> = {
    BADMINTON: { label: 'Badminton', slotPrefix: 'Court' },
    TENNIS: { label: 'Tennis', slotPrefix: 'Court' },
    TABLE_TENNIS: { label: 'Table Tennis', slotPrefix: 'Table' },
    FOOTBALL: { label: 'Football', slotPrefix: 'Field' },
    BASKETBALL: { label: 'Basketball', slotPrefix: 'Court' },
    CRICKET: { label: 'Cricket', slotPrefix: 'Net' },
    SWIMMING: { label: 'Swimming', slotPrefix: 'Lane' },
    SQUASH: { label: 'Squash', slotPrefix: 'Court' },
    GENERIC: { label: 'Other', slotPrefix: 'Slot' },
} as const;

export type SpaceType = keyof typeof SPACE_TYPES;
