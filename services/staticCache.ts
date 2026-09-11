import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_VERSION = 1;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_PREFIX = '@productivityapp/static-cache/v1/';

interface CacheEnvelope<T> {
  version: number;
  cachedAt: number;
  value: T;
}

async function read<T>(key: string): Promise<CacheEnvelope<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;
    const envelope = JSON.parse(raw) as CacheEnvelope<T>;
    if (envelope.version !== CACHE_VERSION || !Number.isFinite(envelope.cachedAt)) return null;
    return envelope;
  } catch (error) {
    console.warn('staticCache.read failed', { key, message: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

async function write<T>(key: string, value: T): Promise<void> {
  try {
    const envelope: CacheEnvelope<T> = { version: CACHE_VERSION, cachedAt: Date.now(), value };
    await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(envelope));
  } catch (error) {
    console.warn('staticCache.write failed', { key, message: error instanceof Error ? error.message : String(error) });
  }
}

/** Returns cached non-sensitive data and refreshes stale entries in the background. */
export async function getStaticCached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const cached = await read<T>(key);
  if (cached) {
    if (Date.now() - cached.cachedAt >= CACHE_TTL_MS) {
      void fetcher().then((value) => write(key, value)).catch((error) => {
        console.warn('staticCache.refresh failed', { key, message: error instanceof Error ? error.message : String(error) });
      });
    }
    return cached.value;
  }

  const value = await fetcher();
  await write(key, value);
  return value;
}

/** Removes one cache entry after a relevant mutation. */
export async function invalidateStaticCache(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`);
  } catch (error) {
    console.warn('staticCache.invalidate failed', { key, message: error instanceof Error ? error.message : String(error) });
  }
}
