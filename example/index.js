const express = require('express');
const { makeCacher } = require('../lib');

const app = express();

app.use(express.json());

const settings = { defaultExpiryMs: 30 * 1000 };
const cacher1 = makeCacher({ kind: 'redis-server', options: { url: 'redis://127.0.0.1:6379', database: 1 }, settings });
const cacher2 = makeCacher({ kind: 'node-cache', options: {}, settings });

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

async function main() {

  await cacher1.start();// // this hangs if redis is not running

  app.listen(3000, async () => {
    console.info('Server is running on port 3000');
    //await cacher1.start();
  });
}

main();
