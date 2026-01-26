/**
 * PRODUCTION MIGRATION SCRIPT: v1 (Hierarchy Refactor)
 * 
 * Purpose: Safely migrates existing Spaces into the new Facility-based hierarchy.
 * Run this script BEFORE enforcing the 'Required' constraint on facilityId in production.
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function migrate() {
    console.log('🚀 Starting Production Migration: Spaces to Facilities...');

    // 1. Get all orphaned spaces using Raw SQL to bypass Schema Validation (facilityId is required in schema but null in DB)
    // AND to ensure we fetch 'type' column which was removed from schema but preserved in DB.
    const allOrphanedSpaces: any[] = await prisma.$queryRaw`SELECT * FROM "Space" WHERE "facilityId" IS NULL`;

    console.log(`📊 Found ${allOrphanedSpaces.length} total orphaned spaces to migrate.`);

    // Group by OrgId
    const spacesByOrg: Record<string, any[]> = {};
    for (const space of allOrphanedSpaces) {
        if (!spacesByOrg[space.orgId]) spacesByOrg[space.orgId] = [];
        spacesByOrg[space.orgId].push(space);
    }

    const orgIds = Object.keys(spacesByOrg);
    console.log(`found ${orgIds.length} organizations with orphaned spaces.`);

    for (const orgId of orgIds) {
        const orphanedSpaces = spacesByOrg[orgId];
        const org = await prisma.organization.findUnique({ where: { id: orgId } });

        if (!org) continue;

        console.log(`🔧 Organization ${org.slug}: Migrating ${orphanedSpaces.length} orphaned spaces...`);

        // Group spaces by type to create logical facilities
        const spacesByType: Record<string, typeof orphanedSpaces> = {};
        orphanedSpaces.forEach(space => {
            const type = space.type || 'GENERIC';
            if (!spacesByType[type]) spacesByType[type] = [];
            spacesByType[type].push(space);
        });

        for (const [type, spaces] of Object.entries(spacesByType)) {
            // Create a facility for this type in this org
            const facilityName = `${type.charAt(0) + type.slice(1).toLowerCase()} Facility`;

            const facility = await prisma.facility.create({
                data: {
                    name: facilityName,
                    type: type,
                    orgId: org.id,
                    description: `Automatically created during migration to support ${type} spaces.`,
                    rules: {
                        create: {
                            openTime: '06:00',
                            closeTime: '22:00',
                            slotDurationMin: 60,
                        }
                    }
                }
            });

            console.log(`   ✨ Created ${facilityName} (ID: ${facility.id})`);

            // Link these spaces to the new facility
            const spaceIds = spaces.map(s => s.id);
            await prisma.space.updateMany({
                where: {
                    id: { in: spaceIds }
                },
                data: {
                    facilityId: facility.id
                }
            });

            console.log(`   🔗 Linked ${spaces.length} spaces to ${facilityName}.`);
        }
    }

    console.log('🏁 Migration complete.');
}

migrate()
    .catch((e) => {
        console.error('❌ Migration failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
