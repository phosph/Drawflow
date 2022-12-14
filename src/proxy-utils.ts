import type { Drawflow } from './drawflow';
import type { DrawflowNode, DrawflowNodeLive } from './types';

const nodeCache = new WeakMap<DrawflowNode, HTMLElement>();

const nodeDataCache = new WeakMap<DrawflowNode, DrawflowNodeLive>();

export const wrapNodeData = (
  nodeData: DrawflowNode,
  drawflowInstance: Drawflow
): DrawflowNodeLive => {
  const cached = nodeDataCache.get(nodeData);
  if (cached) return cached;

  const prx = new Proxy(nodeData, {
    has(target: DrawflowNode, prop: string | symbol): boolean {
      if (prop === 'el$') return true;

      return prop in target;
    },

    get: (
      obj: DrawflowNode,
      prop: keyof DrawflowNodeLive
    ): DrawflowNodeLive[typeof prop] | undefined => {
      if (prop === 'el$') {
        const _cache = nodeCache.get(obj);
        if (_cache?.parentNode) return _cache;

        const el = drawflowInstance.getElementOfNode(obj.id);

        if (el) nodeCache.set(obj, el);
        return el;
      }

      if (prop === 'inputs' || prop === 'outputs') {
        return wrapNodeConnection(prop, obj[prop]);
      }

      return prop in obj ? obj[prop as keyof typeof obj] : undefined;
    },

    set: (
      target: DrawflowNode,
      prop: keyof DrawflowNode,
      newValue: any
    ): boolean => {
      if (prop === 'pos_x') {
        drawflowInstance.updateNodePosition(
          target.id,
          newValue as number,
          target.pos_y,
          drawflowInstance.getModuleFromNodeId(target.id)
        );
        return true;
      } else if (prop === 'pos_y') {
        drawflowInstance.updateNodePosition(
          target.id,
          target.pos_x,
          newValue as number,
          drawflowInstance.getModuleFromNodeId(target.id)
        );
        return true;
      }

      return false;
    },

    deleteProperty: () => false,
  }) as DrawflowNodeLive;

  nodeDataCache.set(nodeData, prx);

  return prx;
};

const nodeConnectionCache = new WeakMap<
  DrawflowNode['inputs' | 'outputs'],
  DrawflowNodeLive['inputs' | 'outputs']
>();

const wrapNodeConnection = <T extends 'inputs' | 'outputs'>(
  type: T,
  nodeData: DrawflowNode[T]
): DrawflowNodeLive[T] => {
  const cached = nodeConnectionCache.get(nodeData);
  if (cached) return cached as DrawflowNodeLive[T];

  const prx = new Proxy(nodeData, {
    get(
      target: DrawflowNode[T],
      prop: string | symbol,
      receiver: any
    ): DrawflowNodeLive[T][keyof DrawflowNodeLive[T]] | undefined {
      if (prop === Symbol.iterator) {
        const val = Object.values(target);
        return val[Symbol.iterator].bind(
          val
        ) as DrawflowNodeLive[T][typeof Symbol.iterator];
      }

      if (prop in target) {
        const value = Reflect.get(target, prop, receiver);
        return value ? structuredClone(value) : value;
      }

      if (typeof prop === 'string' && !Number.isNaN(prop)) {
        const parsedKey = `${type.replace(/[s]$/, '')}_${+prop + 1}` as const;

        const value = target[parsedKey as keyof typeof target];

        return value ? structuredClone(value) : value;
      }

      return undefined;
    },
    set: () => false,
    deleteProperty: () => false,
  }) as DrawflowNodeLive[T];

  nodeConnectionCache.set(nodeData, prx);
  return prx;
};
