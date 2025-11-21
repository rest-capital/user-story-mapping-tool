import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Check if constraint exists
    const result = await prisma.$queryRaw<any[]>`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'releases'
      AND constraint_name = 'unique_unassigned';
    `;

    console.log('Constraint check result:', result);

    if (result.length > 0) {
      console.log('⚠️  Constraint still exists, dropping it...');
      await prisma.$executeRawUnsafe(`
        ALTER TABLE releases DROP CONSTRAINT unique_unassigned;
      `);
      console.log('✅ Successfully dropped constraint');
    } else {
      console.log('✅ Constraint does not exist (good!)');
    }

    // Try creating two releases to verify
    console.log('\\nTesting: Creating first release...');
    const release1 = await prisma.release.create({
      data: {
        name: 'Test Release 1',
        description: '',
        isUnassigned: false,
        sortOrder: 0,
        createdBy: 'test-user',
      },
    });
    console.log('✅ Created release 1:', release1.id);

    console.log('Testing: Creating second release...');
    const release2 = await prisma.release.create({
      data: {
        name: 'Test Release 2',
        description: '',
        isUnassigned: false,
        sortOrder: 1,
        createdBy: 'test-user',
      },
    });
    console.log('✅ Created release 2:', release2.id);

    // Clean up
    await prisma.release.deleteMany({
      where: {
        id: {
          in: [release1.id, release2.id],
        },
      },
    });
    console.log('✅ Cleaned up test releases');
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
