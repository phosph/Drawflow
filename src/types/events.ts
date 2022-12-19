import type { DrawFlowEditorMode } from "./misc";
import type { DrawflowNode } from "./node";

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
