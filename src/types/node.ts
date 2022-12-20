import type { Drawflow } from '../drawflow';
import {
  DrawflowConnectionSlotsMap,
  DrawflowConnectionSlotsMapLive,
  wrapConnectionSlotsMap,
} from './nodeConnectionSlots';

export interface DrawflowNode {
  id: string;
  name: string;
  html: string;
  pos_x: number;
  pos_y: number;
  typenode: boolean | 'vue';
  classname: string;
  preventRemove: boolean;
  data: Record<string, unknown>;
  inputs: DrawflowConnectionSlotsMap<'input'>;
  outputs: DrawflowConnectionSlotsMap<'output'>;
}

export interface DrawflowNodeLive extends Readonly<DrawflowNode> {
  pos_x: number;
  pos_y: number;
  readonly el$: HTMLElement | null;
  /** inputs[0] === inputs['input_1'] */
  readonly inputs: DrawflowConnectionSlotsMapLive<'input'>;
  /** outputs[0] === outputs['output_1'] */
  readonly outputs: DrawflowConnectionSlotsMapLive<'output'>;
}

const nodeCache = new WeakMap<DrawflowNode, HTMLElement>();

const nodeDataCache = new WeakMap<DrawflowNode, DrawflowNodeLive>();

export const wrapNodeData = (
  nodeData: DrawflowNode,
  drawflowInstance: Drawflow
): DrawflowNodeLive => {
  const cached = nodeDataCache.get(nodeData);
  if (cached) return cached;

  const prx = new Proxy(nodeData, {
    get: (
      obj: DrawflowNode,
      prop: keyof DrawflowNodeLive,
      receiver: any
    ): DrawflowNodeLive[typeof prop] | undefined => {
      switch (prop) {
        case 'el$': {
          const _cache = nodeCache.get(obj);
          if (_cache?.parentNode) return _cache;

          const el = drawflowInstance.getElementOfNode(obj.id);

          if (el) nodeCache.set(obj, el);
          return el;
        }

        case 'inputs':
        case 'outputs':
          return wrapConnectionSlotsMap<'input' | 'output'>(
            prop,
            obj[prop],
            drawflowInstance
          );

        default:
          return Reflect.get(obj, prop, receiver);
      }
    },

    set: (
      target: DrawflowNode,
      prop: keyof DrawflowNode,
      newValue: unknown
    ): boolean => {
      switch (prop) {
        case 'pos_x':
          drawflowInstance.updateNodePosition(
            target.id,
            newValue as number,
            target.pos_y,
            drawflowInstance.getModuleFromNodeId(target.id)
          );
          return true;
        case 'pos_y':
          drawflowInstance.updateNodePosition(
            target.id,
            target.pos_x,
            newValue as number,
            drawflowInstance.getModuleFromNodeId(target.id)
          );
          return true;
      }

      return Reflect.set(target, prop, newValue);
    },
  }) as DrawflowNodeLive;

  nodeDataCache.set(nodeData, prx);

  return prx;
};
