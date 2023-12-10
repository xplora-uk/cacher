import NodeCache from 'node-cache';
import { CacherErrorHandler, CacherManyItems, CacherManyItemsDeleted, ICacher, ICacherSettings, NullableBoolean, NullableString, UnknownErrorType } from '../types';
import { NODE_CACHE_STATE, NodeCacheOptions, NodeCacheRunner } from './types';
import { makeError } from '../utils';

/**
 * Class to work with a Redis server which is a stand-alone server, not a cluster.
 */
export class NodeCacheCacher implements ICacher {

  private _state: NODE_CACHE_STATE = NODE_CACHE_STATE.DISCONNECTED;

  private _client: NodeCache;

  private _onError: CacherErrorHandler = (_err: UnknownErrorType) => {};

  constructor(
    private _options: NodeCacheOptions,
    private _settings: ICacherSettings,
  ) {
    this._client = new NodeCache(this._options);
    this._state = NODE_CACHE_STATE.CONNECTED;
  }

  onError(f: CacherErrorHandler) {
    this._onError = f;
  }

  private _runOnError(err: Error) {
    try {
      this._onError(err);
    } catch (err) {
      // do nothing
      //console.warn('NodeCacheCacher: _runOnError error', err);
    }
  }

  async start() {
    if (this._state === NODE_CACHE_STATE.DISCONNECTED) {
      try {
        this._client = new NodeCache(this._options);
        this._state = NODE_CACHE_STATE.CONNECTED;
      } catch (err) {
        this._runOnError(makeError(err));
      }
    }
  }
  
  async stop() {
    if (this._state === NODE_CACHE_STATE.CONNECTED) {
      this._state = NODE_CACHE_STATE.DISCONNECTED;
    }
  }

  private async _getClient(): Promise<NodeCache | null> {
    await this.start();
    return this._state === NODE_CACHE_STATE.CONNECTED ? this._client : null;
  }

  private async _runClient<T = unknown>(f: NodeCacheRunner<T>, returnIfNoClientOrError: T): Promise<T> {
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
      async (client: NodeCache) => {
        return client.set(key, value, _expiryMs / 1000);
      },
      false,
    );
  }

  async getItem(key: string): Promise<NullableString> {
    return this._runClient(
      async (client: NodeCache) => {
        const val = client.get<string>(key);
        if (!val) return Promise.resolve(null);
        return val;
      },
      null,
    );
  }

  async getItems(keys: string[]): Promise<CacherManyItems> {
    return this._runClient<CacherManyItems>(
      async (client: NodeCache) => {
        const result: CacherManyItems = client.mget(keys);
        if (!result) return {};
        const keysFound = Object.keys(result);
        for (const key of keys) {
          if (!keysFound.includes(key)) {
            result[key] = null;
          }
        }
        return result;
      },
      {},
    );
  }

  async delItem(key: string): Promise<NullableBoolean> {
    return this._runClient(
      async (client: NodeCache) => {
        const val = client.del(key);
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
      async (client: NodeCache) => {
        const keys = client.keys();
        const pattern = new RegExp(`^${prefix}`);
        return keys.filter(key => pattern.test(key));
      },
      [],
    );
  }
}
