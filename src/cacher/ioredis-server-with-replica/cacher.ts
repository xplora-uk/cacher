import { IoRedisServerCacher } from '../ioredis-server/cacher';
import { IoRedisClientOptions } from '../ioredis-server/types';
import { CacherErrorHandler, CacherManyItems, CacherManyItemsDeleted, ICacher, ICacherSettings, NullableBoolean, NullableString } from '../types';

/**
 * Class to work with a Redis server which is a stand-alone server and a another as read-only replica.
 */
export class IoRedisServerWithReplicaCacher implements ICacher {

  private _rwRedis: IoRedisServerCacher;
  private _roRedis: IoRedisServerCacher;

  constructor(
    _rwOptions: IoRedisClientOptions,
    _roOptions: IoRedisClientOptions,
    _settings: ICacherSettings,
  ) {
    this._rwRedis = new IoRedisServerCacher(_rwOptions, _settings);
    this._roRedis = new IoRedisServerCacher(_roOptions, _settings);
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
