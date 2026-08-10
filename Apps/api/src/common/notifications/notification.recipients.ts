import type { PrismaClient } from '@prisma/client';
import { UserRole } from '@my-app/contract';
import type { NotificationRecipient } from './notification.types';

// Four recipient-resolution queries. Each filters out unlinked/disabled profiles itself, so
// "no chat id ⇒ no Notification row" is structural, not left to the caller (Set 6 plan §5.2).

/** Every ACTIVE activator with a linked chat. Activator has no isEnabled of its own —
 *  enablement lives on User — so the User join is mandatory, not decorative. */
export async function allActivators(prisma: PrismaClient): Promise<NotificationRecipient[]> {
  const rows = await prisma.activator.findMany({
    where: { telegramChatId: { not: null }, user: { isEnabled: true, deletedAt: null } },
    select: { id: true, fullName: true, telegramChatId: true },
  });
  return rows.map((r) => ({
    role: UserRole.ACTIVATOR,
    profileId: r.id,
    name: r.fullName,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    address: r.telegramChatId!,
  }));
}

/** One activator by Activator.id — the id the bus payloads already carry. */
export async function oneActivator(
  prisma: PrismaClient,
  activatorId: string,
): Promise<NotificationRecipient | null> {
  const row = await prisma.activator.findFirst({
    where: { id: activatorId, telegramChatId: { not: null }, user: { isEnabled: true, deletedAt: null } },
    select: { id: true, fullName: true, telegramChatId: true },
  });
  if (!row?.telegramChatId) return null;
  return { role: UserRole.ACTIVATOR, profileId: row.id, name: row.fullName, address: row.telegramChatId };
}

/** Every ACTIVE admin with a linked chat. BOTH isEnabled flags: Admin.isEnabled is the
 *  business toggle, User.isEnabled the access toggle, and they can disagree. */
export async function allAdmins(prisma: PrismaClient): Promise<NotificationRecipient[]> {
  const rows = await prisma.admin.findMany({
    where: {
      telegramChatId: { not: null },
      isEnabled: true,
      user: { isEnabled: true, deletedAt: null },
    },
    select: { id: true, fullName: true, telegramChatId: true },
  });
  return rows.map((r) => ({
    role: UserRole.ADMIN,
    profileId: r.id,
    name: r.fullName,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    address: r.telegramChatId!,
  }));
}

/** One distributor by Distributor.id. NOTE: no User predicate — Distributor.userId is
 *  nullable and an account-less distributor is a legal recipient (§1.1). Gated on the
 *  distributor's OWN isEnabled + deletedAt instead. */
export async function oneDistributor(
  prisma: PrismaClient,
  distributorId: string,
): Promise<NotificationRecipient | null> {
  const row = await prisma.distributor.findFirst({
    where: { id: distributorId, telegramChatId: { not: null }, isEnabled: true, deletedAt: null },
    select: { id: true, storeName: true, telegramChatId: true },
  });
  if (!row?.telegramChatId) return null;
  return { role: UserRole.DISTRIBUTOR, profileId: row.id, name: row.storeName, address: row.telegramChatId };
}
