import type { Log, User, Admin, Activator } from '@prisma/client';
import { LogResponseSchema, LogActionType, type LogDTO } from '@my-app/contract';

type LogWithUser = Log & {
  user: User & { admin: Admin | null; activator: Activator | null };
};

export class LogMapper {
  static toDTO(log: LogWithUser): LogDTO {
    const { user } = log;
    const userName = user.admin?.fullName ?? user.activator?.fullName ?? user.username;

    const dto: LogDTO = {
      id: log.id,
      actionType: log.actionType as LogActionType,
      actionDescription: log.actionDescription,
      userName,
      createdAt: log.createdAt.toISOString(),
    };
    return LogResponseSchema.parse(dto);
  }
}
