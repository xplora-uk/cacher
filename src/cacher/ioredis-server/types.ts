import IoRedis, { RedisOptions } from 'ioredis';

export type IoRedisClientType = IoRedis;
export type IoRedisClientOptions = RedisOptions;

// "wait" | "reconnecting" | "connecting" | "connect" | "ready" | "close" | "end"

export enum IO_REDIS_STATE {
  WAITING = 'wait',
  DISCONNECTING = 'close',
  DISCONNECTED = 'end',
  RECONNECTING = 'reconnecting',
  CONNECTING = 'connecting',
  CONNECTED = 'connect',
  READY = 'ready',
}

export type IoRedisClientRunner<T = unknown> = (client: IoRedisClientType) => Promise<T>;
