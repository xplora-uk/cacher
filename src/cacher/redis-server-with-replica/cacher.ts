import { RedisServerCacher } from '../redis-server/cacher';
import { RedisClientOptions } from '../redis-server/types';
import { CacherErrorHandler, CacherManyItems, CacherManyItemsDeleted, ICacher, ICacherSettings, NullableBoolean, NullableString, UnknownErrorType } from '../types';

/**
 * Class to work with a Redis server which is a stand-alone server and a another as read-only replica.
 */
export class RedisServerWithReplicaCacher implements ICacher {

  private _rwRedis: RedisServerCacher;
  private _roRedis: RedisServerCacher;

  constructor(
    _rwOptions: RedisClientOptions,
    _roOptions: RedisClientOptions,
    _settings: ICacherSettings,
  ) {
    this._rwRedis = new RedisServerCacher(_rwOptions, _settings);
    this._roRedis = new RedisServerCacher(_roOptions, _settings);
  }

  onError(f: CacherErrorHandler) {
    this._rwRedis.onError(f);
    this._roRedis.onError(f);
  }

  async start() {
    await this._rwRedis.start();
    await this._roRedis.start();
  }
  
  async stop() {
    await this._rwRedis.stop();
    await this._roRedis.stop();
  }

  async setItem(key: string, value: string, expiryMs: number = 0): Promise<NullableBoolean> {
    return this._rwRedis.setItem(key, value, expiryMs);
  }

  async getItem(key: string): Promise<NullableString> {
    return this._roRedis.getItem(key);
  }

  async getItems(keys: string[]): Promise<CacherManyItems> {
    return this._roRedis.getItems(keys);
  }

  async delItem(key: string): Promise<NullableBoolean> {
    return this._rwRedis.delItem(key);
  }

  async delItems(keys: string[]): Promise<CacherManyItemsDeleted> {
    return this._rwRedis.delItems(keys);
  }

  async findKeys(prefix: string): Promise<string[]> {
    return this._roRedis.findKeys(prefix);
  }
}
