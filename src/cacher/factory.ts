import { CONNECTION_TIMEOUT_MS, DEFAULT_EXPIRY_MS, OPERATION_TIMEOUT_MS, WAIT_BEFORE_RECONNECT_MS } from './constants';
import { NodeCacheCacher } from './node-cache/cacher';
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
    connectTimeoutMs: CONNECTION_TIMEOUT_MS,
    reconnectAfterMs: WAIT_BEFORE_RECONNECT_MS,
  };

  const { kind, options = defaultOptions, settings = defaultSettings } = input;

  let connectTimeout = options.connectTimeoutMs || CONNECTION_TIMEOUT_MS;
  if (connectTimeout <= 1000) connectTimeout = 1000;

  let reconnectStrategy = options.reconnectAfterMs || WAIT_BEFORE_RECONNECT_MS;
  if (reconnectStrategy <= 1000) reconnectStrategy = 1000;

  switch (kind) {
    case 'redis-server':
      return new RedisServerCacher({
        url   : options.url || defaultUrl,
        socket: { connectTimeout, reconnectStrategy },
      }, settings);

    case 'node-cache':
      let stdTTL = Math.round(settings.defaultExpiryMs || DEFAULT_EXPIRY_MS) / 1000; // in seconds
      if (stdTTL <= 0) stdTTL = DEFAULT_EXPIRY_MS / 1000;
      return new NodeCacheCacher({ stdTTL }, settings);

    default:
      // do nothing
  }

  return null;
}
