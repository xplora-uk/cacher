import { expect } from 'chai';
import { makeCacher } from '../../cacher';
import { ICacher } from '../../cacher/types';
import { IoRedisServerWithReplicaCacher } from '../../cacher/ioredis-server-with-replica/cacher';
import { waitForMs } from '../../cacher/utils';

describe('cacher with redis server with replica using ioredis lib', () => {
  const oneMinute = 60 * 1000;
  let cacher: ICacher | null = null;

  const items = {
    ioRoKey1: 'value1',
    ioRoKey2: 'value2',
    ioRoKey3: JSON.stringify({ ioRoKey4: 'value4' }),
  };

  before(async () => {
    cacher = makeCacher({
      kind: 'ioredis-server-with-replica',
      options: {
        url: 'redis://127.0.0.1:6379',
        roUrl: 'redis://127.0.0.1:6379',
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

  it('should make a cacher for a redis server with replica', () => {
    expect(cacher !== null).to.equal(true);
    expect(cacher instanceof IoRedisServerWithReplicaCacher).to.equal(true);
  });

  it('should set item 1', async () => {
    if (!cacher) return;

    const result = await cacher.setItem('ioRoKey1', items.ioRoKey1);
    expect(result).to.equal(true);
  });

  it('should set item 2', async () => {
    if (!cacher) return;

    const result = await cacher.setItem('ioRoKey2', items.ioRoKey2);
    expect(result).to.equal(true);
  });

  it('should set item 3', async () => {
    if (!cacher) return;

    const result = await cacher.setItem('ioRoKey3', items.ioRoKey3);
    expect(result).to.equal(true);
  });

  it('should return null on cache miss', async () => {
    if (!cacher) return;

    const result = await cacher.getItem('ioRoKey0');
    expect(result).to.equal(null);
  });

  it('should return value on cache hit', async () => {
    if (!cacher) return;

    const result = await cacher.getItem('ioRoKey1');
    expect(result).to.equal(items.ioRoKey1);
  });

  it('should find keys', async () => {
    if (!cacher) return;

    const result = await cacher.findKeys('ioRoKey');
    expect(result.includes('ioRoKey1')).to.equal(true);
    expect(result.includes('ioRoKey2')).to.equal(true);
    expect(result.includes('ioRoKey3')).to.equal(true);
  });

  it('should return values on cache hit', async () => {
    if (!cacher) return;

    const result = await cacher.getItems(['ioRoKey0', 'ioRoKey1', 'ioRoKey2']);
    expect('ioRoKey0' in result).to.equal(true);
    expect('ioRoKey1' in result).to.equal(true);
    expect('ioRoKey2' in result).to.equal(true);
    expect(result['ioRoKey1']).to.equal(items.ioRoKey1);
    expect(result['ioRoKey2']).to.equal(items.ioRoKey2);
  });

  it('should delete item and return true', async () => {
    if (!cacher) return;

    const result = await cacher.delItem('ioRoKey1');
    expect(result).to.equal(true);
  });

  it('should delete item and return false on cache miss', async () => {
    if (!cacher) return;

    const result = await cacher.delItem('ioRoKey0');
    expect(result).to.equal(false);
  });

  it('should delete items and return true/false accordingly', async () => {
    if (!cacher) return;

    const result = await cacher.delItems(['ioRoKey0', 'ioRoKey1', 'ioRoKey2']);
    expect('ioRoKey0' in result).to.equal(true);
    expect('ioRoKey1' in result).to.equal(true);
    expect('ioRoKey2' in result).to.equal(true);
    expect(result['ioRoKey0']).to.equal(false);
    expect(result['ioRoKey1']).to.equal(false); // deleted above
    expect(result['ioRoKey2']).to.equal(true);
  });
  
});
