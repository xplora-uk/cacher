import { createClient } from 'redis';

export type RedisClientType = ReturnType<typeof createClient>;
export type RedisClientOptions = Parameters<typeof createClient>[0];

export enum REDIS_STATE {
  DISCONNECTING = -1,
  DISCONNECTED = 0,
  CONNECTING = 1,
  CONNECTED = 2,
  READY = 3,
}

export type RedisClientRunner<T = unknown> = (client: RedisClientType) => Promise<T>;
