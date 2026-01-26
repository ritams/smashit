import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
    const spaces = await prisma.space.findMany({ select: { id: true, name: true, facilityId: true } });
    console.log('--- SPACE CHECK ---');
    console.table(spaces);
    console.log(`Total Spaces: ${spaces.length}`);
    console.log(`Spaces without Facility: ${spaces.filter(s => !s.facilityId).length}`);
}

check().finally(() => prisma.$disconnect());
