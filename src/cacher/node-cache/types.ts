import NodeCache, { Options } from 'node-cache';

export enum NODE_CACHE_STATE {
  DISCONNECTED = 0,
  CONNECTED = 1,
}

export type NodeCacheOptions = Options; // alias

export type NodeCacheRunner<T = unknown> = (client: NodeCache) => Promise<T>;
