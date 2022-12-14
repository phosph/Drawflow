/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ConnectionEvent {
  /**
   * outputNodeId
   */
  sourceNodeId: string;

  /**
   * inputNodeId
   */
  targetNodeId: string;

  /**
   * name of the output
   */
  sourceSlot: string;

  /**
   * name of the input
   */
  targetSlot: string;
}

export interface ConnectionStartEvent {
  /**
   * outputNodeId
   */
  output_id: string;

  /**
   * name of the output
   */
  output_class: string;
}

export interface MousePositionEvent {
  x: number;
  y: number;
}

export interface DrawflowExport {
  Home: DrawflowModuleData; // always present
  [moduleName: string]: DrawflowModuleData;
}

export interface DrawflowModuleData {
  data: {
    [nodeKey: DrawflowNode['id']]: DrawflowNode;
  };
}

export interface DrawflowNode {
  classname: string;
  data: Record<string, unknown>;
  html: string;
  id: string;
  inputs: Record<`input_${number}`, DrawflowConnection<'input'>>;
  name: string;
  outputs: Record<`output_${number}`, DrawflowConnection<'output'>>;
  pos_x: number;
  pos_y: number;
  typenode: boolean | 'vue';
  preventRemove: boolean;
}

export interface DrawflowNodeLive extends Readonly<DrawflowNode> {
  pos_x: number;
  pos_y: number;
  el$: HTMLElement | null;

  /** inputs[0] === inputs['input_1'] */
  inputs: Readonly<
    Record<`input_${number}`, DrawflowConnection<'input'>> & {
      [key: number]: DrawflowConnection<'input'> | undefined;
      [Symbol.iterator](): IterableIterator<DrawflowConnection<'input'>>
    }
  >;

  /** outputs[0] === outputs['output_1'] */
  outputs: Readonly<
    Record<`output_${number}`, DrawflowConnection<'output'>> & {
      [key: number]: DrawflowConnection<'output'> | undefined;
      [Symbol.iterator](): IterableIterator<DrawflowConnection<'output'>>
    }
  >;
}

export interface DrawflowConnection<T extends 'input' | 'output'> {
  connections: DrawflowConnectionDetail<T>[];
}

export type DrawflowConnectionDetail<T extends 'input' | 'output'> = {
  node: DrawflowNode['id'];
  points?: { pos_x: number; pos_y: number }[];
  pathClass?: string;
} & (T extends 'input'
  ? { input: `output_${number}` }
  : { output: `input_${number}` });

export type DrawFlowEditorMode = 'edit' | 'fixed' | 'view';

export interface Vue {
  version: string;
  h(...args: any): any;
  new (...args: any[]): any;
  render(...args: any[]): any;
}

export interface DrawflowEventsMap {
  nodeCreated: CustomEvent<{ nodeId: DrawflowNode['id'] }>;
  nodeRemove: CustomEvent<{ nodeId: DrawflowNode['id'] }>;
  nodeRemoved: CustomEvent<{
    nodeId: DrawflowNode['id'];
    nodeData: Readonly<DrawflowNode>;
  }>;
  nodeSelected: CustomEvent<{ nodeId: DrawflowNode['id'] }>;
  nodeUnselected: CustomEvent<{ nodeId: DrawflowNode['id'] }>;
  nodeMoved: CustomEvent<{ nodeId: DrawflowNode['id'] }>;
  nodeDataChanged: CustomEvent<{ nodeId: DrawflowNode['id'] }>;
  connectionStart: CustomEvent<ConnectionStartEvent>;
  connectionCancel: CustomEvent<unknown>;
  connectionCreated: CustomEvent<ConnectionEvent>;
  connectionRemoved: CustomEvent<ConnectionEvent>;
  connectionSelected: CustomEvent<ConnectionEvent>;
  connectionUnselected: CustomEvent<{ event: boolean }>;
  addReroute: CustomEvent<{ nodeId: DrawflowNode['id'] }>;
  removeReroute: CustomEvent<{ nodeId: DrawflowNode['id'] }>;
  moduleCreated: CustomEvent<{ moduleName: string }>;
  moduleChanged: CustomEvent<{ moduleName: string }>;
  moduleRemoved: CustomEvent<{ moduleName: string }>;
  click: CustomEvent<{
    event: MouseEvent;
    originalTarget: EventTarget | null;
    nodeId: DrawflowNode['id'] | null;
    isRemoveAtempt: boolean;
    eventDesc: {
      altKey: MouseEvent['altKey'];
      ctrlKey: MouseEvent['ctrlKey'];
      metaKey: MouseEvent['metaKey'];
      shiftKey: MouseEvent['shiftKey'];
    };
  }>;
  contextmenu: CustomEvent<{
    // event: MouseEvent
    originalTarget: EventTarget | null;
    nodeId: DrawflowNode['id'] | null;
  }>;
  // clickEnd: CustomEvent<{ event: unknown }>;
  // contextmenu: CustomEvent<{ event: unknown }>;
  mouseMove: CustomEvent<MousePositionEvent>;
  keydown: CustomEvent<{ event: KeyboardEvent }>;
  zoom: CustomEvent<{ zoom: number }>;
  translate: CustomEvent<MousePositionEvent>;
  import: CustomEvent<{ event: unknown }>;
  export: CustomEvent<{ data: unknown }>;
  editorModeChange: CustomEvent<{ mode: DrawFlowEditorMode }>;
  rerouteMoved: CustomEvent<{ nodeOutputId: DrawflowNode['id'] }>;
  initialized: CustomEvent<unknown>;
}
