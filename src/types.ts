/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ConnectionEvent {
  /**
   * outputNodeId
   */
  output_id: string;

  /**
   * inputNodeId
   */
  input_id: string;

  /**
   * name of the output
   */
  output_class: string;

  /**
   * name of the input
   */
  input_class: string;
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
  drawflow: {
    Home: DrawflowModuleData; // always present
    [customModuleName: string]: DrawflowModuleData;
  };
}

export interface DrawflowModuleData {
  data: {
    [nodeKey: string]: DrawflowNode;
  };
}

export interface DrawflowNode {
  class: string;
  data: Record<string, unknown>;
  html: string;
  id: string;
  inputs: Record<string, DrawflowConnection>;
  name: string;
  outputs: Record<string, DrawflowConnection>;
  pos_x: number;
  pos_y: number;
  typenode: boolean | 'vue';
  preventRemove: boolean;
}

export interface DrawflowConnection {
  connections: DrawflowConnectionDetail[];
}

export interface DrawflowConnectionDetail {
  input?: string;
  node: string;
  output?: string;
  points?: { pos_x: number; pos_y: number }[];
  pathClass?: string;
}

export type DrawFlowEditorMode = 'edit' | 'fixed' | 'view';

export interface Vue {
  version: string;
  h(...args: any): any;
  new (...args: any[]): any;
  render(...args: any[]): any;
}
