import { expect } from 'chai';
import { makeCacher } from '../../cacher';
import { ICacher } from '../../cacher/types';
import { RedisServerWithReplicaCacher } from '../../cacher/redis-server-with-replica/cacher';
import { waitForMs } from '../../cacher/utils';

describe('cacher with redis server with replica', () => {
  const oneMinute = 60 * 1000;
  let cacher: ICacher | null = null;
  const penv = process.env;

  const items = {
    roKey1: 'value1',
    roKey2: 'value2',
    roKey3: JSON.stringify({ roKey4: 'value4' }),
  };

  before(async () => {
    cacher = makeCacher({
      kind: 'redis-server-with-replica',
      options: {
        url:   penv.REDIS_RW_URL || 'redis://127.0.0.1:6379',
        roUrl: penv.REDIS_RO_URL || 'redis://127.0.0.1:6379',
      },
      settings: {
        defaultExpiryMs: oneMinute,
      },
    });
    if (cacher) await cacher.start();
    await waitForMs(2000);
  });

  after(async () => {
    if (cacher) await cacher.stop();
  });

  it('should make a cacher for a redis server with replica', () => {
    expect(cacher !== null).to.equal(true);
    expect(cacher instanceof RedisServerWithReplicaCacher).to.equal(true);
  });

  it('should set item 1', async () => {
    if (!cacher) return;

    const result = await cacher.setItem('roKey1', items.roKey1);
    expect(result).to.equal(true);
  });

  it('should set item 2', async () => {
    if (!cacher) return;

    const result = await cacher.setItem('roKey2', items.roKey2);
    expect(result).to.equal(true);
  });

  it('should set item 3', async () => {
    if (!cacher) return;

    const result = await cacher.setItem('roKey3', items.roKey3);
    expect(result).to.equal(true);
  });

  it('should return null on cache miss', async () => {
    if (!cacher) return;

    const result = await cacher.getItem('roKey0');
    expect(result).to.equal(null);
  });

  it('should return value on cache hit', async () => {
    if (!cacher) return;

    const result = await cacher.getItem('roKey1');
    expect(result).to.equal(items.roKey1);
  });

  it('should find keys', async () => {
    if (!cacher) return;

    const result = await cacher.findKeys('roKey');
    expect(result.includes('roKey1')).to.equal(true);
    expect(result.includes('roKey2')).to.equal(true);
    expect(result.includes('roKey3')).to.equal(true);
  });

  it('should return values on cache hit', async () => {
    if (!cacher) return;

    const result = await cacher.getItems(['roKey0', 'roKey1', 'roKey2']);
    expect('roKey0' in result).to.equal(true);
    expect('roKey1' in result).to.equal(true);
    expect('roKey2' in result).to.equal(true);
    expect(result['roKey0']).to.equal(null);
    expect(result['roKey1']).to.equal(items.roKey1);
    expect(result['roKey2']).to.equal(items.roKey2);
  });

  it('should delete item and return true', async () => {
    if (!cacher) return;

    const result = await cacher.delItem('roKey1');
    expect(result).to.equal(true);
  });

  it('should delete item and return false on cache miss', async () => {
    if (!cacher) return;

    const result = await cacher.delItem('roKey0');
    expect(result).to.equal(false);
  });

  it('should delete items and return true/false accordingly', async () => {
    if (!cacher) return;

    const result = await cacher.delItems(['roKey0', 'roKey1', 'roKey2']);
    expect('roKey0' in result).to.equal(true);
    expect('roKey1' in result).to.equal(true);
    expect('roKey2' in result).to.equal(true);
    expect(result['roKey0']).to.equal(false);
    expect(result['roKey1']).to.equal(false); // deleted above
    expect(result['roKey2']).to.equal(true);
  });
  
});
