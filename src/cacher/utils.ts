import JSON5 from 'json5';
import { JsonType } from './types';

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

export function jsonParse<T extends JsonType = JsonType>(str: string, onErrorReturn: T | null = null): T | null {
  try {
    return JSON.parse(str) as T; // pretending
  } catch (err) {
    return onErrorReturn;
  }
}

export function jsonStringify<T = JsonType>(val: T, onErrorReturn: string | null = ''): string | null {
  try {
    return JSON.stringify(val);
  } catch (err) {
    return onErrorReturn;
  }
}

export function json5Parse<T extends JsonType = JsonType>(str: string, onErrorReturn: T | null = null): T | null {
  try {
    return JSON5.parse(str) as T; // pretending
  } catch (err) {
    return onErrorReturn;
  }
}

export function json5Stringify<T = JsonType>(val: T, onErrorReturn: string | null = ''): string | null {
  try {
    return JSON5.stringify(val);
  } catch (err) {
    return onErrorReturn;
  }
}
