import type { PrismaClient } from '@prisma/client';
import type { IGeographyService } from './geography.interface';
import { GeographyMapper } from './geography.mapper';
import { NotFoundError } from '@common/errors';
import type { WilayaDTO, CommuneDTO } from '@my-app/contract';

export class GeographyService implements IGeographyService {
  constructor(private prisma: PrismaClient) {}

  async getWilayas(): Promise<WilayaDTO[]> {
    const wilayas = await this.prisma.wilaya.findMany({
      orderBy: { wilayaCode: 'asc' },
    });
    return wilayas.map(GeographyMapper.toWilayaDTO);
  }

  async getCommunes(wilayaId: string): Promise<CommuneDTO[]> {
    const wilaya = await this.prisma.wilaya.findUnique({ where: { id: wilayaId } });
    if (!wilaya) throw new NotFoundError('Wilaya not found');

    const communes = await this.prisma.commune.findMany({
      where: { wilayaId },
      orderBy: { communeCode: 'asc' },
    });
    return communes.map(GeographyMapper.toCommuneDTO);
  }
}
