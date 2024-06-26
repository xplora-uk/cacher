# cacher

Wrapper for cache clients for more resilient operations.

It uses:

* [ioredis](https://www.npmjs.com/package/ioredis)
* [lru-cache](https://www.npmjs.com/package/lru-cache)
* [node-cache](https://www.npmjs.com/package/node-cache)
* [redis](https://www.npmjs.com/package/redis)

Redis implementation requires a Redis server running in stand-alone mode, not in cluster mode.

It does not fail and it attempts to reconnect every 15 seconds. You can listen to errors by attaching your listener using `onError()`.

So, while your app server is running, Redis may stop and start, you app should not crash because we have an error listener in this library.

Default expiry time is 5 minutes.

Default connection timeout is 3 seconds.

Default waiting time in between reconnection attempts is 15 seconds.

Implemented cacher to manage 2 Redis servers: Read/Write and ReadOnly.

Implemented ioredis, added 2 kinds: `ioredis-server` and `ioredis-server-with-replica`.

Implemented lru-cache, added kind `lru-cache`. Max item count: 1m; max size of items: 64MB.

## TODO

* operation timeout will be implemented for Redis.
* memory size limit will be implemented for Node-cache.
* cacher for Redis in cluster mode.

## notes

* All cache keys and values are strings. You need to manage JSON in your code.
* Redis would be your central/shared cache for all of your app servers but Node-cache is a local cache for each of your app servers so they are not shared and you would have copies of your cache items.

## requirements

* Node v18.16.0+ for version 2.x
* Node v16.19.1+ for version 1.x

## usage

```sh
npm i @xplora-uk/cacher
```

```javascript
const { makeCacher } = require('@xplora-uk/cacher');

const thirtySeconds = 30 * 1000;
const settings = { defaultExpiryMs: thirtySeconds };

const redisUrl = 'redis://127.0.0.1:6379';

const cacher1 = makeCacher({ kind: 'node-cache', options: {}, settings });

const cacher2 = makeCacher({ kind: 'redis-server', options: { url: redisUrl, database: 1 }, settings });
const cacher2b = makeCacher({ kind: 'redis-server-with-replica', options: { url: redisUrl, roUrl: redisUrl, database: 1 }, settings });

const cacher3 = makeCacher({ kind: 'ioredis-server', options: { url: redisUrl, database: 1 }, settings });
const cacher3b = makeCacher({ kind: 'ioredis-server-with-replica', options: { url: redisUrl, roUrl: redisUrl, database: 1 }, settings });

// check example/index.js for details
```

## interface

```typescript
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
```

## maintenance

### installation

```sh
npm i
```

### code

```plain
src/
  __tests__/
    component/
      TODO
    integration/
      node-cache.test.ts    Tests for node-cache
      redis-server.test.ts  Tests for redis-server
    unit/
      TODO
  cacher/
    node-cache/
      cacher.ts    Cacher implementation for Node-cache
      types.ts     TypeScript types for Node-cache cacher
    redis-server/
      cacher.ts            Cacher implementation for Redis (stand-alone) server, not cluster.
      timedRedisRunner.ts  Timer for promises handling Redis operations
      types.ts             TypeScript types for Redis server cacher
    factory.ts     factory pattern to make a cacher instance based on input
    index.ts       exports factory
    types.ts       TypeScript types for cacher
  index.ts    main file that exports features of this library

example/  express app using redis and node-cache
  example.postman_collection.json   postman collection
  index.js                          application code
```

### build

```sh
npm run build
```

### integration tests

Run redis server.

```sh
brew services start redis
npm run test:integration
npm run test:coverage
```

### publish

It is important to increment version number using semantic versioning in `package.json` and re-create `package-lock.json`

```sh
# https://docs.npmjs.com/cli/v9/commands/npm-login
# using a member in xplora-uk
npm login

# https://docs.npmjs.com/cli/v9/commands/npm-publish
npm publish --access public
```
