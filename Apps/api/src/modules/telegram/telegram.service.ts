import type { PrismaClient, Prisma } from '@prisma/client';
import { UserRole, LogActionType, type TelegramLinkStatusDTO } from '@my-app/contract';
import { NotFoundError } from '@common/errors';
import { generateOpaqueToken } from '@common/utils/token.utils';
import type { ITelegramService } from './telegram.interface';
import { TelegramMapper, type TelegramProfileRow } from './telegram.mapper';

const ROLE_LABEL: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'admin',
  [UserRole.ACTIVATOR]: 'activator',
  [UserRole.DISTRIBUTOR]: 'distributor',
};

export class TelegramService implements ITelegramService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly botUsername: string,
  ) {}

  async getLinkStatus(role: UserRole, profileId: string): Promise<TelegramLinkStatusDTO> {
    const row = await this.loadProfile(this.prisma, role, profileId);
    return TelegramMapper.toDTO(role, row, this.botUsername);
  }

  async generateToken(
    role: UserRole,
    profileId: string,
    actorId: string,
  ): Promise<TelegramLinkStatusDTO> {
    const existing = await this.loadProfile(this.prisma, role, profileId);
    const isRegenerate = existing.telegramLinkToken !== null;

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await this.setToken(tx, role, profileId, await this.uniqueToken(tx));
      await tx.log.create({
        data: {
          actionType: LogActionType.GENERATE_TELEGRAM_TOKEN,
          actionDescription: `${isRegenerate ? 'Regenerated' : 'Generated'} a Telegram link token for ${ROLE_LABEL[role]} ${row.name}`,
          userId: actorId,
        },
      });
      return row;
    });

    return TelegramMapper.toDTO(role, updated, this.botUsername);
  }

  async unlink(role: UserRole, profileId: string, actorId: string): Promise<TelegramLinkStatusDTO> {
    const existing = await this.loadProfile(this.prisma, role, profileId);

    const updated = await this.prisma.$transaction(async (tx) => {
      // Clears all three fields (Set 6 plan §8.4 / v2-decisions A2): a stale token left after
      // an intentional unlink would otherwise stay live and let a leaked link re-attach.
      const row = await this.clearAll(tx, role, profileId);
      await tx.log.create({
        data: {
          actionType: LogActionType.UNLINK_TELEGRAM,
          actionDescription: `Unlinked Telegram for ${ROLE_LABEL[role]} ${existing.name}`,
          userId: actorId,
        },
      });
      return row;
    });

    return TelegramMapper.toDTO(role, updated, this.botUsername);
  }

  // Retries once on a token collision (P2002) — astronomically unlikely at 256 bits of
  // entropy, but the defensive shape costs nothing (Set 6 plan §8.2).
  private async uniqueToken(tx: Prisma.TransactionClient): Promise<string> {
    for (let attempt = 0; attempt < 2; attempt++) {
      const token = generateOpaqueToken();
      const [a, b, c] = await Promise.all([
        tx.admin.findUnique({ where: { telegramLinkToken: token }, select: { id: true } }),
        tx.activator.findUnique({ where: { telegramLinkToken: token }, select: { id: true } }),
        tx.distributor.findUnique({ where: { telegramLinkToken: token }, select: { id: true } }),
      ]);
      if (!a && !b && !c) return token;
    }
    throw new Error('Failed to generate a unique Telegram link token');
  }

  private async loadProfile(
    client: Prisma.TransactionClient | PrismaClient,
    role: UserRole,
    profileId: string,
  ): Promise<TelegramProfileRow> {
    switch (role) {
      case UserRole.ADMIN: {
        const row = await client.admin.findUnique({ where: { id: profileId } });
        if (!row) throw new NotFoundError('Admin not found');
        return {
          id: row.id,
          name: row.fullName,
          telegramChatId: row.telegramChatId,
          telegramLinkToken: row.telegramLinkToken,
          telegramLinkedAt: row.telegramLinkedAt,
        };
      }
      case UserRole.ACTIVATOR: {
        const row = await client.activator.findUnique({ where: { id: profileId } });
        if (!row) throw new NotFoundError('Activator not found');
        return {
          id: row.id,
          name: row.fullName,
          telegramChatId: row.telegramChatId,
          telegramLinkToken: row.telegramLinkToken,
          telegramLinkedAt: row.telegramLinkedAt,
        };
      }
      case UserRole.DISTRIBUTOR: {
        const row = await client.distributor.findFirst({ where: { id: profileId, deletedAt: null } });
        if (!row) throw new NotFoundError('Distributor not found');
        return {
          id: row.id,
          name: row.storeName,
          telegramChatId: row.telegramChatId,
          telegramLinkToken: row.telegramLinkToken,
          telegramLinkedAt: row.telegramLinkedAt,
        };
      }
    }
  }

  private async setToken(
    tx: Prisma.TransactionClient,
    role: UserRole,
    profileId: string,
    token: string,
  ): Promise<TelegramProfileRow> {
    switch (role) {
      case UserRole.ADMIN: {
        const row = await tx.admin.update({
          where: { id: profileId },
          data: { telegramLinkToken: token },
        });
        return {
          id: row.id,
          name: row.fullName,
          telegramChatId: row.telegramChatId,
          telegramLinkToken: row.telegramLinkToken,
          telegramLinkedAt: row.telegramLinkedAt,
        };
      }
      case UserRole.ACTIVATOR: {
        const row = await tx.activator.update({
          where: { id: profileId },
          data: { telegramLinkToken: token },
        });
        return {
          id: row.id,
          name: row.fullName,
          telegramChatId: row.telegramChatId,
          telegramLinkToken: row.telegramLinkToken,
          telegramLinkedAt: row.telegramLinkedAt,
        };
      }
      case UserRole.DISTRIBUTOR: {
        const row = await tx.distributor.update({
          where: { id: profileId },
          data: { telegramLinkToken: token },
        });
        return {
          id: row.id,
          name: row.storeName,
          telegramChatId: row.telegramChatId,
          telegramLinkToken: row.telegramLinkToken,
          telegramLinkedAt: row.telegramLinkedAt,
        };
      }
    }
  }

  private async clearAll(
    tx: Prisma.TransactionClient,
    role: UserRole,
    profileId: string,
  ): Promise<TelegramProfileRow> {
    const data = { telegramChatId: null, telegramLinkToken: null, telegramLinkedAt: null };
    switch (role) {
      case UserRole.ADMIN: {
        const row = await tx.admin.update({ where: { id: profileId }, data });
        return {
          id: row.id,
          name: row.fullName,
          telegramChatId: row.telegramChatId,
          telegramLinkToken: row.telegramLinkToken,
          telegramLinkedAt: row.telegramLinkedAt,
        };
      }
      case UserRole.ACTIVATOR: {
        const row = await tx.activator.update({ where: { id: profileId }, data });
        return {
          id: row.id,
          name: row.fullName,
          telegramChatId: row.telegramChatId,
          telegramLinkToken: row.telegramLinkToken,
          telegramLinkedAt: row.telegramLinkedAt,
        };
      }
      case UserRole.DISTRIBUTOR: {
        const row = await tx.distributor.update({ where: { id: profileId }, data });
        return {
          id: row.id,
          name: row.storeName,
          telegramChatId: row.telegramChatId,
          telegramLinkToken: row.telegramLinkToken,
          telegramLinkedAt: row.telegramLinkedAt,
        };
      }
    }
  }
}
