import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function bootstrapAdmin() {
  const args = process.argv.slice(2);
  let email = process.env.INITIAL_ADMIN_EMAIL || process.env.ADMIN_EMAIL;

  for (const arg of args) {
    if (arg.startsWith('--email=')) {
      email = arg.split('=')[1];
    }
  }

  if (!email) {
    email = 'admin@karunya.edu';
  }

  email = email.trim().toLowerCase();
  console.log(`🔐 Bootstrapping initial administrator for AMS: ${email}`);

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    const updated = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        role: Role.ADMIN,
        isActive: true,
      },
    });
    console.log(`✅ User ${updated.email} successfully confirmed/promoted to ADMIN.`);
    console.log(`   ID: ${updated.id}`);
  } else {
    const created = await prisma.user.create({
      data: {
        email,
        authUserId: `admin_bootstrap_${Date.now()}`,
        role: Role.ADMIN,
        isActive: true,
      },
    });
    console.log(`✅ Created new initial administrator record:`);
    console.log(`   Email: ${created.email}`);
    console.log(`   ID: ${created.id}`);
    console.log(`   Role: ${created.role}`);
  }

  console.log('🎉 Administrator bootstrapping complete.');
}

bootstrapAdmin()
  .catch((err) => {
    console.error('❌ Admin bootstrap failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
