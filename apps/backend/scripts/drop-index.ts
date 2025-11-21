import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe(`
      DROP INDEX IF EXISTS releases_is_unassigned_key;
    `);

    console.log('✅ Successfully dropped releases_is_unassigned_key index');
  } catch (error) {
    console.error('❌ Error dropping index:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
