import type { PrismaClient } from '@prisma/client';
import {
  RevocationRequestStat as PrismaRevocationRequestStat,
  CardStat as PrismaCardStat,
  LogActionType as PrismaLogActionType,
} from '@prisma/client';
import { RevocationRequestStat } from '@my-app/contract';
import type {
  CardRevocationRequestDTO,
  RevocableCardDTO,
  PaginatedCardRevocationRequests,
  GetCardRevocationRequestsQuery,
  GetMyCardRevocationRequestsQuery,
  CreateCardRevocationRequestCommand,
  ReviewCardRevocationRequestCommand,
} from '@my-app/contract';
import type { ICardRevocationRequestService } from './card-revocation-request.interface';
import { CardRevocationRequestMapper } from './card-revocation-request.mapper';
import { revokeCardWithin } from '@modules/card/card.service';
import { buildPaginationMeta, toSkipTake } from '@common/http/pagination';
import { NotFoundError, ConflictError, ForbiddenError } from '@common/errors';
import { eventBus } from '@common/events/event-bus';

const DETAIL_INCLUDE = {
  card: { select: { key: true, subscriptionPlan: { select: { subscriptionType: true, subscriptionDuration: true } } } },
  distributor: { select: { storeName: true } },
  reviewedBy: { select: { admin: { select: { fullName: true } } } },
} as const;

export class CardRevocationRequestService implements ICardRevocationRequestService {
  constructor(private readonly prisma: PrismaClient) {}

  async getAll(query: GetCardRevocationRequestsQuery): Promise<PaginatedCardRevocationRequests> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where = {
      ...(query.search && {
        OR: [
          { distributor: { storeName: { contains: query.search, mode: 'insensitive' as const } } },
          { card: { key: { contains: query.search, mode: 'insensitive' as const } } },
        ],
      }),
      ...(query.distributorId && { distributorId: query.distributorId }),
      ...(query.state && { stat: query.state as PrismaRevocationRequestStat }),
      ...((query.dateFrom || query.dateTo) && {
        createdAt: {
          ...(query.dateFrom && { gte: new Date(query.dateFrom) }),
          ...(query.dateTo && { lte: new Date(query.dateTo) }),
        },
      }),
    };

    const [requests, total] = await Promise.all([
      this.prisma.cardRevocationRequest.findMany({
        where,
        include: DETAIL_INCLUDE,
        orderBy: { createdAt: 'desc' },
        ...toSkipTake({ page, limit }),
      }),
      this.prisma.cardRevocationRequest.count({ where }),
    ]);

