import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // List ALL constraints on releases table
    const constraints = await prisma.$queryRaw<any[]>`
      SELECT
        constraint_name,
        constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'releases'
      ORDER BY constraint_name;
    `;

    console.log('All constraints on releases table:');
    console.table(constraints);

    // List ALL indexes on releases table
    const indexes = await prisma.$queryRaw<any[]>`
      SELECT
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = 'releases'
      ORDER BY indexname;
    `;

    console.log('\\nAll indexes on releases table:');
    console.table(indexes);
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
