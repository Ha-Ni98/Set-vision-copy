import type { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { LogActionType } from '@my-app/contract';
import type {
  ActivationEmailDTO,
  PaginatedActivationEmails,
  ActivationEmailOptionDTO,
  GetActivationEmailsQuery,
  GetActivationEmailPoolQuery,
  CreateActivationEmailCommand,
} from '@my-app/contract';
import type { IActivationEmailService } from './activation-email.interface';
import { ActivationEmailMapper } from './activation-email.mapper';
import { buildPaginationMeta, toSkipTake } from '@common/http/pagination';
import { NotFoundError, ConflictError } from '@common/errors';

// The picker is a chooser, not a browser — it must present the whole ordered pool so "the
// first option is the least-recently-used address" is true. This cap exists only so a
// runaway pool can never blow up the payload or the <Select>, not as real pagination (Set 10
// plan §2).
const ACTIVATION_EMAIL_POOL_LIMIT = 100;

function normalize(email: string): string {
  return email.trim().toLowerCase();
}

// Set 10 (D13). Exported and called by BOTH activation completion paths (activate() and
// activateByAdmin()), INSIDE the transaction they already open — mirrors card.service.ts's
// revokeCardWithin, the established pattern for a cross-module write that must join the
// caller's transaction. Never called outside a transaction.
//
// Matches an ACTIVE pool row for this plan (case-insensitive, trimmed) and increments its
// usage counter. A free address with no match, or a match against a soft-deleted row, does
// nothing — no pool row is ever created or implicitly restored here (A5).
export async function consumeActivationEmailWithin(
  tx: Prisma.TransactionClient,
  args: { subscriptionPlanId: string; email: string; now: Date },
): Promise<void> {
  const email = normalize(args.email);

  const row = await tx.activationEmail.findUnique({
    where: { subscriptionPlanId_email: { subscriptionPlanId: args.subscriptionPlanId, email } },
  });

  if (!row || row.isDeleted) return;

  await tx.activationEmail.update({
    where: { id: row.id },
    data: { nbOfActivation: { increment: 1 }, lastUsedAt: args.now },
  });
}

export class ActivationEmailService implements IActivationEmailService {
  constructor(private readonly prisma: PrismaClient) {}

  async getAll(query: GetActivationEmailsQuery): Promise<PaginatedActivationEmails> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where = {
      isDeleted: false,
      ...(query.subscriptionPlanId && { subscriptionPlanId: query.subscriptionPlanId }),
      ...(query.search && { email: { contains: query.search, mode: 'insensitive' as const } }),
    };

    const [rows, total] = await Promise.all([
      this.prisma.activationEmail.findMany({
        where,
        include: { subscriptionPlan: { select: { subscriptionType: true, subscriptionDuration: true } } },
        orderBy: { createdAt: 'desc' },
        ...toSkipTake({ page, limit }),
      }),
      this.prisma.activationEmail.count({ where }),
    ]);

    const items = rows.map((r) => ActivationEmailMapper.toDTO(r, r.subscriptionPlan));
    return { items, meta: buildPaginationMeta(page, limit, total) };
  }

  async getPool(query: GetActivationEmailPoolQuery): Promise<ActivationEmailOptionDTO[]> {
    const rows = await this.prisma.activationEmail.findMany({
      where: { subscriptionPlanId: query.subscriptionPlanId, isDeleted: false },
      orderBy: [
        { lastUsedAt: { sort: 'asc', nulls: 'first' } }, // never-used first (A4)
        { createdAt: 'asc' }, // deterministic among never-used
      ],
      take: ACTIVATION_EMAIL_POOL_LIMIT,
    });

    return rows.map((r) => ActivationEmailMapper.toOptionDTO(r));
  }

  async create(cmd: CreateActivationEmailCommand, actorId: string): Promise<ActivationEmailDTO> {
    const email = normalize(cmd.email);

    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: cmd.subscriptionPlanId },
    });
    if (!plan) throw new NotFoundError('Subscription plan not found');

    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const existing = await tx.activationEmail.findUnique({
          where: {
            subscriptionPlanId_email: { subscriptionPlanId: cmd.subscriptionPlanId, email },
          },
        });

        if (existing && !existing.isDeleted) {
          throw new ConflictError('This email is already in the pool for this plan');
        }

        const isRestore = existing !== null;

        const saved = await tx.activationEmail.upsert({
          where: {
            subscriptionPlanId_email: { subscriptionPlanId: cmd.subscriptionPlanId, email },
          },
          create: { subscriptionPlanId: cmd.subscriptionPlanId, email },
          // nbOfActivation and lastUsedAt UNTOUCHED — restore preserves the counter (A6).
          update: { isDeleted: false, deletedAt: null },
        });

        await tx.log.create({
          data: {
            actionType: LogActionType.ADD_ACTIVATION_EMAIL,
            actionDescription: isRestore
              ? `Restored activation email ${email} for plan ${cmd.subscriptionPlanId} (previous usage count ${existing!.nbOfActivation} preserved)`
              : `Added activation email ${email} for plan ${cmd.subscriptionPlanId}`,
            userId: actorId,
          },
        });

        return saved;
      });

      return ActivationEmailMapper.toDTO(row, plan);
    } catch (err) {
      // Defense in depth: the [subscriptionPlanId, email] @unique constraint as a second
      // guard, in case the pre-check above ever loses a race. Same message either way, so
      // the caller sees one consistent error, never a raw 500 (Set 10 plan §4).
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictError('This email is already in the pool for this plan');
      }
      throw err;
    }
  }

  async delete(id: string, actorId: string): Promise<void> {
    const row = await this.prisma.activationEmail.findUnique({ where: { id } });
    if (!row || row.isDeleted) throw new NotFoundError('Activation email not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.activationEmail.update({
        where: { id },
        data: { isDeleted: true, deletedAt: new Date() },
      });

      await tx.log.create({
        data: {
          actionType: LogActionType.DELETE_ACTIVATION_EMAIL,
          actionDescription: `Deleted activation email ${row.email} for plan ${row.subscriptionPlanId} (usage count ${row.nbOfActivation})`,
          userId: actorId,
        },
      });
    });
  }
}
