import type {
  SubscriptionPlanDTO,
  CommissionDurationDTO,
  CommissionMatrixDTO,
  CommissionCellDTO,
  GetSubscriptionPlansQuery,
  CreateSubscriptionPlanCommand,
  UpdateCommissionCommand,
} from '@my-app/contract';

export interface ISubscriptionPlanService {
  getAll(query: GetSubscriptionPlansQuery): Promise<SubscriptionPlanDTO[]>;
  create(cmd: CreateSubscriptionPlanCommand): Promise<SubscriptionPlanDTO>;
  toggle(id: string): Promise<SubscriptionPlanDTO>;
  getCommissionDurations(): Promise<CommissionDurationDTO[]>;
  getCommissions(): Promise<CommissionMatrixDTO>;
  updateCommission(cmd: UpdateCommissionCommand, actorId: string): Promise<CommissionCellDTO>;
}
