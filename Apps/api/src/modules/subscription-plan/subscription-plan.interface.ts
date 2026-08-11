import type {
  SubscriptionPlanDTO,
  CommissionDurationDTO,
  CommissionMatrixDTO,
  CommissionCellDTO,
  SubscriptionPlanCostDTO,
  GetSubscriptionPlansQuery,
  CreateSubscriptionPlanCommand,
  UpdateCommissionCommand,
  UpdateSubscriptionPlanCostCommand,
} from '@my-app/contract';

export interface ISubscriptionPlanService {
  getAll(query: GetSubscriptionPlansQuery): Promise<SubscriptionPlanDTO[]>;
  create(cmd: CreateSubscriptionPlanCommand): Promise<SubscriptionPlanDTO>;
  toggle(id: string): Promise<SubscriptionPlanDTO>;
  getCommissionDurations(): Promise<CommissionDurationDTO[]>;
  getCommissions(): Promise<CommissionMatrixDTO>;
  updateCommission(cmd: UpdateCommissionCommand, actorId: string): Promise<CommissionCellDTO>;
  getCosts(): Promise<SubscriptionPlanCostDTO[]>;
  updateCost(cmd: UpdateSubscriptionPlanCostCommand, actorId: string): Promise<SubscriptionPlanCostDTO>;
}
