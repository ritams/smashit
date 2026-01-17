import { prisma } from '@smashit/database';

async function main() {
  const bookings = await prisma.booking.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
        space: { select: { org: { select: { slug: true } } } }
    }
  });
  console.log(JSON.stringify(bookings, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