    const items = requests.map((r) => CardRevocationRequestMapper.toDTO(r, r));
    return { items, meta: buildPaginationMeta(page, limit, total) };
  }

  async getMine(
    userId: string,
    query: GetMyCardRevocationRequestsQuery,
  ): Promise<PaginatedCardRevocationRequests> {
    const distributor = await this.resolveDistributor(userId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where = {
      distributorId: distributor.id,
      ...(query.state && { stat: query.state as PrismaRevocationRequestStat }),
    };

    const [requests, total] = await Promise.all([
      this.prisma.cardRevocationRequest.findMany({
        where,
        include: DETAIL_INCLUDE,
        orderBy: { createdAt: 'desc' },
        ...toSkipTake({ page, limit }),
      }),
      this.prisma.cardRevocationRequest.count({ where }),
    ]);

    const items = requests.map((r) => CardRevocationRequestMapper.toDTO(r, r));
    return { items, meta: buildPaginationMeta(page, limit, total) };
  }

  // §2 — eligibility mirrors the admin's own gate exactly (cardStat === ACTIVATION_FAILED,
  // not revoked, not disabled), scoped to the requesting distributor's own cards, with cards
  // already carrying a PENDING request hidden. Same predicate the service re-checks on create.
  async getEligible(userId: string): Promise<RevocableCardDTO[]> {
    const distributor = await this.resolveDistributor(userId);

    const cards = await this.prisma.card.findMany({
      where: {
        distributorId: distributor.id,
        deletedAt: null,
        cardStat: PrismaCardStat.ACTIVATION_FAILED,
        isRevoked: false,
        isDisabled: false,
        revocationRequests: { none: { stat: PrismaRevocationRequestStat.PENDING } },
      },
      include: {
        subscriptionPlan: { select: { subscriptionType: true, subscriptionDuration: true } },
        activations: {
          orderBy: { requestedAt: 'desc' },
          take: 1,
          select: { id: true, completedAt: true, clientFullName: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return cards.map((c) => CardRevocationRequestMapper.toRevocableCardDTO(c));
  }

  async getById(id: string): Promise<CardRevocationRequestDTO> {
    const request = await this.prisma.cardRevocationRequest.findUnique({
      where: { id },
      include: DETAIL_INCLUDE,
    });
    if (!request) throw new NotFoundError('Revocation request not found');
    return CardRevocationRequestMapper.toDTO(request, request);
  }

  async create(
    userId: string,
    cmd: CreateCardRevocationRequestCommand,
  ): Promise<CardRevocationRequestDTO> {
    const distributor = await this.resolveDistributor(userId);

    const card = await this.prisma.card.findUnique({ where: { id: cmd.cardId } });
    if (!card || card.deletedAt || card.distributorId !== distributor.id) {
      throw new NotFoundError('Card not found');
    }
    if (card.cardStat !== PrismaCardStat.ACTIVATION_FAILED) {
      throw new ConflictError('This card is not in a failed-activation state');
    }
    if (card.isRevoked) {
      throw new ConflictError('This card has already been revoked');
    }
    if (card.isDisabled) {
      throw new ConflictError('A disabled card cannot be revoked');
    }

    const pending = await this.prisma.cardRevocationRequest.findFirst({
      where: { cardId: cmd.cardId, stat: PrismaRevocationRequestStat.PENDING },
      select: { id: true },
    });
    if (pending) {
      throw new ConflictError('A revocation request for this card is already pending review.');
    }

    const latestActivation = await this.prisma.activation.findFirst({
      where: { cardId: cmd.cardId },
      orderBy: { requestedAt: 'desc' },
      select: { id: true },
    });

    const created = await this.prisma.cardRevocationRequest.create({
      data: {
        cardId: cmd.cardId,
        ...(latestActivation && { activationId: latestActivation.id }),
        distributorId: distributor.id,
        reason: cmd.reason,
        stat: PrismaRevocationRequestStat.PENDING,
      },
      include: DETAIL_INCLUDE,
    });

    const dto = CardRevocationRequestMapper.toDTO(created, created);

    eventBus.emit('revocation-request:created', {
      requestId: dto.id,
      distributorId: dto.distributorId,
      distributorName: dto.distributorName,
      cardId: dto.cardId,
      cardKey: dto.cardKey,
      subscriptionLabel: dto.subscriptionLabel,
      reason: dto.reason,
      timestamp: dto.createdAt,
    });

    return dto;
  }

  async approve(
    id: string,
    cmd: ReviewCardRevocationRequestCommand,
    actorId: string,
  ): Promise<CardRevocationRequestDTO> {
    const request = await this.prisma.cardRevocationRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundError('Revocation request not found');
    if (request.stat !== PrismaRevocationRequestStat.PENDING) {
      throw new ConflictError(`Cannot approve a revocation request in state ${request.stat}`);
    }

    await this.prisma.$transaction(async (tx) => {
      // Re-validates the card's eligibility inside the transaction — if the card changed
      // state since submit (already revoked, disabled, etc.), this throws and the whole
      // approval rolls back; the request stays PENDING.
      await revokeCardWithin(tx, request.cardId, actorId);

      await tx.cardRevocationRequest.update({
        where: { id },
        data: {
          stat: PrismaRevocationRequestStat.APPROVED,
          reviewedAt: new Date(),
          reviewedByUserId: actorId,
          ...(cmd.adminNote !== undefined && { adminNote: cmd.adminNote }),
        },
      });
      await tx.log.create({
        data: {
          actionType: PrismaLogActionType.CHANGE_REVOCATION_REQUEST_STAT,
          actionDescription: `Revocation request ${id} approved`,
          userId: actorId,
        },
      });
    });

    const dto = await this.getById(id);
    this.emitStatusChanged(dto, RevocationRequestStat.PENDING);
    return dto;
  }

  async reject(
    id: string,
    cmd: ReviewCardRevocationRequestCommand,
    actorId: string,
  ): Promise<CardRevocationRequestDTO> {
    const request = await this.prisma.cardRevocationRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundError('Revocation request not found');
    if (request.stat !== PrismaRevocationRequestStat.PENDING) {
      throw new ConflictError(`Cannot reject a revocation request in state ${request.stat}`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.cardRevocationRequest.update({
        where: { id },
        data: {
          stat: PrismaRevocationRequestStat.REJECTED,
          reviewedAt: new Date(),
          reviewedByUserId: actorId,
          ...(cmd.adminNote !== undefined && { adminNote: cmd.adminNote }),
        },
      });
      await tx.log.create({
        data: {
          actionType: PrismaLogActionType.CHANGE_REVOCATION_REQUEST_STAT,
          actionDescription: `Revocation request ${id} rejected`,
          userId: actorId,
        },
      });
    });

    const dto = await this.getById(id);
    this.emitStatusChanged(dto, RevocationRequestStat.PENDING);
    return dto;
  }

  async cancel(id: string, userId: string): Promise<CardRevocationRequestDTO> {
    const distributor = await this.resolveDistributor(userId);
    const request = await this.prisma.cardRevocationRequest.findFirst({
      where: { id, distributorId: distributor.id },
    });
    if (!request) throw new NotFoundError('Revocation request not found');
    if (request.stat !== PrismaRevocationRequestStat.PENDING) {
      throw new ConflictError(`Cannot cancel a revocation request in state ${request.stat}`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.cardRevocationRequest.update({
        where: { id },
        data: { stat: PrismaRevocationRequestStat.CANCELLED },
      });
      await tx.log.create({
        data: {
          actionType: PrismaLogActionType.CHANGE_REVOCATION_REQUEST_STAT,
          actionDescription: `Revocation request ${id} cancelled by distributor`,
          userId,
        },
      });
    });

    const dto = await this.getById(id);
    this.emitStatusChanged(dto, RevocationRequestStat.PENDING);
    return dto;
  }

  private emitStatusChanged(dto: CardRevocationRequestDTO, previousStat: RevocationRequestStat): void {
    eventBus.emit('revocation-request:status-changed', {
      requestId: dto.id,
      distributorId: dto.distributorId,
      cardId: dto.cardId,
      cardKey: dto.cardKey,
      stat: dto.stat,
      previousStat,
      adminNote: dto.adminNote,
      timestamp: dto.reviewedAt ?? new Date().toISOString(),
    });
  }

  private async resolveDistributor(userId: string) {
    const distributor = await this.prisma.distributor.findFirst({ where: { userId, deletedAt: null } });
    if (!distributor) throw new ForbiddenError();
    return distributor;
  }
}
