import { prisma } from '../db/client';

afterEach(async () => {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "Network","Job","JobLog","RouteSegmentCache","RequestLog" RESTART IDENTITY CASCADE',
  );
});

afterAll(async () => {
  await prisma.$disconnect();
});
