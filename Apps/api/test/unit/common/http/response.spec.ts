import { describe, it, expect, vi } from 'vitest';
import { sendSuccess } from '@common/http/response';

const makeMockRes = () => {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  return { status, json, _json: json };
};

describe('sendSuccess', () => {
  it('defaults to status 200 and wraps data in the ApiResponse envelope', () => {
    const res = makeMockRes();
    sendSuccess(res as never, { hi: 1 });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res._json).toHaveBeenCalledWith({ success: true, data: { hi: 1 } });
  });

  it('uses the provided status code', () => {
    const res = makeMockRes();
    sendSuccess(res as never, { created: true }, 201);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res._json).toHaveBeenCalledWith({ success: true, data: { created: true } });
  });
});
