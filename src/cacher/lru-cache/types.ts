import { LRUCache } from 'lru-cache';

export enum LRU_CACHE_STATE {
  DISCONNECTED = 0,
  CONNECTED = 1,
}

export class LruCache extends LRUCache<string, string> {}

export type LruCacheOptions = LRUCache.Options<string, string, unknown>; // ConstructorParameters<typeof LruCache>[0];

export type LruCacheRunner<T = unknown> = (client: LruCache) => Promise<T>;
