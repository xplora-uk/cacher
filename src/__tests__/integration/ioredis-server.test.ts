import { expect } from 'chai';
import { makeCacher } from '../../cacher';
import { ICacher } from '../../cacher/types';
import { IoRedisServerCacher } from '../../cacher/ioredis-server/cacher';
import { waitForMs } from '../../cacher/utils';

describe('cacher with redis server using ioredis lib', () => {
  const oneMinute = 60 * 1000;
  let cacher: ICacher | null = null;

  const items = {
    ioKey1: 'value1',
    ioKey2: 'value2',
    ioKey3: JSON.stringify({ ioKey4: 'value4' }),
  };

  before(async () => {
    cacher = makeCacher({
      kind: 'ioredis-server',
      options: {
        url: 'redis://127.0.0.1:6379',
      },
      settings: {
        defaultExpiryMs: oneMinute,
      },
    });
    if (cacher) await cacher.start();
    await waitForMs(1000);
  });

  after(async () => {
    if (cacher) await cacher.stop();
  });

  it('should make a cacher for a redis server', () => {
    expect(cacher !== null).to.equal(true);
    expect(cacher instanceof IoRedisServerCacher).to.equal(true);
  });

  it('should set item 1', async () => {
    if (!cacher) return;

    const result = await cacher.setItem('ioKey1', items.ioKey1);
    expect(result).to.equal(true);
  });

  it('should set item 2', async () => {
    if (!cacher) return;

    const result = await cacher.setItem('ioKey2', items.ioKey2);
    expect(result).to.equal(true);
  });

  it('should set item 3', async () => {
    if (!cacher) return;

    const result = await cacher.setItem('ioKey3', items.ioKey3);
    expect(result).to.equal(true);
  });

  it('should return null on cache miss', async () => {
    if (!cacher) return;

    const result = await cacher.getItem('ioKey0');
    expect(result).to.equal(null);
  });

  it('should return value on cache hit', async () => {
    if (!cacher) return;

    const result = await cacher.getItem('ioKey1');
    expect(result).to.equal(items.ioKey1);
  });

  it('should find keys', async () => {
    if (!cacher) return;

    const result = await cacher.findKeys('ioKey');
    expect(result.includes('ioKey1')).to.equal(true);
    expect(result.includes('ioKey2')).to.equal(true);
    expect(result.includes('ioKey3')).to.equal(true);
  });
  it('should return values on cache hit', async () => {
    if (!cacher) return;

    const result = await cacher.getItems(['ioKey0', 'ioKey1', 'ioKey2']);
    expect('ioKey0' in result).to.equal(true);
    expect('ioKey1' in result).to.equal(true);
    expect('ioKey2' in result).to.equal(true);
    expect(result['ioKey1']).to.equal(items.ioKey1);
    expect(result['ioKey2']).to.equal(items.ioKey2);
  });

  it('should delete item and return true', async () => {
    if (!cacher) return;

    const result = await cacher.delItem('ioKey1');
    expect(result).to.equal(true);
  });

  it('should delete item and return false on cache miss', async () => {
    if (!cacher) return;

    const result = await cacher.delItem('ioKey0');
    expect(result).to.equal(false);
  });

  it('should delete items and return true/false accordingly', async () => {
    if (!cacher) return;

    const result = await cacher.delItems(['ioKey0', 'ioKey1', 'ioKey2']);
    expect('ioKey0' in result).to.equal(true);
    expect('ioKey1' in result).to.equal(true);
    expect('ioKey2' in result).to.equal(true);
    expect(result['ioKey0']).to.equal(false);
    expect(result['ioKey1']).to.equal(false); // deleted above
    expect(result['ioKey2']).to.equal(true);
  });
  
});
