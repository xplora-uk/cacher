const express = require('express');
const { makeCacher } = require('../lib');

const app = express();

app.use(express.json());

const settings = { defaultExpiryMs: 30 * 1000 };
const redisUrl = 'redis://127.0.0.1:6379';
const cacher1 = makeCacher({ kind: 'redis-server', options: { url: redisUrl, database: 1 }, settings });
const cacher2 = makeCacher({ kind: 'node-cache', options: {}, settings });
const cacher3 = makeCacher({ kind: 'redis-server-with-replica', options: { url: redisUrl, database: 1, roUrl: redisUrl, roDatabase: 1 }, settings });

const useCacher = (app, cacher, prefix) => {
  async function setter(req, res) {
    const { key } = req.params;
    const data = await cacher.setItem(key, JSON.stringify(req.body));
    res.json({ data });
  }

  async function getter(req, res) {
    const { key } = req.params;
    const result = await cacher.getItem(key);
    res.json({ data: JSON.parse(result) });
  }

  async function getterMulti(req, res) {
    const { keys = [] } = req.query;
    const result = await cacher.getItems(keys);
    res.json({ data: result });
  }

  async function deleter(req, res) {
    const { key } = req.params;
    const data = await cacher.delItem(key);
    res.json({ data });
  }

  async function deleterMulti(req, res) {
    const { keys = [] } = req.query;
    const data = await cacher.delItems(keys);
    res.json({ data });
  }

  app.post(prefix + '/:key', setter);
  app.get(prefix + '/:key', getter);
  app.get(prefix + '/', getterMulti);
  app.delete(prefix + '/:key', deleter);
  app.delete(prefix + '/', deleterMulti);
}

useCacher(app, cacher1, '/redis-server');
useCacher(app, cacher2, '/node-cache');
useCacher(app, cacher3, '/redis-server-with-replica');

async function main() {

  // this would normally hang until we connect to Redis
  await cacher1.start();

  app.listen(3000, async () => {
    console.info('Server is running on port 3000');
  });
}

main();
