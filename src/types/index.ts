/* eslint-disable @typescript-eslint/no-explicit-any */

import type { DrawflowModuleData } from './module';

export * from './events';
export * from './misc';
export * from './node';
export * from './module';
export * from './nodeConnection';

export interface DrawflowExport {
  Home: DrawflowModuleData; // always present
  [moduleName: string]: DrawflowModuleData;
}

export interface Vue {
  version: string;
  h(...args: any): any;
  new (...args: any[]): any;
  render(...args: any[]): any;
}
