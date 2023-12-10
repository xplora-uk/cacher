import { CacherErrorHandler, CacherManyItems, CacherManyItemsDeleted, ICacher, ICacherSettings, NullableBoolean, NullableString, UnknownErrorType } from '../types';
import { LRU_CACHE_STATE, LruCache, LruCacheOptions, LruCacheRunner } from './types';
import { makeError } from '../utils';

/**
 * Class to work with a Redis server which is a stand-alone server, not a cluster.
 */
export class LruCacheCacher implements ICacher {

  private _state: LRU_CACHE_STATE = LRU_CACHE_STATE.DISCONNECTED;

  private _client: LruCache;

  private _onError: CacherErrorHandler = (_err: UnknownErrorType) => {};

  constructor(
    private _options: LruCacheOptions,
    private _settings: ICacherSettings,
  ) {
    this._client = new LruCache(this._options);
    this._state = LRU_CACHE_STATE.CONNECTED;
  }

  onError(f: CacherErrorHandler) {
    this._onError = f;
  }

  private _runOnError(err: Error) {
    try {
      this._onError(err);
    } catch (err) {
      // do nothing
      //console.warn('LruCacheCacher: _runOnError error', err);
    }
  }

  async start() {
    if (this._state === LRU_CACHE_STATE.DISCONNECTED) {
      try {
        this._client = new LruCache(this._options);
        this._state = LRU_CACHE_STATE.CONNECTED;
      } catch (err) {
        this._runOnError(makeError(err));
      }
    }
  }
  
  async stop() {
    if (this._state === LRU_CACHE_STATE.CONNECTED) {
      this._state = LRU_CACHE_STATE.DISCONNECTED;
    }
  }

  private async _getClient(): Promise<LruCache | null> {
    await this.start();
    return this._state === LRU_CACHE_STATE.CONNECTED ? this._client : null;
  }

  private async _runClient<T = unknown>(f: LruCacheRunner<T>, returnIfNoClientOrError: T): Promise<T> {
    const client = await this._getClient();
    if (!client) return returnIfNoClientOrError;

    try {
      return f(client);
    } catch (err) {
      this._runOnError(makeError(err));
    }
    return returnIfNoClientOrError;
  }

  async setItem(key: string, value: string, expiryMs: number = 0): Promise<NullableBoolean> {
    const _expiryMs = expiryMs || this._settings.defaultExpiryMs || 0;
    return this._runClient<boolean>(
      async (client: LruCache) => {
        if (0 < _expiryMs) {
          client.set(key, value);
        } else {
          client.set(key, value , { ttl: _expiryMs / 1000 });
        }
        return true;
      },
      false,
    );
  }

  async getItem(key: string): Promise<NullableString> {
    return this._runClient(
      async (client: LruCache) => {
        const val = client.get(key);
        if (!val) return Promise.resolve(null);
        return val;
      },
      null,
    );
  }

  async getItems(keys: string[]): Promise<CacherManyItems> {
    return this._runClient<CacherManyItems>(
      async (client: LruCache) => {
        const result: CacherManyItems = {};
        for (const key of keys) {
          const val = client.get(key);
          result[key] = val === undefined ? null : val;
        }
        return result;
      },
      {},
    );
  }

  async delItem(key: string): Promise<NullableBoolean> {
    return this._runClient(
      async (client: LruCache) => {
        const val = client.delete(key);
        if (!val) return Promise.resolve(false);
        return true;
      },
      false,
    );
  }

  async delItems(keys: string[]): Promise<CacherManyItemsDeleted> {
    const result: CacherManyItemsDeleted = {};
    for (const key of keys) {
      result[key] = await this.delItem(key);
    }
    return result;
  }

  async findKeys(prefix: string): Promise<string[]> {
    return this._runClient(
      async (client: LruCache) => {
        const keys: string[] = [];
        const iter = client.keys();
        let next;
        while (true) {
          next = iter.next();
          if (next.done) break;
          keys.push(next.value);
        }
        const pattern = new RegExp(`^${prefix}`);
        return keys.filter(key => pattern.test(key));
      },
      [],
    );
  }
}
