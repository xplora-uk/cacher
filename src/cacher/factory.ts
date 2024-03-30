import { CONNECTION_TIMEOUT_MS, DEFAULT_EXPIRY_MS, MAX_ITEM_COUNT, MAX_ITEM_SIZE_BYTES, OPERATION_TIMEOUT_MS, WAIT_BEFORE_RECONNECT_MS } from './constants';
import { IoRedisServerWithReplicaCacher } from './ioredis-server-with-replica/cacher';
import { IoRedisServerCacher } from './ioredis-server/cacher';
import { IoRedisClientOptions } from './ioredis-server/types';
import { LruCacheCacher } from './lru-cache/cacher';
import { NoCacheCacher } from './no-cache/cacher';
import { NodeCacheCacher } from './node-cache/cacher';
import { RedisServerWithReplicaCacher } from './redis-server-with-replica/cacher';
import { RedisServerCacher } from './redis-server/cacher';
import { ICacher, ICacherInput } from './types';

export function makeCacher(input: ICacherInput): ICacher {
  const defaultSettings = {
    defaultExpiryMs   : DEFAULT_EXPIRY_MS,
    operationTimeoutMs: OPERATION_TIMEOUT_MS,
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

  const redisUrl = new URL(options.url || defaultUrl);
  const redisUrlReplica = new URL(options.roUrl || defaultUrl);

  function makeRedisOptions(readOnly = false) {
    return {
      url     : (readOnly ? options.roUrl : options.url) || defaultUrl,
      database: (readOnly ? options.roDatabase : options.database) || 0,
      socket  : { connectTimeout, reconnectStrategy },
    };
  }

  function makeIoRedisOptions(url: URL, db = 0): IoRedisClientOptions {
    return {
      host                : url.hostname,
      //host                : url.host,
      port                : Number(url.port || '6379'),
      username            : url.username || '',
      password            : url.password || '',
      db,
      connectTimeout      : options.connectTimeoutMs,
      commandTimeout      : settings.operationTimeoutMs,
      maxRetriesPerRequest: 1,
      retryStrategy       : (_times: number) => {
        return options.reconnectAfterMs;
      },
    }
  }

  switch (kind) {
    case 'redis-server':
      const redisOptions = makeRedisOptions();
      return new RedisServerCacher(redisOptions, settings);

    case 'redis-server-with-replica':
      const rwOptions = makeRedisOptions();
      const roOptions = makeRedisOptions(true);
      return new RedisServerWithReplicaCacher(rwOptions, roOptions, settings);

    case 'ioredis-server':
      const ioRedisOptions = makeIoRedisOptions(redisUrl, options.database || 0);
      return new IoRedisServerCacher(ioRedisOptions, settings);

    case 'ioredis-server-with-replica':
      const ioRwOptions = makeIoRedisOptions(redisUrl, options.database || 0);
      const ioRoOptions = makeIoRedisOptions(redisUrlReplica, options.roDatabase || 0);
      return new IoRedisServerWithReplicaCacher(ioRwOptions, ioRoOptions, settings);

    case 'node-cache':
      let stdTTL = Math.round(settings.defaultExpiryMs || DEFAULT_EXPIRY_MS) / 1000; // in seconds
      if (stdTTL <= 0) stdTTL = DEFAULT_EXPIRY_MS / 1000;
      return new NodeCacheCacher({ stdTTL }, settings);

    case 'lru-cache':
      let ttl = Math.round(settings.defaultExpiryMs || DEFAULT_EXPIRY_MS) / 1000; // in seconds
      if (ttl <= 0) ttl = DEFAULT_EXPIRY_MS / 1000;
      const lruOptions = {
        ttl,
        max       : MAX_ITEM_COUNT,
        maxSize   : MAX_ITEM_SIZE_BYTES,
        allowStale: false,
        sizeCalculation: (value: string, key: string) => {
          // rough estimation
          return Buffer.from(value, 'utf8').length + Buffer.from(key, 'utf8').length;
        },
      };
      return new LruCacheCacher(lruOptions, settings);

    default:
      // do nothing
  }

  return new NoCacheCacher();
}
