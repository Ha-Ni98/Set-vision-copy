import type { PrismaClient, Prisma } from '@prisma/client';
import type {
  GetNotificationsQuery,
  PaginatedNotifications,
  NotificationDTO,
} from '@my-app/contract';
import type { INotificationListService } from './notification.interface';
import { NotificationMapper } from '../../common/notifications/notification.mapper';
import type { NotificationService as CommonNotificationService } from '../../common/notifications/notification.service';
import { buildPaginationMeta, toSkipTake } from '@common/http/pagination';

// Thin admin-facing read/resend surface over the Notification outbox. Delegates the actual
// resend logic to the common NotificationService singleton (common/notifications) — this
// module never touches a provider directly, matching the "notification.subscribers.ts is the
// ONLY caller of NotificationService for sends" rule; resend is the one sanctioned exception,
// answering an admin's own request.
export class NotificationListService implements INotificationListService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly notificationService: CommonNotificationService,
  ) {}

  async getAll(query: GetNotificationsQuery): Promise<PaginatedNotifications> {
    const conditions: Prisma.NotificationWhereInput[] = [];

    if (query.stat) conditions.push({ stat: query.stat });
    if (query.channel) conditions.push({ channel: query.channel });
    if (query.type) conditions.push({ type: query.type });
    if (query.recipientRole) conditions.push({ recipientRole: query.recipientRole });
    if (query.search) {
      conditions.push({
        OR: [
          { recipientName: { contains: query.search, mode: 'insensitive' } },
          { body: { contains: query.search, mode: 'insensitive' } },
        ],
      });
    }
    if (query.dateFrom || query.dateTo) {
      conditions.push({
        createdAt: {
          ...(query.dateFrom && { gte: new Date(query.dateFrom) }),
          ...(query.dateTo && { lte: new Date(query.dateTo) }),
        },
      });
    }

    const where: Prisma.NotificationWhereInput = conditions.length > 0 ? { AND: conditions } : {};

    const [rows, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...toSkipTake(query),
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      items: rows.map(NotificationMapper.toDTO),
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  async resend(id: string): Promise<NotificationDTO> {
    return this.notificationService.resend(id);
  }
}
