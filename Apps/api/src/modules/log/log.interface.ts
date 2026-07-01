import type { LogDTO, GetLogsQuery, PaginatedResult } from '@my-app/contract';

export interface ILogService {
  getAll(query: GetLogsQuery): Promise<PaginatedResult<LogDTO>>;
}
