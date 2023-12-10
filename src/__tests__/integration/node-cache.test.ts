import { expect } from 'chai';
import { makeCacher } from '../../cacher';
import { ICacher } from '../../cacher/types';
import { NodeCacheCacher } from '../../cacher/node-cache/cacher';

describe('cacher with node-cache', () => {
  const oneMinute = 60 * 1000;
  let cacher: ICacher | null = null;

  const items = {
    key1: 'value1',
    key2: 'value2',
    key3: JSON.stringify({ key4: 'value4' }),
  };

  before(async () => {
    cacher = makeCacher({
      kind: 'node-cache',
      options: {},
      settings: {
        defaultExpiryMs: oneMinute,
      },
    });
    if (cacher) await cacher.start();
  });

  after(async () => {
    if (cacher) await cacher.stop();
  });

  it('should make a cacher for a node-cache', () => {
    expect(cacher !== null).to.equal(true);
    expect(cacher instanceof NodeCacheCacher).to.equal(true);
  });

  it('should set item 1', async () => {
    if (!cacher) return;

    const result = await cacher.setItem('key1', items.key1);
    expect(result).to.equal(true);
  });

  it('should set item 2', async () => {
    if (!cacher) return;

    const result = await cacher.setItem('key2', items.key2);
    expect(result).to.equal(true);
  });

  it('should set item 3', async () => {
    if (!cacher) return;

    const result = await cacher.setItem('key3', items.key3);
    expect(result).to.equal(true);
  });

  it('should return null on cache miss', async () => {
    if (!cacher) return;

    const result = await cacher.getItem('key0');
    expect(result).to.equal(null);
  });

  it('should return value on cache hit', async () => {
    if (!cacher) return;

    const result = await cacher.getItem('key1');
    expect(result).to.equal(items.key1);
  });

  it('should find keys', async () => {
    if (!cacher) return;

    const result = await cacher.findKeys('key');
    expect(result).to.deep.equal(['key1', 'key2', 'key3']);
  });

  it('should return values on cache hit', async () => {
    if (!cacher) return;

    const result = await cacher.getItems(['key0', 'key1', 'key2']);
    expect('key0' in result).to.equal(true);
    expect('key1' in result).to.equal(true);
    expect('key2' in result).to.equal(true);
    expect(result['key0']).to.equal(null);
    expect(result['key1']).to.equal(items.key1);
    expect(result['key2']).to.equal(items.key2);
  });

  it('should delete item and return true', async () => {
    if (!cacher) return;

    const result = await cacher.delItem('key1');
    expect(result).to.equal(true);
  });

  it('should delete item and return false on cache miss', async () => {
    if (!cacher) return;

    const result = await cacher.delItem('key0');
    expect(result).to.equal(false);
  });

  it('should delete items and return true', async () => {
    if (!cacher) return;

    const result = await cacher.delItems(['key0', 'key1', 'key2']);
    expect('key0' in result).to.equal(true);
    expect('key1' in result).to.equal(true);
    expect('key2' in result).to.equal(true);
    expect(result['key0']).to.equal(false);
    expect(result['key1']).to.equal(false); // deleted above
    expect(result['key2']).to.equal(true);
  });
  
})
