const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const userEmail = 'ritam4jnu@gmail.com';

    // 1. Find the user
    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) {
        console.error('User not found. Please log in first.');
        return;
    }

    // 2. Create Organization
    const org = await prisma.organization.upsert({
        where: { slug: 'avith' },
        update: {},
        create: {
            name: 'AVITH',
            slug: 'avith',
            timezone: 'Asia/Kolkata',
        },
    });
    console.log(`Organization created/found: ${org.name}`);

    // 3. Create Membership (ADMIN)
    await prisma.membership.upsert({
        where: { userId_orgId: { userId: user.id, orgId: org.id } },
        update: { role: 'ADMIN' },
        create: {
            userId: user.id,
            orgId: org.id,
            role: 'ADMIN',
        },
    });
    console.log(`Admin membership confirmed for ${userEmail}`);

    // 4. Create Badminton Facility
    const badmintonFac = await prisma.facility.create({
        data: {
            name: 'Badminton Center',
            type: 'BADMINTON',
            description: 'Premium badminton courts with professional flooring.',
            location: 'South Wing',
            orgId: org.id,
            rules: {
                create: {
                    openTime: '06:00',
                    closeTime: '22:00',
                    slotDurationMin: 60,
                }
            },
            spaces: {
                create: [
                    { name: 'Court 1', capacity: 1, orgId: org.id },
                    { name: 'Court 2', capacity: 1, orgId: org.id },
                    { name: 'Court 3', capacity: 1, orgId: org.id },
                ]
            }
        }
    });
    console.log('Badminton facility and courts created.');

    // 5. Create Tennis Facility
    await prisma.facility.create({
        data: {
            name: 'Tennis Center',
            type: 'TENNIS',
            description: 'Championship clay courts.',
            location: 'Outer Courts',
            orgId: org.id,
            rules: {
                create: {
                    openTime: '07:00',
                    closeTime: '21:00',
                    slotDurationMin: 60,
                }
            },
            spaces: {
                create: [
                    { name: 'Main Court', capacity: 1, orgId: org.id },
                    { name: 'Practice Court', capacity: 1, orgId: org.id },
                ]
            }
        }
    });
    console.log('Tennis facility and courts created.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
