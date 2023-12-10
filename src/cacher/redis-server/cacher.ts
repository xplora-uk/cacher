import { createClient, ConnectionTimeoutError } from 'redis';
import { CacherErrorHandler, CacherManyItems, CacherManyItemsDeleted, ICacher, ICacherSettings, NullableBoolean, NullableString, UnknownErrorType } from '../types';
import { REDIS_STATE, RedisClientOptions, RedisClientRunner, RedisClientType } from './types';
import { timedRedisRunner } from './timedRedisRunner';
import { isNotNil, makeError } from '../utils';

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

    this._client.on('error',        this._runOnError);
    this._client.on('connect',      this._runOnConnect);
    this._client.on('reconnecting', this._runOnReconnecting);
    this._client.on('ready',        this._runOnReady);
    this._client.on('end',          this._runOnEnd); // disconnect
  }

  onError(f: CacherErrorHandler) {
    this._onError = f;
  }

  private _runOnError = (err: Error) => {
    //console.warn('RedisServerCacher: _runOnError error', err);
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
      //console.warn('RedisServerCacher: _runOnError _onError error', err);
    }
  }

  private _runOnConnect = () => {
    // console.debug('RedisServerCacher: connect');
    this._state = REDIS_STATE.CONNECTED;
  }

  private _runOnReady = () => {
    // console.debug('RedisServerCacher: ready');
    this._state = REDIS_STATE.READY;
  }

  private _runOnEnd = () => {
    // console.debug('RedisServerCacher: end');
    this._state = REDIS_STATE.DISCONNECTED;
  }

  private _runOnReconnecting = () => {
    // console.debug('RedisServerCacher: reconnecting');
    this._state = REDIS_STATE.CONNECTING;
  }

  async start() {
    // console.debug('RedisServerCacher: start');
    if (this._state === REDIS_STATE.DISCONNECTED) {

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
    }
  }
  
  async stop() {
    // console.debug('RedisServerCacher: stop');
    try {
      await this._client.disconnect();
    } catch (err) {
      // do nothing
      //console.warn('RedisServerCacher: stop error', err);
    }
  }

  get isReady(): boolean {
    return this._client.isReady;
  }

  protected async _getClient(): Promise<RedisClientType | null> {
    await this.start();
    return this.isReady ? this._client : null;
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
      this._runOnError(makeError(err));
    }
    return returnIfNoClientOrError;
  }

  async setItem(key: string, value: string, expiryMs: number = 0): Promise<NullableBoolean> {
    const _expiryMs = expiryMs || this._settings.defaultExpiryMs || 0;
    return this._runClient<boolean>(
      async (client: RedisClientType) => {
        if (0 < _expiryMs) {
          const res = await client.set(key, value, { PX: _expiryMs });
          return res === 'OK';
        } else {
          const res2 = await client.set(key, value);
          return res2 === 'OK';
        }
      },
      false,
    );
  }

  async getItem(key: string): Promise<NullableString> {
    return this._runClient(
      async (client: RedisClientType) => {
        const val = await client.get(key);
        if (!val) return Promise.resolve(null);
        return val;
      },
      null,
    );
  }

  async getItems(keys: string[]): Promise<CacherManyItems> {
    return this._runClient<CacherManyItems>(
      async (client: RedisClientType) => {
        const values = await client.mGet(keys);
        if (!values) return {};
        const obj: CacherManyItems = {};
        values.forEach((val, i) => {
          obj[keys[i]] = isNotNil<string>(val) ? val : null;
        })
        return obj;
      },
      {},
    );
  }

  async delItem(key: string): Promise<NullableBoolean> {
    return this._runClient(
      async (client: RedisClientType) => {
        const val = await client.del(key);
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

  async findKeys(keyPrefix: string): Promise<string[]> {
    return this._runClient(
      async (client: RedisClientType) => {
        const keys = await client.keys(`${keyPrefix}*`);
        return keys || [];
      },
      [],
    );
  }
}
