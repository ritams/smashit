import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Sport-specific slot naming
const SLOT_PREFIXES: Record<string, string> = {
    BADMINTON: 'Court',
    TENNIS: 'Court',
    TABLE_TENNIS: 'Table',
    FOOTBALL: 'Field',
    BASKETBALL: 'Court',
    CRICKET: 'Net',
    SWIMMING: 'Lane',
    SQUASH: 'Court',
    GENERIC: 'Slot',
};

function getSlotName(type: string, number: number): string {
    const prefix = SLOT_PREFIXES[type] || 'Slot';
    return `${prefix} ${number}`;
}

async function main() {
    console.log('Starting migration of space types and slot names...\n');

    // Get all spaces with their slots
    const spaces = await prisma.space.findMany({
        include: { slots: { orderBy: { number: 'asc' } } },
    });

    console.log(`Found ${spaces.length} spaces to process.\n`);

    for (const space of spaces) {
        // Detect type from name if generic
        let newType = space.type;
        const nameLower = space.name.toLowerCase();

        if (newType === 'GENERIC' || newType === 'SPORTS_COURT' || newType === 'MEETING_ROOM' || newType === 'DESK') {
            if (nameLower.includes('badminton')) {
                newType = 'BADMINTON';
            } else if (nameLower.includes('tennis') && !nameLower.includes('table')) {
                newType = 'TENNIS';
            } else if (nameLower.includes('table tennis') || nameLower.includes('tt') || nameLower.includes('ping')) {
                newType = 'TABLE_TENNIS';
            } else if (nameLower.includes('football') || nameLower.includes('soccer')) {
                newType = 'FOOTBALL';
            } else if (nameLower.includes('basketball')) {
                newType = 'BASKETBALL';
            } else if (nameLower.includes('cricket')) {
                newType = 'CRICKET';
            } else if (nameLower.includes('swimming') || nameLower.includes('pool')) {
                newType = 'SWIMMING';
            } else if (nameLower.includes('squash')) {
                newType = 'SQUASH';
            }
        }

        // Update space type if changed
        if (newType !== space.type) {
            await prisma.space.update({
                where: { id: space.id },
                data: { type: newType },
            });
            console.log(`Updated space "${space.name}" type: ${space.type} → ${newType}`);
        }

        // Update slot names
        for (const slot of space.slots) {
            const newName = getSlotName(newType, slot.number);
            if (slot.name !== newName) {
                await prisma.slot.update({
                    where: { id: slot.id },
                    data: { name: newName },
                });
                console.log(`  - Updated slot ${slot.number}: "${slot.name}" → "${newName}"`);
            }
        }
    }

    console.log('\nMigration complete!');
}

main()
    .catch((e) => {
        console.error('Migration failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
