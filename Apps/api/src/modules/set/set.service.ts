import type { PrismaClient } from '@prisma/client';
import { SetStat as PrismaSetStat, CardStat } from '@prisma/client';
import { LogActionType, SetStat } from '@my-app/contract';
import type {
  SetDTO,
  CreateSetCommand,
  TransitionSetCommand,
  GetSetsQuery,
  PaginatedResult,
} from '@my-app/contract';
import type { ISetService } from './set.interface';
import { SetMapper } from './set.mapper';
import { generateSetNumber } from './set.util';
import { buildPaginationMeta, toSkipTake } from '@common/http/pagination';
import { NotFoundError, ConflictError, BadRequestError } from '@common/errors';

const ALLOWED_TRANSITIONS: Record<string, SetStat> = {
  [SetStat.NOT_PRINTED]: SetStat.PENDING_PRINTING,
  [SetStat.PENDING_PRINTING]: SetStat.PRINTED,
};

export class SetService implements ISetService {
  constructor(private readonly prisma: PrismaClient) {}

  async getAll(query: GetSetsQuery): Promise<PaginatedResult<SetDTO>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where = {
      ...(query.search && { setNumber: { contains: query.search, mode: 'insensitive' as const } }),
      ...(query.subscriptionPlanId && { subscriptionPlanId: query.subscriptionPlanId }),
      ...(query.state && { setStat: query.state as PrismaSetStat }),
    };

    const [sets, total] = await Promise.all([
      this.prisma.set.findMany({
        where,
        include: { subscriptionPlan: true },
        orderBy: { createdAt: 'desc' },
        ...toSkipTake({ page, limit }),
      }),
      this.prisma.set.count({ where }),
    ]);

    const items = sets.map((s) => SetMapper.toDTO(s, s.subscriptionPlan));
    return { items, meta: buildPaginationMeta(page, limit, total) };
  }

  async create(cmd: CreateSetCommand, _actorId: string): Promise<SetDTO> {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: cmd.subscriptionPlanId },
    });

    if (!plan || !plan.isActive) {
      throw new BadRequestError('Subscription plan not found or inactive');
    }

    // Keys now come from the admin (auto-generated then optionally edited, Stage-04-fix).
    // Reject any that already exist so the modal can highlight them — the Zod schema already
    // guarantees the format and that they're unique within the request itself.
    const existingCards = await this.prisma.card.findMany({
      where: { key: { in: cmd.keys } },
      select: { key: true },
    });
    if (existingCards.length > 0) {
      throw new ConflictError('Some keys already exist', {
        takenKeys: existingCards.map((c) => c.key),
      });
    }

    const setNumber = await this.uniqueSetNumber();

    const set = await this.prisma.$transaction(async (tx) => {
      const created = await tx.set.create({
        data: {
          setNumber,
          subscriptionPlanId: cmd.subscriptionPlanId,
          numberOfKeys: cmd.keys.length,
          setStat: PrismaSetStat.NOT_PRINTED,
        },
      });

      await tx.card.createMany({
        data: cmd.keys.map((key) => ({
          key,
          subscriptionPlanId: cmd.subscriptionPlanId,
          setId: created.id,
          cardStat: CardStat.IN_SET,
          isActive: false,
        })),
      });

      return created;
    });

    return SetMapper.toDTO(set, plan);
  }

  async transition(id: string, cmd: TransitionSetCommand): Promise<SetDTO> {
    const set = await this.prisma.set.findUnique({
      where: { id },
      include: { subscriptionPlan: true },
    });

    if (!set) throw new NotFoundError('Set not found');

    const allowed = ALLOWED_TRANSITIONS[set.setStat];
    if (!allowed || allowed !== cmd.to) {
      throw new ConflictError(`Cannot transition from ${set.setStat} to ${cmd.to}`);
    }

    let updated: typeof set;

    if (cmd.to === SetStat.PRINTED) {
      updated = await this.prisma.$transaction(async (tx) => {
        const s = await tx.set.update({
          where: { id },
          data: { setStat: PrismaSetStat.PRINTED, printedAt: new Date() },
          include: { subscriptionPlan: true },
        });
        await tx.card.updateMany({
          where: { setId: id, cardStat: CardStat.IN_SET },
          data: { cardStat: CardStat.PRINTED },
        });
        return s;
      });
    } else {
      updated = await this.prisma.set.update({
        where: { id },
        data: { setStat: cmd.to as PrismaSetStat },
        include: { subscriptionPlan: true },
      });
    }

    return SetMapper.toDTO(updated, updated.subscriptionPlan);
  }

  async delete(id: string, actorId: string): Promise<void> {
    const set = await this.prisma.set.findUnique({ where: { id } });

    if (!set) throw new NotFoundError('Set not found');

    if (set.setStat !== PrismaSetStat.NOT_PRINTED && set.setStat !== PrismaSetStat.PENDING_PRINTING) {
      throw new ConflictError(`Cannot delete a set in state ${set.setStat}`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.card.deleteMany({ where: { setId: id } });
      await tx.set.delete({ where: { id } });
    });

    await this.prisma.log.create({
      data: {
        actionType: LogActionType.REMOVE_SET,
        actionDescription: `Deleted set: ${set.setNumber}`,
        userId: actorId,
      },
    });
  }

  private async uniqueSetNumber(): Promise<string> {
    for (let i = 0; i < 5; i++) {
      const candidate = generateSetNumber();
      const existing = await this.prisma.set.findUnique({ where: { setNumber: candidate } });
      if (!existing) return candidate;
    }
    throw new Error('Failed to generate a unique set number');
  }
}
