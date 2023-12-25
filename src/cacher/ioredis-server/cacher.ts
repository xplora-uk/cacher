import IoRedis from 'ioredis';
import { CacherErrorHandler, CacherManyItems, CacherManyItemsDeleted, ICacher, ICacherSettings, JsonType, NullableBoolean, NullableString, UnknownErrorType } from '../types';
import { IO_REDIS_STATE, IoRedisClientOptions, IoRedisClientRunner, IoRedisClientType } from './types';
import { json5Parse, json5Stringify, jsonParse, jsonStringify, makeError } from '../utils';

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

  private _runOnConnect = () => {
    // console.debug('IoRedisServerCacher: connect');
    //this._state = IO_REDIS_STATE.CONNECTED;
  }

  private _runOnReady = () => {
    // console.debug('IoRedisServerCacher: ready');
  }

  private _runOnEnd = () => {
    // console.debug('IoRedisServerCacher: end');
  }

  private _runOnReconnecting = () => {
    // console.debug('IoRedisServerCacher: reconnecting');
  }

  get isReady(): boolean {
    return this._state === IO_REDIS_STATE.READY;
  }

  get isDisconnected(): boolean {
    return this._state === IO_REDIS_STATE.DISCONNECTED;
  }

  async start() {
    // console.debug('IoRedisServerCacher: start');
    this._client.connect()
      .then(() => {
        // console.info('IoRedisServerCacher: connected');
      }).catch(err => {
        this._runOnError(makeError(err));
      });
  }

  async stop() {
    // console.debug('IoRedisServerCacher: stop');
    try {
      await this._client.disconnect();
    } catch (err) {
      // do nothing
      // console.warn('IoRedisServerCacher: stop error', err);
    }
  }

  protected async _getClient(): Promise<IoRedisClientType | null> {
    await this.start();
    return this.isReady ? this._client : null;
  }

  // use client if it is ready, with timeout logic on operations 
  private async _runClient<T = unknown>(useClient: IoRedisClientRunner<T>, returnIfNoClientOrError: T): Promise<T> {
    const client = await this._getClient();
    if (!client) return returnIfNoClientOrError;

    try {
      const result2 = await useClient(client);
      return result2;
    } catch (err: unknown) {
      this._runOnError(makeError(err));
    }
    return returnIfNoClientOrError;
  }

  async setItem(key: string, value: string, expiryMs: number = 0): Promise<NullableBoolean> {
    const _expiryMs = expiryMs || this._settings.defaultExpiryMs || 0;
    return this._runClient<boolean>(
      async (client: IoRedisClientType) => {
        if (0 < _expiryMs) {
          const res = await client.set(key, value, 'PX', _expiryMs);
          return res === 'OK';
        } else {
          const res2 = await client.set(key, value);
          return res2 === 'OK';
        }
      },
      false,
    );
  }
  
  async setItemJson(key: string, value: JsonType, expiryMs?: number | undefined): Promise<NullableBoolean> {
    const str = jsonStringify(value);
    return this.setItem(key, str || '{}', expiryMs);
  }

  async setItemJson5(key: string, value: JsonType, expiryMs?: number | undefined): Promise<NullableBoolean> {
    const str = json5Stringify(value);
    return this.setItem(key, str || '{}', expiryMs);
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

  async getItemJson(key: string): Promise<JsonType | null> {
    const str = await this.getItem(key);
    return str ? jsonParse<JsonType>(str) : null;
  }

  async getItemJson5(key: string): Promise<JsonType | null> {
    const str = await this.getItem(key);
    return str ? json5Parse<JsonType>(str) : null;
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
