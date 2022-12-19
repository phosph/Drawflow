import type { Drawflow } from 'src/drawflow';
import {
  DrawflowConnection,
  DrawflowConnectionLive,
  wrapConnection,
} from './nodeConnection';

export type DrawflowConnectionSlotsMap<T extends 'input' | 'output'> = Record<
  `${T}_${number}`,
  DrawflowConnection<T>[]
>;

export type DrawflowConnectionSlotsMapLive<T extends 'input' | 'output'> =
  Record<`${T}_${number}`, DrawflowConnectionLive<T>[]> & {
    readonly [index: number]: DrawflowConnectionLive<T>[];
    [Symbol.iterator](): IterableIterator<DrawflowConnectionLive<T>>[];
    outputsCount: number;
    entries(): IterableIterator<
      [name: `${T}_${number}`, value: DrawflowConnectionLive<T>[]]
    >;
  };

const nodeConnectionCache = new WeakMap();

export const wrapConnectionSlotsMap = <T extends 'input' | 'output'>(
  type: T extends 'input' ? 'inputs' : 'outputs',
  nodeData: DrawflowConnectionSlotsMap<T>,
  drawflowInstance: Drawflow
): DrawflowConnectionSlotsMapLive<T> => {
  const cached = nodeConnectionCache.get(nodeData);
  if (cached) return cached;

  const prx = new Proxy(nodeData, {
    get(
      target: DrawflowConnectionSlotsMap<T>,
      prop: string | symbol,
      receiver: any
    ) {
      switch (prop) {
        case Symbol.iterator: {
          const val = Object.values<DrawflowConnection<T>[]>(target);

          return function* () {
            for (const slot of val) {
              yield wrapConnectionList<T>(slot, drawflowInstance);
            }
          };
        }
        case 'entries':
          return function* () {
            const entries = Object.entries(target) as [
              name: `${T}_${number}`,
              value: DrawflowConnection<T>[]
            ][];

            for (const [name, slot] of entries) {
              yield [name, wrapConnectionList<T>(slot, drawflowInstance)];
            }
          };
        case `${type}Count`:
          return Object.keys(target).length;
      }

      if (typeof prop === 'string' && !Number.isNaN(+prop)) {
        const parsedKey = `${type.replace(/[s]$/, '') as T}_${
          +prop + 1
        }` as const;

        const value = Reflect.get(
          target,
          parsedKey,
          receiver
        ) as DrawflowConnection<T>[];
        if (value) return wrapConnectionList<T>(value, drawflowInstance);

        return value;
      }

      const value = Reflect.get(target, prop, receiver);

      if (
        value &&
        typeof prop === 'string' &&
        /^(input|output)_([0-9]+)$/.test(prop)
      ) {
        return wrapConnectionList<T>(
          value as DrawflowConnection<T>[],
          drawflowInstance
        );
      }

      return value;
    },
  }) as DrawflowConnectionSlotsMapLive<T>;

  nodeConnectionCache.set(nodeData, prx);
  return prx;
};

export const wrapConnectionList = <T extends 'input' | 'output'>(
  list: DrawflowConnection<T>[],
  drawflowInstance: Drawflow
): DrawflowConnectionLive<T>[] => {
  const cached = nodeConnectionCache.get(list);
  if (cached) return cached;

  const prx = new Proxy(list, {
    get(target: DrawflowConnection<T>[], prop: string | symbol, receiver: any) {
      if (prop === Symbol.iterator) {
        const val = Array.from(target) as DrawflowConnection<T>[];
        return function* () {
          for (const slot of val) {
            yield wrapConnection<T>(slot, drawflowInstance);
          }
        };
      }

      const value = Reflect.get(target, prop, receiver);

      if (value && typeof prop === 'string' && !Number.isNaN(+prop)) {
        return wrapConnection<T>(value, drawflowInstance);
      }

      return value;
    },
  }) as DrawflowConnectionLive<T>[];

  nodeConnectionCache.set(list, prx);
  return prx;
};
