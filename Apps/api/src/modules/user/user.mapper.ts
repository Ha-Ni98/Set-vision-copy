import type { User } from '@prisma/client';
import { UserIdentityResponseSchema, type UserIdentityDTO, UserRole } from '@my-app/contract';

export class UserMapper {
  static toUserIdentityDTO(entity: User): UserIdentityDTO {
    const dto: UserIdentityDTO = {
      id: entity.id,
      username: entity.username,
      role: entity.role as UserRole,
      isEnabled: entity.isEnabled,
      lastLoginAt: entity.lastLoginAt?.toISOString() ?? null,
      createdAt: entity.createdAt.toISOString(),
    };
    return UserIdentityResponseSchema.parse(dto);
  }
}
