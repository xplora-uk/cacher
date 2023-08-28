# cacher

Wrapper for cache clients for more resilient operations.

Currently, it uses [redis](https://www.npmjs.com/package/redis) and [node-cache](https://www.npmjs.com/package/node-cache).

Redis implementation requires a Redis server running in stand-alone mode, not in cluster mode.

It does not fail and it attempts to reconnect every 15 seconds. You can listen to errors by attaching your listener using `onError()`.

So, while your app server is running, Redis may stop and start, you app should not crash because we have an error listener in this library.

Default expiry time is 5 minutes.

Default connection timeout is 3 seconds.

Default waiting time in between reconnection attempts is 15 seconds.

## TODO

* operation timeout will be implemented for Redis.
* memory size limit will be implemented for Node-cache.
* cacher for Redis in cluster mode.
* implement cacher to manage 2 Redis servers: Read/Write and ReadOnly.

## notes

* All cache keys and values are strings. You need to manage JSON in your code.
* Redis would be your central/shared cache for all of your app servers but Node-cache is a local cache for each of your app servers so they are not shared and you would have copies of your cache items.

## requirements

* Node v16.x

## usage

```sh
npm i @xplora-uk/cacher
```

```javascript
const { makeCacher } = require('@xplora-uk/cacher');

const thirtySeconds = 30 * 1000;
const settings = { defaultExpiryMs: thirtySeconds };

const cacher1 = makeCacher({ kind: 'redis-server', options: { url: 'redis://127.0.0.1:6379', database: 1 }, settings });

const cacher2 = makeCacher({ kind: 'node-cache', options: {}, settings });

// check example/index.js for details
```

## interface

```typescript
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

Current coverage:

```plain
----------------------------------|---------|----------|---------|---------|--------------------------------
File                              | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s              
----------------------------------|---------|----------|---------|---------|--------------------------------
All files                         |   76.58 |    61.79 |   76.81 |   78.94 |                                
 cacher                           |    87.5 |    66.66 |     100 |   96.55 |                                
  constants.ts                    |     100 |      100 |     100 |     100 |                                
  factory.ts                      |   85.18 |    66.66 |     100 |   95.83 | 66                             
  index.ts                        |     100 |      100 |     100 |     100 |                                
 cacher/node-cache                |   85.45 |    77.77 |   85.71 |   86.27 |                                
  cacher.ts                       |   84.61 |       75 |      85 |   85.41 | 24-32,42,65-67                 
  types.ts                        |     100 |      100 |     100 |     100 |                                
 cacher/redis-server              |   66.66 |       50 |   67.56 |   68.08 |                                
  cacher.ts                       |   76.25 |    56.25 |   77.41 |   79.16 | 30-42,66,82-87,118-119,126-128 
  timedRedisRunner.ts             |    6.25 |        0 |       0 |    6.25 | 4-27                           
  types.ts                        |     100 |      100 |     100 |     100 |                                
 cacher/redis-server-with-replica |    87.5 |      100 |      90 |    87.5 |                                
  cacher.ts                       |    87.5 |      100 |      90 |    87.5 | 23-24                          
----------------------------------|---------|----------|---------|---------|--------------------------------                             
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
