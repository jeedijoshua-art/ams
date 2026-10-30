import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * AMS Production-Safe Database Seed
 *
 * This seed script is strictly non-destructive and idempotent.
 * It ensures required baseline system settings exist without wiping
 * existing accounts, enrollments, sessions, or attendance audit logs.
 *
 * To provision the initial administrator, run:
 *   npx tsx prisma/admin-bootstrap.ts --email=admin@institution.edu
 */
async function main() {
  console.log('🌱 Checking baseline AMS system settings...');

  const defaultSettings = [
    {
      key: 'attendance_threshold',
      value: '75',
      description: 'Minimum attendance percentage required to be in good academic standing',
    },
    {
      key: 'academic_term',
      value: 'Fall / ODD SEM 2026',
      description: 'Current active semester term',
    },
    {
      key: 'institution_name',
      value: 'Karunya Institute of Technology and Sciences',
      description: 'Institutional organization name',
    },
  ];

  for (const s of defaultSettings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: {}, // preserve existing configured value if already set
      create: {
        key: s.key,
        value: s.value,
        description: s.description,
      },
    });
  }

  console.log('✅ Baseline system settings verified.');
  console.log('----------------------------------------------------');
  console.log('ℹ️  No fake demonstration or benchmark data was inserted.');
  console.log('ℹ️  All student records must be registered via the Admin Portal or Bulk CSV import.');
  console.log('ℹ️  All faculty records must be provisioned by an authorized administrator.');
  console.log('ℹ️  To bootstrap or configure an initial administrator account:');
  console.log('   npm run admin:bootstrap -- --email=admin@your-institution.edu');
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
