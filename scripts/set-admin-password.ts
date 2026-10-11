import { randomUUID } from 'node:crypto';
import { prisma } from '../src/lib/prisma';
import { auth } from '../src/lib/auth';

async function main() {
  const email = 'sandaniainaadrien030@gmail.com';
  const password = process.env.ADMIN_PASSWORD;

  if (!password || password.length < 8) {
    throw new Error('Définis ADMIN_PASSWORD avec au moins 8 caractères.');
  }

  // Retrouver l'utilisateur existant
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error(`Utilisateur introuvable : ${email}`);
  }

  // Utiliser le hachage de l'instance Better Auth
  const context = await auth.$context;
  const hashedPassword = await context.password.hash(password);

  // Chercher le compte credential existant
  const account = await prisma.account.findFirst({
    where: {
      userId: user.id,
      providerId: 'credential',
    },
  });

  if (account) {
    await prisma.account.update({
      where: { id: account.id },
      data: {
        accountId: user.id,
        password: hashedPassword,
        updatedAt: new Date(),
      },
    });
  } else {
    await prisma.account.create({
      data: {
        id: randomUUID(),
        accountId: user.id,
        providerId: 'credential',
        userId: user.id,
        password: hashedPassword,
      },
    });
  }

  console.log(`Mot de passe configuré pour ${email}.`);
}

main()
  .catch((error) => {
    console.error('Échec :', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
