import { PrismaClient } from '@prisma/client';
import { pbkdf2Sync, randomBytes } from 'crypto';

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log(`Updating passwords for ${users.length} users in SQLite database...`);

  for (const u of users) {
    let pwd = 'Student@2026';
    if (u.role === 'ADMIN') pwd = 'Admin@2026';
    if (u.role === 'AUDITOR') pwd = 'Auditor@2026';

    await prisma.user.update({
      where: { id: u.id },
      data: { passwordHash: hashPassword(pwd) },
    });
    console.log(`[PASS_UPDATE] ${u.studentId} (${u.role}) -> ${pwd}`);
  }
  console.log('SUCCESS: All users updated with cryptographically salted PBKDF2 password hashes.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
