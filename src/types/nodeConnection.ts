import type { Drawflow } from '../drawflow';
import type { DrawflowNode, DrawflowNodeLive } from './node';

export type DrawflowConnection<T extends 'input' | 'output'> = {
  node: DrawflowNode['id'];
  points?: { pos_x: number; pos_y: number }[];
  pathClass?: string;
  input?: T extends 'input' ? `output_${number}` : never;
  output?: T extends 'output' ? `input_${number}` : never;
};

export type DrawflowConnectionLive<T extends 'input' | 'output'> =
  DrawflowConnection<T> & {
    readonly node$: DrawflowNodeLive;
  };

const connectionCache = new WeakMap();

export const wrapConnection = <T extends 'input' | 'output'>(
  connection: DrawflowConnection<T>,
  drawflowInstance: Drawflow
): DrawflowConnectionLive<T> => {
  const cached = connectionCache.get(connection);
  if (cached) return cached;

  const prx = new Proxy(connection, {
    get(
      target: DrawflowConnection<T>,
      prop: keyof DrawflowConnectionLive<T>,
      receiver: any
    ): DrawflowConnectionLive<T>[typeof prop] | undefined {
      switch (prop) {
        case 'node$':
          return drawflowInstance.getNodeFromId(target.node);
        default:
          return Reflect.get(target, prop, receiver);
      }
    },
    set(
      target: DrawflowConnection<T>,
      prop: keyof DrawflowConnectionLive<T>,
      newValue: unknown
    ): boolean {
      if (prop === 'node$') return false;

      return Reflect.set(target, prop, newValue);
    },
  }) as DrawflowConnectionLive<T>;

  connectionCache.set(connection, prx);

  return prx;
};
