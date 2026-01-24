const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: "postgresql://ritam@localhost:5432/smashit"
        }
    }
});

async function main() {
    console.log('Checking database status...');

    const orgs = await prisma.organization.findMany();
    console.log(`Found ${orgs.length} organizations.`);

    for (const org of orgs) {
        const facilities = await prisma.facility.findMany({ where: { orgId: org.id } });
        console.log(`Org: ${org.name} (${org.slug}) - ${facilities.length} facilities.`);

        const orphanedSpaces = await prisma.space.findMany({
            where: { orgId: org.id, facilityId: null }
        });

        if (orphanedSpaces.length > 0) {
            console.log(`Found ${orphanedSpaces.length} orphaned spaces for org ${org.name}. Migrating...`);

            // Create a default facility for these spaces
            const defaultFacility = await prisma.facility.create({
                data: {
                    name: 'Main Facility',
                    type: orphanedSpaces[0].type || 'GENERIC',
                    orgId: org.id,
                    rules: {
                        create: {
                            openTime: '06:00',
                            closeTime: '22:00',
                            slotDurationMin: 60,
                            maxAdvanceDays: 7,
                            maxDurationMin: 120
                        }
                    }
                }
            });

            console.log(`Created default facility: ${defaultFacility.name}`);

            const updateCount = await prisma.space.updateMany({
                where: { orgId: org.id, facilityId: null },
                data: { facilityId: defaultFacility.id }
            });

            console.log(`Updated ${updateCount.count} spaces.`);
        }
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
