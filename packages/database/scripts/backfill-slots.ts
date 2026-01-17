import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting backfill of Slots...');

    const spaces = await prisma.space.findMany({
        include: {
            bookings: true,
            slots: true,
        },
    });

    console.log(`Found ${spaces.length} spaces.`);

    for (const space of spaces) {
        console.log(`Processing space: ${space.name} (${space.id}) - Capacity: ${space.capacity}`);

        // Create Slots
        const createdSlots = [];
        for (let i = 1; i <= space.capacity; i++) {
            // Check if slot exists
            let slot = space.slots.find(s => s.number === i);

            if (!slot) {
                slot = await prisma.slot.create({
                    data: {
                        spaceId: space.id,
                        number: i,
                        name: `Slot ${i}`, // Default name
                    }
                });
                console.log(`  Created Slot ${i} (${slot.id})`);
            } else {
                console.log(`  Slot ${i} already exists (${slot.id})`);
            }
            createdSlots.push(slot);
        }

        // Link Bookings
        const bookingsToUpdate = space.bookings.filter(b => !b.slotId);
        console.log(`  Found ${bookingsToUpdate.length} bookings to link.`);

        for (const booking of bookingsToUpdate) {
            let targetSlotIndex = booking.slotIndex;

            // Default to slot index 0 (first slot) if null (assuming 0-based index from frontend usually maps to 1-based slot number)
            // Wait, current schema has slotIndex as Int?
            // Let's assume booking.slotIndex IS the 0-based index previously used.
            // So booking.slotIndex 0 -> Slot Number 1

            const slotNumber = (targetSlotIndex ?? 0) + 1;
            const targetSlot = createdSlots.find(s => s.number === slotNumber);

            if (targetSlot) {
                await prisma.booking.update({
                    where: { id: booking.id },
                    data: { slotId: targetSlot.id }
                });
                console.log(`    Linked Booking ${booking.id} to Slot ${slotNumber} (${targetSlot.id})`);
            } else {
                console.warn(`    WARNING: Could not find slot for Booking ${booking.id} (index ${targetSlotIndex})`);
            }
        }
    }

    console.log('Backfill complete.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
