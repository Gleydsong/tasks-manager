import dotenv from 'dotenv';
import { UserRole } from '@prisma/client';
import { prisma } from '../src/config/prisma';
import { hashPassword } from '../src/utils/password';

dotenv.config();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'admin123';
  const name = process.env.SEED_ADMIN_NAME ?? 'Admin';

  const hashedPassword = await hashPassword(password);

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name,
      email,
      password: hashedPassword,
      role: UserRole.admin,
    },
  });

  console.log(`Seed completed. Admin user ready at ${email}`);
}

main()
  .catch((error) => {
    console.error('Seed failed', error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
