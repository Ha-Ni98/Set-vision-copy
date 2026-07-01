import type {
  DeliveryCompanyDTO,
  GetDeliveryCompaniesQuery,
  CreateDeliveryCompanyCommand,
  UpdateDeliveryCompanyCommand,
} from '@my-app/contract';

export interface IDeliveryCompanyService {
  getAll(query: GetDeliveryCompaniesQuery): Promise<DeliveryCompanyDTO[]>;
  create(cmd: CreateDeliveryCompanyCommand): Promise<DeliveryCompanyDTO>;
  update(id: string, cmd: UpdateDeliveryCompanyCommand): Promise<DeliveryCompanyDTO>;
  toggle(id: string): Promise<DeliveryCompanyDTO>;
}
