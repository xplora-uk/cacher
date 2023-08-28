import { CONNECTION_TIMEOUT_MS, DEFAULT_EXPIRY_MS, OPERATION_TIMEOUT_MS, WAIT_BEFORE_RECONNECT_MS } from './constants';
import { NodeCacheCacher } from './node-cache/cacher';
import { RedisServerWithReplicaCacher } from './redis-server-with-replica/cacher';
import { RedisServerCacher } from './redis-server/cacher';
import { ICacher, ICacherInput } from './types';

export function makeCacher(input: ICacherInput): ICacher | null {
  const defaultSettings = {
    defaultExpiryMs   : DEFAULT_EXPIRY_MS,
    operationTimeoutMs: 0, // OPERATION_TIMEOUT_MS, // TODO: implement this later
  };

  const defaultUrl = 'redis://127.0.0.1:6379';

  const defaultOptions = {
    url             : defaultUrl,
    database        : 0,
    connectTimeoutMs: CONNECTION_TIMEOUT_MS,
    reconnectAfterMs: WAIT_BEFORE_RECONNECT_MS,
    // read-only replica * * *
    roUrl           : defaultUrl,
    roDatabase      : 0,
  };

  const { kind, options = defaultOptions, settings = defaultSettings } = input;

  let connectTimeout = options.connectTimeoutMs || CONNECTION_TIMEOUT_MS;
  if (connectTimeout <= 1000) connectTimeout = 1000;

  let reconnectStrategy = options.reconnectAfterMs || WAIT_BEFORE_RECONNECT_MS;
  if (reconnectStrategy <= 1000) reconnectStrategy = 1000;

  const socketOptions = { connectTimeout, reconnectStrategy };

  switch (kind) {
    case 'redis-server':
      const redisOptions = {
        url     : options.url || defaultUrl,
        database: options.database || 0,
        socket  : socketOptions,
      };
      return new RedisServerCacher(redisOptions, settings);

    case 'redis-server-with-replica':
      const rwOptions = {
        url     : options.url || defaultUrl,
        database: options.database || 0,
        socket  : socketOptions,
      };
      const roOptions = {
        url     : options.roUrl || defaultUrl,
        database: options.roDatabase || 0,
        socket  : socketOptions,
      };
      return new RedisServerWithReplicaCacher(rwOptions, roOptions, settings);

    case 'node-cache':
      let stdTTL = Math.round(settings.defaultExpiryMs || DEFAULT_EXPIRY_MS) / 1000; // in seconds
      if (stdTTL <= 0) stdTTL = DEFAULT_EXPIRY_MS / 1000;
      return new NodeCacheCacher({ stdTTL }, settings);

    default:
      // do nothing
  }

  return null;
}
