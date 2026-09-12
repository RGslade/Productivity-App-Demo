import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStaticCached, invalidateStaticCache } from '@/services/staticCache';

describe('staticCache', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('reuses a fresh cached value without refetching', async () => {
    const fetcher = jest.fn().mockResolvedValue(['first']);

    await expect(getStaticCached('documents', fetcher)).resolves.toEqual(['first']);
    await expect(getStaticCached('documents', fetcher)).resolves.toEqual(['first']);

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('returns stale data immediately and refreshes it in the background', async () => {
    const fetcher = jest.fn().mockResolvedValue(['fresh']);
    const now = Date.now();

    await getStaticCached('categories', jest.fn().mockResolvedValue(['stale']));
    const dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(now + 24 * 60 * 60 * 1000 + 1);

    await expect(getStaticCached('categories', fetcher)).resolves.toEqual(['stale']);
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(fetcher).toHaveBeenCalledTimes(1);

    dateNowSpy.mockRestore();
  });

  it('invalidates a cache entry', async () => {
    const fetcher = jest.fn().mockResolvedValue(['value']);

    await getStaticCached('documents', fetcher);
    await invalidateStaticCache('documents');
    await getStaticCached('documents', fetcher);

    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});


