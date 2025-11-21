import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Drop the unique constraint on is_unassigned
    await prisma.$executeRawUnsafe(`
      ALTER TABLE releases DROP CONSTRAINT IF EXISTS unique_unassigned;
    `);

    console.log('✅ Successfully dropped unique_unassigned constraint');
  } catch (error) {
    console.error('❌ Error dropping constraint:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
