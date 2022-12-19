import type { DrawflowNode } from "./node";

export interface DrawflowModuleData {
    data: {
      [nodeKey: DrawflowNode['id']]: DrawflowNode;
    };
  }
  