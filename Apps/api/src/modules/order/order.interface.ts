import type {
  OrderDTO,
  OrderDetailDTO,
  CreateOrderCommand,
  TransitionOrderCommand,
  GetOrdersQuery,
  PaginatedResult,
} from '@my-app/contract';

export interface IOrderService {
  getAll(query: GetOrdersQuery): Promise<PaginatedResult<OrderDTO>>;
  getById(id: string): Promise<OrderDetailDTO>;
  create(cmd: CreateOrderCommand, actorId: string): Promise<OrderDTO>;
  transition(id: string, cmd: TransitionOrderCommand, actorId: string): Promise<OrderDTO>;
  delete(id: string, actorId: string): Promise<void>;
}
