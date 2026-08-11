import type { PrismaClient, Prisma } from '@prisma/client';
import { UserRole } from '@my-app/contract';
import type { NotificationRecipient } from './notification.types';

export type ConsumeOutcome =
  | { ok: true; recipient: NotificationRecipient }
  | { ok: false; reason: 'NOT_FOUND' };

/**
 * THE ONLY function in the codebase that matches a telegramLinkToken and writes a
 * telegramChatId. Called by telegram.intake.ts and by nothing else, ever — neither transport
 * (polling or webhook) contains any token logic of its own (Set 6 plan §3.2).
 */
export async function consumeLinkToken(
  prisma: PrismaClient,
  token: string,
  chatId: string,
): Promise<ConsumeOutcome> {
  return prisma.$transaction(async (tx) => {
    const admin = await tx.admin.findUnique({ where: { telegramLinkToken: token } });
    if (admin) return claimAdmin(tx, admin.id, token, chatId);

    const activator = await tx.activator.findUnique({ where: { telegramLinkToken: token } });
    if (activator) return claimActivator(tx, activator.id, token, chatId);

    const distributor = await tx.distributor.findUnique({ where: { telegramLinkToken: token } });
    if (distributor) return claimDistributor(tx, distributor.id, token, chatId);

    return { ok: false, reason: 'NOT_FOUND' };
  });
}

async function claimAdmin(
  tx: Prisma.TransactionClient,
  id: string,
  token: string,
  chatId: string,
): Promise<ConsumeOutcome> {
  // One chat <-> one profile PER MODEL: clear any other admin already holding this chat id
  // before claiming, so re-linking never leaves two profiles delivering to the same chat.
  // Deliberately NOT cross-model — one person may legitimately be both an admin and a
  // distributor and should receive both streams.
  await tx.admin.updateMany({
    where: { telegramChatId: chatId, id: { not: id } },
    data: { telegramChatId: null, telegramLinkedAt: null },
  });

  const { count } = await tx.admin.updateMany({
    where: { id, telegramLinkToken: token },
    data: { telegramChatId: chatId, telegramLinkedAt: new Date(), telegramLinkToken: null },
  });
  if (count !== 1) return { ok: false, reason: 'NOT_FOUND' };

  const admin = await tx.admin.findUniqueOrThrow({ where: { id }, select: { fullName: true } });
  return {
    ok: true,
    recipient: { role: UserRole.ADMIN, profileId: id, name: admin.fullName, address: chatId },
  };
}

async function claimActivator(
  tx: Prisma.TransactionClient,
  id: string,
  token: string,
  chatId: string,
): Promise<ConsumeOutcome> {
  await tx.activator.updateMany({
    where: { telegramChatId: chatId, id: { not: id } },
    data: { telegramChatId: null, telegramLinkedAt: null },
  });

  const { count } = await tx.activator.updateMany({
    where: { id, telegramLinkToken: token },
    data: { telegramChatId: chatId, telegramLinkedAt: new Date(), telegramLinkToken: null },
  });
  if (count !== 1) return { ok: false, reason: 'NOT_FOUND' };

  const activator = await tx.activator.findUniqueOrThrow({
    where: { id },
    select: { fullName: true },
  });
  return {
    ok: true,
    recipient: { role: UserRole.ACTIVATOR, profileId: id, name: activator.fullName, address: chatId },
  };
}

async function claimDistributor(
  tx: Prisma.TransactionClient,
  id: string,
  token: string,
  chatId: string,
): Promise<ConsumeOutcome> {
  await tx.distributor.updateMany({
    where: { telegramChatId: chatId, id: { not: id } },
    data: { telegramChatId: null, telegramLinkedAt: null },
  });

  const { count } = await tx.distributor.updateMany({
    where: { id, telegramLinkToken: token },
    data: { telegramChatId: chatId, telegramLinkedAt: new Date(), telegramLinkToken: null },
  });
  if (count !== 1) return { ok: false, reason: 'NOT_FOUND' };

  const distributor = await tx.distributor.findUniqueOrThrow({
    where: { id },
    select: { storeName: true },
  });
  return {
    ok: true,
    recipient: {
      role: UserRole.DISTRIBUTOR,
      profileId: id,
      name: distributor.storeName,
      address: chatId,
    },
  };
}
