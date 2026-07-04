import { withRetry } from '../../src/http-client/retry';

describe('withRetry', () => {
  it('returns the result on first success without retrying', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, { attempts: 3, backoffMs: 1 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries a network-level error until it succeeds', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValueOnce('recovered');
    const result = await withRetry(fn, { attempts: 3, backoffMs: 1 });
    expect(result).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws after exhausting all attempts', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('down'));
    await expect(withRetry(fn, { attempts: 3, backoffMs: 1 })).rejects.toThrow('down');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('does not retry a 4xx-style error (non-retryable)', async () => {
    const err = { response: { status: 404 } };
    const fn = jest.fn().mockRejectedValue(err);
    await expect(withRetry(fn, { attempts: 3, backoffMs: 1 })).rejects.toBe(err);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries a 5xx-style error', async () => {
    const err = { response: { status: 503 } };
    const fn = jest.fn().mockRejectedValueOnce(err).mockResolvedValueOnce('ok');
    const result = await withRetry(fn, { attempts: 3, backoffMs: 1 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
