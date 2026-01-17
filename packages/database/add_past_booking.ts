import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Get the user (Ritam Pal) 
    const user = await prisma.user.findFirst({
        where: { name: { contains: 'Ritam' } }
    });

    if (!user) {
        console.log('User not found');
        return;
    }

    console.log('Found user:', user.email, user.id);

    // Get a space with a slot
    const space = await prisma.space.findFirst({
        include: { slots: true }
    });

    if (!space) {
        console.log('No space found');
        return;
    }

    console.log('Found space:', space.name, space.id);

    // Create a past booking (yesterday at 10 AM)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(10, 0, 0, 0);

    const endTime = new Date(yesterday);
    endTime.setHours(11, 0, 0, 0);

    const slot = space.slots[0];

    const booking = await prisma.booking.create({
        data: {
            spaceId: space.id,
            userId: user.id,
            startTime: yesterday,
            endTime: endTime,
            status: 'CONFIRMED',
            slotIndex: slot ? slot.number - 1 : 0,
            slotId: slot?.id,
        }
    });

    console.log('Created past booking:', booking.id);
    console.log('Start time:', booking.startTime);
    console.log('End time:', booking.endTime);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
