export function waitForMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}

export function makeError(err: unknown): Error {
  if (err instanceof Error) return err;
  if (typeof err === 'string') return new Error(err);
  return new Error('Unknown error');
}

export function isNotNil<T = string>(val: T | null | undefined): val is T {
  return (val !== null) && (val !== undefined);
}
