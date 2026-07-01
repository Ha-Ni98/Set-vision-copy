import type { PrismaClient } from '@prisma/client';
import type { IDeliveryCompanyService } from './delivery-company.interface';
import { DeliveryCompanyMapper } from './delivery-company.mapper';
import { NotFoundError } from '@common/errors';
import type {
  DeliveryCompanyDTO,
  GetDeliveryCompaniesQuery,
  CreateDeliveryCompanyCommand,
  UpdateDeliveryCompanyCommand,
} from '@my-app/contract';

export class DeliveryCompanyService implements IDeliveryCompanyService {
  constructor(private prisma: PrismaClient) {}

  async getAll(query: GetDeliveryCompaniesQuery): Promise<DeliveryCompanyDTO[]> {
    const companies = await this.prisma.deliveryCompany.findMany({
      ...(query.active !== undefined && { where: { isActive: query.active } }),
      orderBy: { name: 'asc' },
    });
    return companies.map(DeliveryCompanyMapper.toDTO);
  }

  async create(cmd: CreateDeliveryCompanyCommand): Promise<DeliveryCompanyDTO> {
    const company = await this.prisma.deliveryCompany.create({
      data: {
        name: cmd.name.trim(),
        registeredName: cmd.registeredName.trim(),
        isActive: true,
      },
    });
    return DeliveryCompanyMapper.toDTO(company);
  }

  async update(id: string, cmd: UpdateDeliveryCompanyCommand): Promise<DeliveryCompanyDTO> {
    const existing = await this.prisma.deliveryCompany.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Delivery company not found');

    const company = await this.prisma.deliveryCompany.update({
      where: { id },
      data: DeliveryCompanyMapper.toPersistence(cmd),
    });
    return DeliveryCompanyMapper.toDTO(company);
  }

  async toggle(id: string): Promise<DeliveryCompanyDTO> {
    const existing = await this.prisma.deliveryCompany.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Delivery company not found');

    const company = await this.prisma.deliveryCompany.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });
    return DeliveryCompanyMapper.toDTO(company);
  }
}
