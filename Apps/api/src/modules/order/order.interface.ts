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
  create(cmd: CreateOrderCommand): Promise<OrderDTO>;
  transition(id: string, cmd: TransitionOrderCommand): Promise<OrderDTO>;
  delete(id: string): Promise<void>;
}
