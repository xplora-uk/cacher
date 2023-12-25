// JSON definition - START
export type JsonType = string | number | boolean | JsonObject | JsonArray | null;
export interface JsonObject {
  [prop: string]: JsonType;
}
export interface JsonArray extends Array<JsonType> {}
// JSON definition - END

export type Nullable<T> = T | null;

export type NullableString = string | null;

export type NullableBoolean = boolean | null;

export type UnknownErrorType = Error | string | Record<string, unknown> | unknown;

export type CacherErrorHandler = (err: UnknownErrorType) => void;

export type CacherManyItems = Record<string, NullableString>;

export type CacherManyItemsDeleted = Record<string, NullableBoolean>;

export interface ICacher {
  start(): Promise<void>;

  stop(): Promise<void>;

  onError(handler: CacherErrorHandler): void;

  setItem(key: string, value: string, expiryMs?: number): Promise<NullableBoolean>;
  setItemJson(key: string, value: JsonType, expiryMs?: number): Promise<NullableBoolean>;
  setItemJson5(key: string, value: JsonType, expiryMs?: number): Promise<NullableBoolean>;

  getItem(key: string): Promise<NullableString>;
  getItemJson(key: string): Promise<JsonType>;
  getItemJson5(key: string): Promise<JsonType>;

  getItems(keys: string[]): Promise<CacherManyItems>;

  delItem(key: string): Promise<NullableBoolean>;

  delItems(keys: string[]): Promise<CacherManyItemsDeleted>;

  findKeys(prefix: string): Promise<string[]>;
}

export interface ICacherSettings {
  defaultExpiryMs?   : number;
  operationTimeoutMs?: number;
}

export interface ICacherInput {
  kind: string | 'redis-server' | 'redis-server-with-replica' | 'node-cache' | 'ioredis-server' | 'ioredis-server-with-replica' | 'lru-cache';

  options?: {
    // `redis[s]://[[username][:password]@][host][:port][/db-number]`
    url             ?: string;
    database        ?: number;
    connectTimeoutMs?: number;
    reconnectAfterMs?: number;
    
    // read-only replica * * *
    // `redis[s]://[[username][:password]@][host][:port][/db-number]`
    roUrl     ?: string;
    roDatabase?: number;
  };

  settings?: ICacherSettings;
}
