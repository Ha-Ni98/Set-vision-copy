import type { DeliveryCompany } from '@prisma/client';
import {
  DeliveryCompanyResponseSchema,
  type DeliveryCompanyDTO,
  type CreateDeliveryCompanyCommand,
  type UpdateDeliveryCompanyCommand,
} from '@my-app/contract';

export class DeliveryCompanyMapper {
  static toDTO(entity: DeliveryCompany): DeliveryCompanyDTO {
    const dto: DeliveryCompanyDTO = {
      id: entity.id,
      name: entity.name,
      registeredName: entity.registeredName,
      isActive: entity.isActive,
    };
    return DeliveryCompanyResponseSchema.parse(dto);
  }

  static toPersistence(cmd: CreateDeliveryCompanyCommand | UpdateDeliveryCompanyCommand): {
    name?: string;
    registeredName?: string;
  } {
    return {
      ...(cmd.name !== undefined && { name: cmd.name.trim() }),
      ...(cmd.registeredName !== undefined && { registeredName: cmd.registeredName.trim() }),
    };
  }
}
