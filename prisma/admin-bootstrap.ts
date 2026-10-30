import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

/**
 * AMS Secure Administrator Bootstrap Utility
 *
 * Usage:
 *   npx tsx prisma/admin-bootstrap.ts --email=admin@institution.edu [--password=CustomSecurePassword] [--force]
 *
 * Security Policies:
 * - Refuses to silently overwrite existing non-admin roles without --force.
 * - Never defaults to predictable or hardcoded passwords ('Admin@123').
 * - If no password is provided via flag or INITIAL_ADMIN_PASSWORD env,
 *   generates a cryptographically strong random password and displays it once.
 */
async function bootstrapAdmin() {
  const args = process.argv.slice(2);
  let email = process.env.INITIAL_ADMIN_EMAIL || process.env.ADMIN_EMAIL;
  let explicitPassword = process.env.INITIAL_ADMIN_PASSWORD || '';
  let force = false;
  let resetPassword = false;

  for (const arg of args) {
    if (arg.startsWith('--email=')) {
      email = arg.split('=')[1];
    } else if (arg.startsWith('--password=')) {
      explicitPassword = arg.split('=')[1];
    } else if (arg === '--force') {
      force = true;
    } else if (arg === '--reset-password') {
      resetPassword = true;
    }
  }

  if (!email) {
    console.error('❌ Error: Administrator email is required.');
    console.error('   Usage: npm run admin:bootstrap -- --email=admin@institution.edu [--password=...] [--force]');
    process.exit(1);
  }

  email = email.trim().toLowerCase();

  let finalPassword = explicitPassword;
  let generatedRandom = false;

  if (!finalPassword) {
    // Generate cryptographically secure random password
    finalPassword = crypto.randomBytes(16).toString('base64url');
    generatedRandom = true;
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: { studentProfile: true, facultyProfile: true },
  });

  if (existingUser) {
    // Safety check: Don't accidentally overwrite an active student or faculty user
    if (existingUser.role !== Role.ADMIN && !force) {
      console.error('❌ Security Violation: User exists with non-ADMIN role.');
      console.error(`   Email: ${email}`);
      console.error(`   Current Role: ${existingUser.role}`);
      console.error('   Bootstrapping will NOT automatically convert non-admin users to ADMIN.');
      console.error('   If this is an intentional institutional promotion, re-run with --force.');
      process.exit(1);
    }

    // If already admin and no explicit password or --reset-password was provided, do not overwrite existing credentials
    if (existingUser.role === Role.ADMIN && !explicitPassword && !resetPassword) {
      console.log(`ℹ️  Administrator record already exists for ${email}.`);
      console.log('   Credentials preserved. Use --password=NEW_PASS or --reset-password to update.');
      return;
    }

    const passwordHash = await bcrypt.hash(finalPassword, 10);

    const updated = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        role: Role.ADMIN,
        isActive: true,
        passwordHash,
      },
    });

    console.log(`✅ Administrator credentials updated for: ${updated.email}`);
    console.log(`   User ID: ${updated.id}`);
  } else {
    const passwordHash = await bcrypt.hash(finalPassword, 10);

    const created = await prisma.user.create({
      data: {
        email,
        authUserId: `admin_bootstrap_${crypto.randomUUID()}`,
        role: Role.ADMIN,
        isActive: true,
        passwordHash,
      },
    });

    console.log('✅ Created new initial administrator record:');
    console.log(`   Email: ${created.email}`);
    console.log(`   User ID: ${created.id}`);
    console.log(`   Role: ${created.role}`);
  }

  if (generatedRandom) {
    console.log('----------------------------------------------------');
    console.log('🔐 GENERATED SECURE INITIAL ADMINISTRATOR PASSWORD:');
    console.log(`   ${finalPassword}`);
    console.log('   Save this password immediately. It will not be shown again.');
    console.log('----------------------------------------------------');
  } else {
    console.log('----------------------------------------------------');
    console.log('🔐 Administrator password set via specified configuration.');
    console.log('----------------------------------------------------');
  }
}

bootstrapAdmin()
  .catch((err) => {
    console.error('❌ Admin bootstrap failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
