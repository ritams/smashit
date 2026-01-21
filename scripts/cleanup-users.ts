
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting user cleanup...');
    const targetEmail = 'ritam4jnu@gmail.com';

    try {
        const deleted = await prisma.user.deleteMany({
            where: {
                email: {
                    not: targetEmail,
                },
            },
        });

        console.log(`Deleted ${deleted.count} users (kept ${targetEmail}).`);
    } catch (error) {
        console.error('Error cleaning up users:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
