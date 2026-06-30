import type { Response } from 'express';
import type { ApiResponse } from '@my-app/contract';

export const sendSuccess = <T>(res: Response, data: T, status = 200): void => {
  const body: ApiResponse<T> = { success: true, data };
  res.status(status).json(body);
};
