import { createClient, ConnectionTimeoutError } from 'redis';
import { CacherErrorHandler, CacherManyItems, CacherManyItemsDeleted, ICacher, ICacherSettings, NullableBoolean, NullableString, UnknownErrorType } from '../types';
import { REDIS_STATE, RedisClientOptions, RedisClientRunner, RedisClientType } from './types';
import { timedRedisRunner } from './timedRedisRunner';

/**
 * Class to work with a Redis server which is a stand-alone server, not a cluster.
 */
export class RedisServerCacher implements ICacher {

  private _state: REDIS_STATE = REDIS_STATE.DISCONNECTED;

  private _client: RedisClientType;

  private _onError: CacherErrorHandler = (_err: UnknownErrorType) => {};

  constructor(
    private _options: RedisClientOptions,
    private _settings: ICacherSettings,
  ) {
    this._client = createClient(this._options);
    this._client.on('error', (err: Error) => this._runOnError(err));
    this._client.on('connect', () => this._runOnConnect());
    this._client.on('reconnecting', () => this._runOnReconnecting());
    this._client.on('ready', () => this._runOnReady());
    this._client.on('end', () => this._runOnEnd()); // disconnect
  }

  onError(f: CacherErrorHandler) {
    this._onError = f;
  }

  private _runOnError(err: Error) {
    // console.warn('RedisServerCacher: error', err);
    try {
      // are we disconnected?
      if (err) {
        if (err instanceof ConnectionTimeoutError) {
          this._state = REDIS_STATE.DISCONNECTED;
        }
      }
      this._onError(err);
    } catch (err) {
      // do nothing
      // console.warn('RedisServerCacher: _runOnError error', err);
    }
  }

  private _runOnConnect() {
    // console.debug('RedisServerCacher: connect');
    this._state = REDIS_STATE.CONNECTED;
  }

  private _runOnReady() {
    // console.debug('RedisServerCacher: ready');
    this._state = REDIS_STATE.READY;
  }

  private _runOnEnd() {
    // console.debug('RedisServerCacher: end');
    this._state = REDIS_STATE.DISCONNECTED;
  }

  private _runOnReconnecting() {
    // console.debug('RedisServerCacher: reconnecting');
    this._state = REDIS_STATE.CONNECTING;
  }

  async start() {
    // console.debug('RedisServerCacher: start');
    if (this._state === REDIS_STATE.DISCONNECTED) {
      try {
        this._state = REDIS_STATE.CONNECTING;
        
        // await this._client.connect(); // <== this will hang due to reconnection attempts, if redis is not running

        this._client.connect()
          .then(() => {
            // console.info('RedisServerCacher: connected');
          })
          .catch((err: Error) => {
            this._state = REDIS_STATE.DISCONNECTED;
            this._runOnError(err);
          });
      } catch (err) {
        this._state = REDIS_STATE.DISCONNECTED;
        this._runOnError(err instanceof Error ? err : new Error('Failed to connect to redis'));
      }
    }
  }
  
  async stop() {
    // console.debug('RedisServerCacher: stop');
    //if (this._state === REDIS_STATE.READY) { // TODO: do we need this check?
      try {
        await this._client.disconnect();
      } catch (err) {
        // do nothing
        // console.warn('RedisServerCacher: stop error', err);
      }
    //}
  }

  protected async _getClient(): Promise<RedisClientType | null> {
    await this.start();
    return this._state === REDIS_STATE.READY ? this._client : null;
  }

  // use client if it is ready, with timeout logic on operations 
  private async _runClient<T = unknown>(useClient: RedisClientRunner<T>, returnIfNoClientOrError: T): Promise<T> {
    const client = await this._getClient();
    if (!client) return returnIfNoClientOrError;

    try {
      const timeout = this._settings?.operationTimeoutMs || 0;
      if (timeout > 0) {
        // await => we want to catch errors here 
        const result1 = await timedRedisRunner(useClient, client, timeout);
        return result1;
      } else {
        // await => we want to catch errors here 
        const result2 = await useClient(client);
        return result2;
      }
    } catch (err: unknown) {
      this._runOnError(err instanceof Error ? err : new Error('Unknown error'));
    }
    return returnIfNoClientOrError;
  }

  async setItem(key: string, value: string, expiryMs: number = 0): Promise<NullableBoolean> {
    const _expiryMs = expiryMs || this._settings.defaultExpiryMs || 0;
    return this._runClient<boolean>(
      async (client: RedisClientType) => {
        const res = await client.SET(key, value, { PX: _expiryMs });
        return res === 'OK';
      },
      false,
    );
  }

  async getItem(key: string): Promise<NullableString> {
    return this._runClient(
      async (client: RedisClientType) => {
        const val = await client.GET(key);
        if (!val) return Promise.resolve(null);
        return val;
      },
      null,
    );
  }

  async getItems(keys: string[]): Promise<CacherManyItems> {
    return this._runClient<CacherManyItems>(
      async (client: RedisClientType) => {
        const values = await client.MGET(keys);
        if (!values) return {};
        const obj: CacherManyItems = {};
        values.forEach((val, i) => {
          obj[keys[i]] = val !== undefined && val !== null ? val : null;
        })
        return obj;
      },
      {},
    );
  }

  async delItem(key: string): Promise<NullableBoolean> {
    return this._runClient(
      async (client: RedisClientType) => {
        const val = await client.DEL(key);
        return Boolean(val);
      },
      false,
    );
  }

  async delItems(keys: string[]): Promise<CacherManyItemsDeleted> {
    // we cannot use this:
    // const count = await client.DEL(keys); // result is a number
    
    const result: CacherManyItemsDeleted = {};
    for (const key of keys) {
      result[key] = await this.delItem(key);
    }
    return result;
  }

  async findKeys(prefix: string): Promise<string[]> {
    return this._runClient(
      async (client: RedisClientType) => {
        const keys = await client.KEYS(prefix + '*');
        return keys || [];
      },
      [],
    );
  }
}
