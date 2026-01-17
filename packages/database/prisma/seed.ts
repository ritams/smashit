import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Create a demo organization
    const org = await prisma.organization.upsert({
        where: { slug: 'demo-org' },
        update: {},
        create: {
            name: 'Demo Organization',
            slug: 'demo-org',
            timezone: 'Asia/Kolkata',
            settings: {
                brandColor: '#6366f1',
            },
        },
    });

    console.log(`✅ Created organization: ${org.name}`);

    // Create an admin user
    const admin = await prisma.user.upsert({
        where: {
            email_orgId: {
                email: 'admin@demo.com',
                orgId: org.id,
            },
        },
        update: {},
        create: {
            email: 'admin@demo.com',
            name: 'Admin User',
            googleId: 'google-admin-123',
            role: Role.ADMIN,
            orgId: org.id,
        },
    });

    console.log(`✅ Created admin user: ${admin.name}`);

    // Create demo spaces
    const spaces = [
        {
            name: 'Badminton Court A',
            description: 'Indoor badminton court with wooden flooring',
            capacity: 4,
        },
        {
            name: 'Badminton Court B',
            description: 'Indoor badminton court with synthetic flooring',
            capacity: 4,
        },
        {
            name: 'Meeting Room 1',
            description: 'Conference room with projector and whiteboard',
            capacity: 10,
        },
    ];

    for (const spaceData of spaces) {
        const space = await prisma.space.upsert({
            where: {
                id: `${org.id}-${spaceData.name.toLowerCase().replace(/\s+/g, '-')}`,
            },
            update: {},
            create: {
                id: `${org.id}-${spaceData.name.toLowerCase().replace(/\s+/g, '-')}`,
                ...spaceData,
                orgId: org.id,
                rules: {
                    create: {
                        slotDurationMin: 60,
                        openTime: '09:00',
                        closeTime: '21:00',
                        maxAdvanceDays: 7,
                        maxDurationMin: 120,
                        allowRecurring: false,
                        bufferMinutes: 15,
                    },
                },
            },
        });

        console.log(`✅ Created space: ${space.name}`);
    }

    console.log('🎉 Seeding complete!');
}

main()
    .catch((e) => {
        console.error('❌ Seed error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
