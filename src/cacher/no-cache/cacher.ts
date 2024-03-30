import { CacherErrorHandler, CacherManyItems, CacherManyItemsDeleted, ICacher, JsonType, NullableBoolean, NullableString } from '../types';

/**
 * Class to mimic cacher but does nothing.
 */
export class NoCacheCacher implements ICacher {

  onError(_f: CacherErrorHandler) {
    // do nothing
  }

  async start() {
    // do nothing
  }
  
  async stop() {
    // do nothing
  }

  async setItem(_key: string, _value: string, _expiryMs: number = 0): Promise<NullableBoolean> {
    return false;
  }

  async setItemJson(_key: string, _value: JsonType, _expiryMs?: number | undefined): Promise<NullableBoolean> {
    return false;
  }

  async setItemJson5(_key: string, _value: JsonType, _expiryMs?: number | undefined): Promise<NullableBoolean> {
    return false;
  }

  async getItem(_key: string): Promise<NullableString> {
    return null;
  }

  async getItemJson(_key: string): Promise<JsonType | null> {
    return null;
  }

  async getItemJson5(_key: string): Promise<JsonType | null> {
    return null;
  }

  async getItems(_keys: string[]): Promise<CacherManyItems> {
    return {};
  }

  async delItem(_key: string): Promise<NullableBoolean> {
    return false;
  }

  async delItems(_keys: string[]): Promise<CacherManyItemsDeleted> {
    return {};
  }

  async findKeys(_prefix: string): Promise<string[]> {
    return [];
  }
}
