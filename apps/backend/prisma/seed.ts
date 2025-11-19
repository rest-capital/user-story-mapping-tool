import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env') });

// Use direct URL for seeding
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL,
    },
  },
});

async function main() {
  console.log('🌱 Starting database seeding...');

  // Check if Unassigned release already exists
  const existingUnassigned = await prisma.release.findFirst({
    where: { isUnassigned: true },
  });

  if (existingUnassigned) {
    console.log('✅ Unassigned release already exists:', existingUnassigned.name);
    return;
  }

  // Create the special "Unassigned" release
  const unassignedRelease = await prisma.release.create({
    data: {
      name: 'Unassigned',
      description: 'Default release for unassigned stories',
      isUnassigned: true,
      sortOrder: 999999, // Always at the bottom
      createdBy: 'system',
      shipped: false,
    },
  });

  console.log('✅ Created Unassigned release:', unassignedRelease.name);
  console.log('🎉 Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
