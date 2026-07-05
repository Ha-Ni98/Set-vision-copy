import type { Wilaya, Commune } from '@prisma/client';
import {
  WilayaResponseSchema,
  CommuneResponseSchema,
  type WilayaDTO,
  type CommuneDTO,
} from '@my-app/contract';

export class GeographyMapper {
  static toWilayaDTO(wilaya: Wilaya): WilayaDTO {
    const dto: WilayaDTO = {
      id: wilaya.id,
      wilayaCode: wilaya.wilayaCode,
      frName: wilaya.frName,
      arName: wilaya.arName,
    };
    return WilayaResponseSchema.parse(dto);
  }

  static toCommuneDTO(commune: Commune): CommuneDTO {
    const dto: CommuneDTO = {
      id: commune.id,
      communeCode: commune.communeCode,
      wilayaId: commune.wilayaId,
      frName: commune.frName,
      arName: commune.arName,
    };
    return CommuneResponseSchema.parse(dto);
  }
}
