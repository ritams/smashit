/**
 * PRODUCTION MIGRATION SCRIPT: v1 (Hierarchy Refactor)
 * 
 * Purpose: Safely migrates existing Spaces into the new Facility-based hierarchy.
 * Run this script BEFORE enforcing the 'Required' constraint on facilityId in production.
 */

import { PrismaClient } from '@avith/database';
const prisma = new PrismaClient();

async function migrate() {
    console.log('🚀 Starting Production Migration: Spaces to Facilities...');

    // 1. Get all organizations
    const orgs = await prisma.organization.findMany({
        include: {
            spaces: {
                where: {
                    facilityId: null as any // Using 'any' to handle the case where the field might not yet be in the generated client or is optional
                }
            }
        }
    });

    console.log(`📊 Found ${orgs.length} organizations to check.`);

    for (const org of orgs) {
        const orphanedSpaces = org.spaces;

        if (orphanedSpaces.length === 0) {
            console.log(`✅ Organization ${org.slug}: No orphaned spaces found.`);
            continue;
        }

        console.log(`🔧 Organization ${org.slug}: Migrating ${orphanedSpaces.length} orphaned spaces...`);

        // Group spaces by type to create logical facilities
        const spacesByType: Record<string, typeof orphanedSpaces> = {};
        orphanedSpaces.forEach(space => {
            const type = (space as any).type || 'GENERIC';
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
