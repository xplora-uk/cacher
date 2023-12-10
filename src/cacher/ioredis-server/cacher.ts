import IoRedis from 'ioredis';
import { CacherErrorHandler, CacherManyItems, CacherManyItemsDeleted, ICacher, ICacherSettings, NullableBoolean, NullableString, UnknownErrorType } from '../types';
import { IO_REDIS_STATE, IoRedisClientOptions, IoRedisClientRunner, IoRedisClientType } from './types';
import { timedIoRedisRunner } from './timedIoRedisRunner';
import { makeError } from '../utils';

/**
 * Class to work with a Redis server which is a stand-alone server, not a cluster.
 */
export class IoRedisServerCacher implements ICacher {

  private get _state() { return this._client.status; }

  private _client: IoRedisClientType;

  private _onError: CacherErrorHandler = (_err: UnknownErrorType) => {};

  constructor(
    private _options: IoRedisClientOptions,
    private _settings: ICacherSettings,
  ) {
    this._client = new IoRedis(this._options);

    this._client.on('error',        this._runOnError.bind(this));
    this._client.on('connect',      this._runOnConnect.bind(this));
    this._client.on('reconnecting', this._runOnReconnecting.bind(this));
    this._client.on('ready',        this._runOnReady.bind(this));
    this._client.on('end',          this._runOnEnd.bind(this)); // disconnect
  }

  onError(f: CacherErrorHandler) {
    this._onError = f;
  }

  private _runOnError(err: Error) {
    // console.warn('IoRedisServerCacher: error', err);
    try {
      // are we disconnected?
      if (err) {
        // TODO: handle error type
        //if (err instanceof ConnectionTimeoutError) {
        //  this._state = IO_REDIS_STATE.DISCONNECTED;
        //}
      }
      this._onError(err);
    } catch (err) {
      // do nothing
      // console.warn('IoRedisServerCacher: _runOnError error', err);
    }
  }

  private _runOnConnect() {
    // console.debug('IoRedisServerCacher: connect');
    //this._state = IO_REDIS_STATE.CONNECTED;
  }

  private _runOnReady() {
    // console.debug('IoRedisServerCacher: ready');
    //this._state = IO_REDIS_STATE.READY;
  }

  private _runOnEnd() {
    // console.debug('IoRedisServerCacher: end');
    //this._state = IO_REDIS_STATE.DISCONNECTED;
  }

  private _runOnReconnecting() {
    // console.debug('IoRedisServerCacher: reconnecting');
    //this._state = IO_REDIS_STATE.CONNECTING;
  }

  async start() {
    // console.debug('IoRedisServerCacher: start');
    if (this._state === IO_REDIS_STATE.DISCONNECTED) {
      //this._state = IO_REDIS_STATE.CONNECTING;

      this._client.connect()
        .then(() => {
          // console.info('IoRedisServerCacher: connected');
        })
        .catch((err: Error) => {
          this._runOnError(err);
        });
    }
  }
  
  async stop() {
    // console.debug('IoRedisServerCacher: stop');
    //if (this._state === REDIS_STATE.READY) { // TODO: do we need this check?
      try {
        await this._client.disconnect();
      } catch (err) {
        // do nothing
        // console.warn('IoRedisServerCacher: stop error', err);
      }
    //}
  }

  protected async _getClient(): Promise<IoRedisClientType | null> {
    await this.start();
    return this._state === IO_REDIS_STATE.READY ? this._client : null;
  }

  // use client if it is ready, with timeout logic on operations 
  private async _runClient<T = unknown>(useClient: IoRedisClientRunner<T>, returnIfNoClientOrError: T): Promise<T> {
    const client = await this._getClient();
    if (!client) return returnIfNoClientOrError;

    try {
      const timeout = this._settings?.operationTimeoutMs || 0;
      if (timeout > 0) {
        // await => we want to catch errors here 
        const result1 = await timedIoRedisRunner(useClient, client, timeout);
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
      async (client: IoRedisClientType) => {
        const res = await client.set(key, value, 'PX', _expiryMs);
        return res === 'OK';
      },
      false,
    );
  }

  async getItem(key: string): Promise<NullableString> {
    return this._runClient(
      async (client: IoRedisClientType) => {
        const val = await client.get(key);
        if (!val) return Promise.resolve(null);
        return val;
      },
      null,
    );
  }

  async getItems(keys: string[]): Promise<CacherManyItems> {
    return this._runClient<CacherManyItems>(
      async (client: IoRedisClientType) => {
        const values = await client.mget(keys);
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
      async (client: IoRedisClientType) => {
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
      async (client: IoRedisClientType) => {
        const keys = await client.keys(`${keyPrefix}*`);
        return keys || [];
      },
      [],
    );
  }
}
