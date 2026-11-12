import { randomUUID } from 'node:crypto';
import { prisma } from '../src/lib/prisma';
import { auth } from '../src/lib/auth';

async function main() {
  const email = 'sandaniainaadrien030@gmail.com';
  const password = '12345678';

  if (!password || password.length < 8) {
    throw new Error('ADMIN_PASSWORD doit contenir au moins 12 caractères.');
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: { agent: true },
  });

  if (existingUser?.agent) {
    console.log('Cet administrateur existe déjà.');
    return;
  }

  const context = await auth.$context;
  const hashedPassword = await context.password.hash(password);

  await prisma.$transaction(async (tx) => {
    // 1. Créer ou récupérer le compte utilisateur
    const user = await tx.user.upsert({
      where: { email },
      update: {},
      create: {
        id: 'admin-etat-civil-001',
        name: 'Administrateur Systeme',
        email,
        emailVerified: true,
      },
    });

    // 2. Créer ou mettre à jour le compte de connexion
    const account = await tx.account.findFirst({
      where: {
        userId: user.id,
        providerId: 'credential',
      },
    });

    if (account) {
      await tx.account.update({
        where: { id: account.id },
        data: {
          password: hashedPassword,
          accountId: user.id,
        },
      });
    } else {
      await tx.account.create({
        data: {
          id: randomUUID(),
          accountId: user.id,
          providerId: 'credential',
          userId: user.id,
          password: hashedPassword,
        },
      });
    }

    // 3. Récupérer le rôle ADMIN
    const role = await tx.application_role.upsert({
      where: { name: 'ADMIN' },
      update: {},
      create: {
        name: 'ADMIN',
        description: 'Administrateur principal du système',
      },
    });

    // Les étapes suivantes nécessitent un centre et une personne.
    console.log('Utilisateur et rôle préparés :', user.id, role.id);
  });

  console.log('Préparation terminée.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
