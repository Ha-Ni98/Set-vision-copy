import type { PrismaClient, Prisma } from '@prisma/client';
import type { LogActionType as PrismaLogActionType } from '@prisma/client';
import type { ILogService } from './log.interface';
import { LogMapper } from './log.mapper';
import { buildPaginationMeta, toSkipTake } from '@common/http/pagination';
import type { LogDTO, GetLogsQuery, PaginatedResult } from '@my-app/contract';

export class LogService implements ILogService {
  constructor(private prisma: PrismaClient) {}

  async getAll(query: GetLogsQuery): Promise<PaginatedResult<LogDTO>> {
    const conditions: Prisma.LogWhereInput[] = [];

    if (query.userId) conditions.push({ userId: query.userId });
    if (query.actionType) {
      conditions.push({ actionType: { equals: query.actionType as PrismaLogActionType } });
    }
    if (query.search) {
      conditions.push({ actionDescription: { contains: query.search, mode: 'insensitive' } });
    }
    if (query.dateFrom || query.dateTo) {
      conditions.push({
        createdAt: {
          ...(query.dateFrom && { gte: new Date(query.dateFrom) }),
          ...(query.dateTo && { lte: new Date(query.dateTo) }),
        },
      });
    }

    const where: Prisma.LogWhereInput = conditions.length > 0 ? { AND: conditions } : {};

    const [rows, total] = await Promise.all([
      this.prisma.log.findMany({
        where,
        include: { user: { include: { admin: true, activator: true } } },
        orderBy: { createdAt: 'desc' },
        ...toSkipTake(query),
      }),
      this.prisma.log.count({ where }),
    ]);

    return {
      items: rows.map(LogMapper.toDTO),
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }
}
