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

  getItem(key: string): Promise<NullableString>;

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
  kind    : string | 'redis-server' | 'redis-server-with-replica' | 'node-cache';

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
