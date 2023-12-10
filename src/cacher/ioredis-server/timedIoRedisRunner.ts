import { IoRedisClientRunner, IoRedisClientType } from './types';

export async function timedIoRedisRunner<T>(useClient: IoRedisClientRunner<T>, client: IoRedisClientType, timeoutMs: number) {
  return new Promise<T>((resolve, reject) => {
    // start timeout
    let done = false;
    const timerId = setTimeout(() => {
      // this may execute first
      if (!done) {
        done = true;
        reject(new Error('IoRedisServerCacher: operation timeout'));
      }
    }, timeoutMs);

    useClient(client)
      .then((value) => {
        if (!done) {
          done = true;
          clearTimeout(timerId);
          resolve(value);
        }
      })
      .catch((error) => {
        if (!done) {
          done = true;
          clearTimeout(timerId);
          reject(error);
        }
      });
  });
}