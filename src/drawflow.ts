/* eslint-disable no-self-assign */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { html as litHtml, nothing, render as litRender } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { v4 as uuidv4 } from 'uuid';
import { NodeRemoveButtonComponent } from './components/node-remove-button.component';
import { NodeComponent } from './components/node.component';
import {
  DrawflowConnection,
  DrawFlowEditorMode,
  DrawflowEventsMap,
  DrawflowExport,
  DrawflowNode,
  DrawflowNodeLive,
  Vue,
  wrapNodeData,
} from './types';
import { createCurvature, html, htmlToTemplate } from './utils';

export * from './components/node.component';
export * from './types';
export * from './utils';

export class Drawflow extends EventTarget {
  /**
   * doesn't dispatch any event if true
   */
  protected _silentMode: boolean = false;

  protected readonly precanvas: HTMLElement = document.createElement('div');

  protected ele_selected: HTMLElement | SVGElement | null = null;
  protected node_selected: HTMLElement | null = null;
  protected drag: boolean = false;

  #canvasX: number = 0;
  get canvasX() {
    return this.#canvasX;
  }
  set canvasX(val: number) {
    this.#canvasX = val;
    this.precanvas.style.setProperty('--x', `${val}px`);
  }

  #canvasY: number = 0;
  get canvasY() {
    return this.#canvasY;
  }
  set canvasY(val: number) {
    this.#canvasY = val;
    this.precanvas.style.setProperty('--y', `${val}px`);
  }

  #canvasW: number = 0;
  get canvasW(): number {
    return this.#canvasW;
  }
  set canvasW(value: number) {
    this.#canvasW = value;
    this.precanvas.style.setProperty('--width', `${value}px`);
  }

  #canvasH: number = 0;
  get canvasH(): number {
    return this.#canvasH;
  }
  set canvasH(value: number) {
    this.#canvasH = value;
    this.precanvas.style.setProperty('--height', `${value}px`);
  }

  /**
   * Active reroute
   * @default false
   */
  reroute: boolean = false;

  /**
   * Fix adding points
   * @default false
   */
  reroute_fix_curvature: boolean = false;

  /**
   * Curvature
   * @default 0.5
   */
  curvature: number = 0.5;

  /**
   * Curvature reroute first point and last point
   * @default 0.5
   */
  reroute_curvature_start_end: number = 0.5;

  /**
   * Curvature reroute
   * @default 0.5
   */
  reroute_curvature: number = 0.5;

  /**
   * Width of reroute
   * @default 6
   */
  reroute_width: number = 6;

  private drag_point: boolean = false;
  private editor_selected: boolean = false;
  private connection: boolean = false;
  private connection_ele: HTMLElement | SVGElement | null = null;
  protected connection_selected: SVGPathElement | null = null;

  /**
   * Canvas origin x coordinate
   */
  canvas_x: number = 0;

  /**
   * Canvas origin x coordinate
   */
  canvas_y: number = 0;

  private pos_x: number = 0;
  private pos_x_start: number = 0;
  private pos_y: number = 0;
  private pos_y_start: number = 0;
  private mouse_x: number = 0;
  private mouse_y: number = 0;

  /**
   * Width of line
   * @default 5
   */
  #line_path: number = 5;
  get line_path() {
    return this.#line_path;
  }
  set line_path(value: number) {
    this.#line_path = value;
    this.precanvas.style.setProperty('--stroke-width', `${value}px`);
  }

  private first_click: HTMLElement | SVGElement | null = null;

  /**
   * Force the first input to drop the connection on top of the node
   * @default false
   */
  force_first_input: boolean = false;

  /**
   * Drag nodes on click inputs
   * @default true
   */
  draggable_inputs: boolean = true;

  private noderegister: Record<
    string,
    {
      html: any; // eslint-disable-line @typescript-eslint/no-explicit-any
      props: object | null;
      options: object | null;
    }
  > = {};

  /**
   * Graph data object
   */
  data: DrawflowExport = { Home: { data: {} } };

  // Configurable options
  private module = 'Home';

  get currentModule() {
    return this.module;
  }

  /**
   * edit or fixed mode
   * @default edit
   */
  #editor_mode: DrawFlowEditorMode = 'edit';
  set editor_mode(mode: DrawFlowEditorMode) {
    this.#editor_mode = mode;
    this.precanvas.dataset.mode = mode;

    if (mode !== 'edit') {
      this.contextmenuDel();
      this.clearSelection();
    }

    this.dispatchEvent(
      new CustomEvent('editorModeChange', {
        detail: { mode },
        cancelable: false,
      })
    );
  }
  get editor_mode() {
    return this.#editor_mode;
  }

  #block_position: boolean = false;
  get block_position() {
    return this.#block_position;
  }
  set block_position(val: boolean) {
    this.#block_position = val;
    this.precanvas?.classList.toggle('nodes-node-dragables', val);
  }
  // block_position: boolean = false;

  /**
   * Default zoom
   * @default 1
   */
  #zoom: number = 1;
  get zoom() {
    return this.#zoom;
  }
  set zoom(zoom: number) {
    const oldValue = this.#zoom;
    this.#zoom = zoom;

    this.canvas_x = (this.canvas_x / oldValue) * zoom;
    this.canvas_y = (this.canvas_y / oldValue) * zoom;

    this.precanvas.style.setProperty('--scale', zoom.toString());

    this.dispatchEvent(
      new CustomEvent('zoom', { detail: { zoom }, cancelable: false })
    );
  }

  /**
   * Default zoom max
   * @default 1.6
   */
  #zoom_max: number = 1.6;
  get zoom_max() {
    return this.#zoom_max;
  }
  set zoom_max(value: number) {
    this.#zoom_max = value;
    if (this.zoom > value) this.zoom = value;
  }

  /**
   * Default zoom min
   * @default 0.5
   */
  #zoom_min: number = 0.5;
  get zoom_min() {
    return this.#zoom_min;
  }
  set zoom_min(value: number) {
    this.#zoom_min = value;
    if (this.zoom < value) this.zoom = value;
  }

  /**
   * Default zoom value update
   * @default 0.1
   */
  zoom_factor: number = 0.1;

  // Mobile
  private evCache: PointerEvent[] = [];
  private prevDiff = -1;

  constructor(
    protected readonly container: HTMLElement,
    protected readonly render?: object,
    protected readonly parent?: object
  ) {
    super();
    Reflect.defineProperty(this, 'precanvas', { writable: false });
  }

  /* Mobile zoom */
  private pointerdown_handler(ev: PointerEvent) {
    this.evCache.push(ev);
  }

  private pointermove_handler(ev: PointerEvent) {
    for (let i = 0; i < this.evCache.length; i++) {
      if (ev.pointerId == this.evCache[i].pointerId) {
        this.evCache[i] = ev;
        break;
      }
    }

    if (this.evCache.length == 2) {
      // Calculate the distance between the two pointers
      const curDiff = Math.abs(
        this.evCache[0].clientX - this.evCache[1].clientX
      );

      if (this.prevDiff > 100) {
        if (curDiff > this.prevDiff) {
          // The distance between the two pointers has increased

          this.zoom_in();
        }
        if (curDiff < this.prevDiff) {
          // The distance between the two pointers has decreased
          this.zoom_out();
        }
      }
      this.prevDiff = curDiff;
    }
  }

  private pointerup_handler(ev: PointerEvent) {
    this.remove_event(ev);
    if (this.evCache.length < 2) {
      this.prevDiff = -1;
    }
  }

  private remove_event(ev: PointerEvent) {
    // Remove this event from the target's cache
    for (let i = 0; i < this.evCache.length; i++) {
      if (this.evCache[i].pointerId == ev.pointerId) {
        this.evCache.splice(i, 1);
        break;
      }
    }
  }
  /* End Mobile Zoom */

  protected onDeleteNode(event: Event) {
    const el = event.target as NodeRemoveButtonComponent;
    console.log(el, el.parentElement instanceof NodeComponent);

    if (el.parentElement instanceof NodeComponent) {
      const nodeId = el.parentElement.dataset.node_id as string;
      this.removeNodeId(nodeId);
    } else if (this.connection_selected) {
      this.removeConnectionSelected();
    }

    if (this.node_selected !== null) {
      this.node_selected.classList.remove('selected');
      this.node_selected = null;
      this.dispatchEvent(
        new CustomEvent('nodeUnselected', { cancelable: false })
      );
    }

    if (this.connection_selected !== null) {
      this.connection_selected.classList.remove('selected');
      this.removeReouteConnectionSelected();
      this.connection_selected = null;
    }
  }

  private removeReouteConnectionSelected() {
    this.dispatchEvent(
      new CustomEvent('connectionUnselected', {
        detail: { event: true },
        cancelable: false,
      })
    );
    if (this.reroute_fix_curvature) {
      this.connection_selected?.parentElement
        ?.querySelectorAll('.main-path')
        .forEach((item) => item.classList.remove('selected'));
    }
  }

  private click(e: MouseEvent | TouchEvent) {
    const node =
      e.target instanceof Element
        ? e.target?.closest<NodeComponent>('.drawflow-node')
        : null;

    const isRemoveAtempt: boolean =
      e.target instanceof Element &&
      e.target.classList.contains('drawflow-delete');

    this.dispatchEvent(
      new CustomEvent('click', {
        detail: {
          originalTarget: e.target,
          nodeId: node?.dataset.node_id ?? null,
          isRemoveAtempt,
          eventDesc: {
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            shiftKey: e.shiftKey,
          },
        },
        cancelable: false,
      })
    );
  }

  protected onNodeSelected(event: Event) {
    if (this.editor_mode !== 'edit') return;

    const node = event.target as NodeComponent;

    const allowed = this.dispatchEvent(
      new CustomEvent('nodeSelected', {
        detail: { nodeId: node.dataset.node_id },
        cancelable: true,
      })
    );

    if (allowed) {
      this.precanvas
        .querySelectorAll<NodeComponent>('df-node.selected')
        .forEach((node) => {
          node.classList.remove('selected');
          this.dispatchEvent(
            new CustomEvent('nodeUnselected', {
              detail: { nodeId: node.dataset.node_id },
              cancelable: false,
            })
          );
        });

      node.classList.add('selected');
    }
  }

  private clickStart(e: MouseEvent | TouchEvent): boolean | void {
    const target = e.target as HTMLElement | SVGElement;

    if (this.editor_mode === 'fixed') {
      e.preventDefault();

      if (
        target.classList.contains('parent-drawflow') ||
        target.classList.contains('drawflow')
      ) {
        this.ele_selected = target.closest('.parent-drawflow');
      }
    } else if (this.editor_mode === 'view') {
      if (
        target.closest('.drawflow') !== null ||
        target.matches('.parent-drawflow')
      ) {
        this.ele_selected = target.closest('.parent-drawflow');
        e.preventDefault();
      }
      // } else if (this.block_position) {
      //   e.preventDefault();
      //   this.ele_selected = target.closest('.parent-drawflow');
    } else {
      this.first_click = target;
      this.ele_selected = target;

      if (
        !(this.ele_selected instanceof NodeRemoveButtonComponent) &&
        (e as MouseEvent).button === 0
      ) {
        this.contextmenuDel();
      }

      if (target.closest('.drawflow_content_node') !== null) {
        this.ele_selected =
          target.closest('.drawflow_content_node')?.parentElement ?? null;
      }
    }

    if (this.ele_selected?.classList.contains('drawflow-node')) {
      if (this.connection_selected !== null) {
        this.connection_selected.classList.remove('selected');
        this.removeReouteConnectionSelected();
        this.connection_selected = null;
      }

      this.node_selected = this.ele_selected as HTMLElement;

      if (!this.block_position) {
        if (!this.draggable_inputs) {
          if (
            target.tagName !== 'INPUT' &&
            target.tagName !== 'TEXTAREA' &&
            target.tagName !== 'SELECT' &&
            target.hasAttribute('contenteditable') !== true
          ) {
            this.drag = true;
          }
        } else {
          if (target.tagName !== 'SELECT') {
            this.drag = true;
          }
        }
      }
    } else if (this.ele_selected?.classList.contains('output')) {
      this.connection = true;
      if (this.node_selected != null) {
        this.node_selected.classList.remove('selected');
        this.node_selected = null;
        this.dispatchEvent(
          new CustomEvent('nodeUnselected', { cancelable: false })
        );
      }
      if (this.connection_selected != null) {
        this.connection_selected.classList.remove('selected');
        this.removeReouteConnectionSelected();
        this.connection_selected = null;
      }
      this.drawConnection(e.target as Element);
    } else if (this.ele_selected?.classList.contains('parent-drawflow')) {
      console.log('parent-drawflow');
      if (this.node_selected != null) {
        this.node_selected.classList.remove('selected');
        this.node_selected = null;
        this.dispatchEvent(
          new CustomEvent('nodeUnselected', {
            cancelable: false,
          })
        );
      }
      if (this.connection_selected != null) {
        this.connection_selected.classList.remove('selected');
        this.removeReouteConnectionSelected();
        this.connection_selected = null;
      }
      this.editor_selected = true;
    } else if (this.ele_selected?.classList.contains('drawflow')) {
      if (this.node_selected != null) {
        this.node_selected.classList.remove('selected');
        this.node_selected = null;
        this.dispatchEvent(
          new CustomEvent('nodeUnselected', {
            cancelable: false,
          })
        );
      }
      if (this.connection_selected != null) {
        this.connection_selected.classList.remove('selected');
        this.removeReouteConnectionSelected();
        this.connection_selected = null;
      }
      this.editor_selected = true;
    } else if (this.ele_selected?.classList.contains('main-path')) {
      if (this.node_selected !== null) {
        this.node_selected.classList.remove('selected');
        this.node_selected = null;
        this.dispatchEvent(
          new CustomEvent('nodeUnselected', { cancelable: false })
        );
      }
      if (this.connection_selected !== null) {
        this.connection_selected.classList.remove('selected');
        this.removeReouteConnectionSelected();
        this.connection_selected = null;
      }
      this.connection_selected = this.ele_selected as SVGPathElement;
      this.connection_selected.classList.add('selected');
      const listclassConnection =
        this.connection_selected?.parentElement?.classList ?? [];
      if (listclassConnection.length > 1) {
        this.dispatchEvent(
          new CustomEvent('connectionSelected', {
            detail: {
              output_id: listclassConnection[2].slice(14),
              input_id: listclassConnection[1].slice(13),
              output_class: listclassConnection[3],
              input_class: listclassConnection[4],
            },
            cancelable: false,
          })
        );
        if (this.reroute_fix_curvature) {
          this.connection_selected?.parentElement
            ?.querySelectorAll('.main-path')
            .forEach((item) => item.classList.add('selected'));
        }
      }
    } else if (this.ele_selected?.classList.contains('point')) {
      this.drag_point = true;
      this.ele_selected.classList.add('selected');
    }

    if (e.type === 'touchstart') {
      this.pos_x = (e as TouchEvent).touches[0].clientX;
      this.pos_x_start = (e as TouchEvent).touches[0].clientX;
      this.pos_y = (e as TouchEvent).touches[0].clientY;
      this.pos_y_start = (e as TouchEvent).touches[0].clientY;
      this.mouse_x = (e as TouchEvent).touches[0].clientX;
      this.mouse_y = (e as TouchEvent).touches[0].clientY;
    } else {
      this.pos_x = (e as MouseEvent).clientX;
      this.pos_x_start = (e as MouseEvent).clientX;
      this.pos_y = (e as MouseEvent).clientY;
      this.pos_y_start = (e as MouseEvent).clientY;
    }

    if (
      this.ele_selected?.classList.contains('input') ||
      this.ele_selected?.classList.contains('output') ||
      this.ele_selected?.classList.contains('main-path')
    ) {
      e.preventDefault();
    }

    // this.dispatch('clickEnd', e);
  }

  private position(e: TouchEvent | MouseEvent) {
    const { clientX: e_pos_x, clientY: e_pos_y } =
      e instanceof MouseEvent ? e : e.touches[0];

    if (this.connection) {
      this.updateConnection(e_pos_x, e_pos_y);
    }

    if (this.editor_selected) {
      const x = this.canvas_x - (this.pos_x - e_pos_x);
      const y = this.canvas_y - (this.pos_y - e_pos_y);
      this.dispatchEvent(
        new CustomEvent('translate', { detail: { x, y }, cancelable: false })
      );
      this.canvasX = x;
      this.canvasY = y;
    } else if (this.drag && this.ele_selected) {
      e.preventDefault();

      const { offsetTop, offsetLeft, id } = this.ele_selected as HTMLElement;
      const { width, height } = this.ele_selected.getBoundingClientRect();
      const nodeId = this.ele_selected.dataset.node_id ?? id.slice(5);

      const x = offsetLeft - (this.pos_x - e_pos_x) / this.zoom;
      const y = offsetTop - (this.pos_y - e_pos_y) / this.zoom;

      if (x >= 0) {
        this.pos_x = e_pos_x;
        this.ele_selected.style.setProperty('--left', `${x}px`);
        this.data[this.module].data[nodeId].pos_x = x;
        if (x + width > this.canvasW) this.canvasW = x + width;
      }

      if (y >= 0) {
        this.pos_y = e_pos_y;
        this.ele_selected.style.setProperty('--top', `${y}px`);
        this.data[this.module].data[nodeId].pos_y = y;
        if (y + height > this.canvasH) this.canvasH = y + height;
      }

      this.updateConnectionNodes(id as `node-${string}`);
    } else if (
      this.drag_point &&
      this.ele_selected &&
      this.ele_selected.parentElement
    ) {
      console.log('drag_point');

      this.pos_x = e_pos_x;
      this.pos_y = e_pos_y;

      const { x, y } = this.precanvas.getBoundingClientRect();

      const pos_x = (this.pos_x - x) / this.zoom;
      const pos_y = (this.pos_y - y) / this.zoom;

      this.ele_selected.setAttribute('cx', pos_x.toString());
      this.ele_selected.setAttribute('cy', pos_y.toString());

      const nodeUpdate = this.ele_selected.parentElement.classList[2].slice(9);
      const nodeUpdateIn =
        this.ele_selected.parentElement.classList[1].slice(13);
      const output_class = this.ele_selected.parentElement
        .classList[3] as `output_${number}`;
      const input_class = this.ele_selected.parentElement
        .classList[4] as `input_${number}`;

      let numberPointPosition =
        Array.from(this.ele_selected.parentElement.children).indexOf(
          this.ele_selected
        ) - 1;

      if (this.reroute_fix_curvature) {
        const numberMainPath =
          this.ele_selected.parentElement.querySelectorAll('.main-path')
            .length - 1;
        numberPointPosition -= numberMainPath;
        if (numberPointPosition < 0) {
          numberPointPosition = 0;
        }
      }

      const nodeId = nodeUpdate.slice(5);
      const searchConnection = this.data[this.module].data[nodeId].outputs[
        output_class
      ].findIndex(
        (item) => item.node === nodeUpdateIn && item.output === input_class
      );

      const points =
        this.data[this.module].data[nodeId].outputs[output_class][
          searchConnection
        ].points;
      if (points)
        points[numberPointPosition] = {
          pos_x: pos_x,
          pos_y: pos_y,
        };

      const parentSelected = this.ele_selected.parentElement.classList[2].slice(
        9
      ) as `node-${string}`;

      this.updateConnectionNodes(parentSelected);
    }

    if (e.type === 'touchmove') {
      this.mouse_x = e_pos_x;
      this.mouse_y = e_pos_y;
    }
    this.dispatchEvent(
      new CustomEvent('mouseMove', {
        detail: { x: e_pos_x, y: e_pos_y },
        cancelable: false,
      })
    );
  }

  private dragEnd(e: MouseEvent | TouchEvent) {
    let e_pos_x: number;
    let e_pos_y: number;
    let ele_last: Element;

    if (e.type === 'touchend') {
      e_pos_x = this.mouse_x;
      e_pos_y = this.mouse_y;
      ele_last = document.elementFromPoint(e_pos_x, e_pos_y) as Element;
    } else {
      e_pos_x = (e as MouseEvent).clientX;
      e_pos_y = (e as MouseEvent).clientY;
      ele_last = (e as MouseEvent).target as Element;
    }

    if (this.drag) {
      if (this.pos_x_start !== e_pos_x || this.pos_y_start !== e_pos_y) {
        this.dispatchEvent(
          new CustomEvent('nodeMoved', {
            detail: { nodeId: this.ele_selected?.id.slice(5) },
            cancelable: false,
          })
        );
      }
    }

    if (this.drag_point) {
      this.ele_selected?.classList.remove('selected');
      if (this.pos_x_start !== e_pos_x || this.pos_y_start !== e_pos_y) {
        this.dispatchEvent(
          new CustomEvent('rerouteMoved', {
            detail: {
              nodeOutputId:
                this.ele_selected?.parentElement?.classList[2].slice(14),
            },
          })
        );
      }
    }

    if (this.editor_selected) {
      this.canvas_x -= this.pos_x - e_pos_x;
      this.canvas_y -= this.pos_y - e_pos_y;
      this.editor_selected = false;
    }

    if (this.connection === true) {
      if (
        ele_last.classList[0] === 'input' ||
        (this.force_first_input &&
          (ele_last.closest('.drawflow_content_node') != null ||
            ele_last.classList[0] === 'drawflow-node'))
      ) {
        let input_id: string;
        let input_class: `input_${number}` | boolean;
        if (
          this.force_first_input &&
          (ele_last.closest('.drawflow_content_node') != null ||
            ele_last.classList[0] === 'drawflow-node')
        ) {
          if (ele_last.closest('.drawflow_content_node') != null) {
            input_id =
              ele_last.closest('.drawflow_content_node')?.parentElement?.id ??
              '';
          } else {
            input_id = ele_last.id;
          }
          if (
            !Object.keys(this.getNodeFromId(input_id.slice(5)).inputs).length
          ) {
            input_class = false;
          } else {
            input_class = 'input_1';
          }
        } else {
          // Fix connection;
          input_id = ele_last.parentElement!.parentElement!.id;
          input_class = ele_last.classList[1] as `input_${number}`;
        }

        const output_id = this.ele_selected!.parentElement!.parentElement!.id;
        const output_class = this.ele_selected!
          .classList[1] as `output_${number}`;

        if (output_id !== input_id && input_class !== false) {
          if (
            !this.container.querySelector(
              `.connection.node_in_${input_id}.node_out_${output_id}.${output_class}.${input_class}`
            )
          ) {
            // Conection no exist save connection

            this.connection_ele!.dataset.node_in = input_id;
            this.connection_ele!.dataset.node_out = output_id;

            this.connection_ele?.classList.add(
              `node_in_${input_id}`,
              `node_out_${output_id}`,
              output_class
            );

            if (typeof input_class === 'string')
              this.connection_ele?.classList.add(input_class);

            const id_input = input_id.slice(5);
            const id_output = output_id.slice(5);

            this.data[this.module].data[id_output].outputs[output_class].push({
              node: id_input,
              output: input_class,
            });
            this.data[this.module].data[id_input].inputs[input_class].push({
              node: id_output,
              input: output_class,
            });
            this.updateConnectionNodes(`node-${id_output}`);
            this.updateConnectionNodes(`node-${id_input}`);
            this.dispatchEvent(
              new CustomEvent('connectionCreated', {
                detail: {
                  output_id: id_output,
                  input_id: id_input,
                  output_class: output_class,
                  input_class: input_class,
                },
                cancelable: false,
              })
            );
          } else {
            this.dispatchEvent(
              new CustomEvent('connectionCancel', { cancelable: false })
            );
            this.connection_ele?.remove();
          }

          this.connection_ele = null;
        } else {
          // Connection exists Remove Connection;
          this.dispatchEvent(
            new CustomEvent('connectionCancel', { cancelable: false })
          );
          this.connection_ele?.remove();
          this.connection_ele = null;
        }
      } else {
        // Remove Connection;
        this.dispatchEvent(
          new CustomEvent('connectionCancel', { cancelable: false })
        );
        this.connection_ele?.remove();
        this.connection_ele = null;
      }
    }

    this.drag = false;
    this.drag_point = false;
    this.connection = false;
    this.ele_selected = null;
    this.editor_selected = false;
  }

  protected blur() {
    this.drag = false;
    this.drag_point = false;
    this.connection = false;
    this.ele_selected = null;
    this.editor_selected = false;
  }

  protected contextmenu(e: GlobalEventHandlersEventMap['contextmenu']): void {
    e.preventDefault();

    if (this.editor_mode === 'fixed' || this.editor_mode === 'view') return;

    this.contextmenuDel();

    if (this.node_selected || this.connection_selected) {
      if (this.node_selected) {
        const node = this.getNodeFromId(this.node_selected.id.slice(5));
        if (node.preventRemove) return;
      }

      const allowed = this.dispatchEvent(
        new CustomEvent('contextmenu', {
          detail: {
            originalTarget: e.target,
            nodeId: this.node_selected?.dataset.node_id ?? null,
          },
          cancelable: true,
        })
      );

      if (!allowed) return;

      const deletebox = document.createElement('df-node-remove-button');

      if (this.node_selected) {
        this.node_selected.appendChild(deletebox);
        deletebox.dataset.node_id = this.node_selected.dataset.node_id;
      } else if (
        Number(this.connection_selected?.parentElement?.classList?.length) > 1
      ) {
        const { x, y } = this.precanvas.getBoundingClientRect();
        const { clientY, clientX } = e;

        deletebox.style.top = `${(clientY - y) / this.zoom}px`;
        deletebox.style.left = `${(clientX - x) / this.zoom}px`;

        this.precanvas.appendChild(deletebox);
      }
    }
  }

  protected contextmenuDel() {
    for (const el of this.precanvas.querySelectorAll('df-node-remove-button')) {
      el.remove();
    }
  }

  private key(e: KeyboardEvent): void {
    if (this.editor_mode === 'fixed' || this.editor_mode === 'view') return;

    if (e.key === 'Delete' || (e.key === 'Backspace' && e.metaKey)) {
      if (this.node_selected !== null) {
        const node = this.getNodeFromId(
          this.node_selected.dataset.node_id ?? this.node_selected.id.slice(5)
        );
        if (
          !node.preventRemove &&
          this.first_click?.tagName !== 'INPUT' &&
          this.first_click?.tagName !== 'TEXTAREA' &&
          this.first_click?.hasAttribute('contenteditable') !== true
        ) {
          this.removeNodeId(this.node_selected.id.slice(5));
        }
      } else if (this.connection_selected != null) {
        this.removeConnectionSelected();
      }
    }
  }

  private zoom_enter(event: WheelEvent) {
    if (event.ctrlKey) {
      event.preventDefault();
      if (event.deltaY > 0) this.zoom_out();
      else this.zoom_in();
    }
  }

  /** end event handlers */

  start() {
    this._silentMode = true;
    this.container.classList.add('parent-drawflow');

    this.container.tabIndex = 0;

    this.precanvas.classList.add('drawflow');

    const { width, height } = this.container.getBoundingClientRect();
    this.canvasW = width;
    this.canvasH = height;

    /* run side effects */
    this.canvasX = this.canvasX;
    this.canvasY = this.canvasY;
    this.editor_mode = this.editor_mode;
    this.block_position = this.block_position;
    this.line_path = this.line_path;
    /* -------- */

    this.container.appendChild(this.precanvas);

    /* Mouse and Touch Actions */
    this.container.addEventListener('click', this.click.bind(this));

    this.container.addEventListener('mouseup', this.dragEnd.bind(this));
    this.container.addEventListener('mousemove', this.position.bind(this));
    this.container.addEventListener('mousedown', this.clickStart.bind(this));
    this.container.addEventListener('blur', this.blur.bind(this));

    this.container.addEventListener('touchend', this.dragEnd.bind(this));
    this.container.addEventListener('touchmove', this.position.bind(this));
    this.container.addEventListener('touchstart', this.clickStart.bind(this));

    /* Context Menu */
    this.container.addEventListener('contextmenu', this.contextmenu.bind(this));
    /* Delete */
    this.container.addEventListener('keydown', this.key.bind(this));

    /* Zoom Mouse */
    this.container.addEventListener('wheel', this.zoom_enter.bind(this));
    /* Update data Nodes */
    // this.container.addEventListener('input', this.updateNodeValue.bind(this));

    this.container.addEventListener('dblclick', this.dblclick.bind(this));

    this.container.addEventListener(
      'node-selected',
      this.onNodeSelected.bind(this)
    );

    this.container.addEventListener(
      'delete-node',
      this.onDeleteNode.bind(this)
    );

    /* Mobile zoom */
    this.container.addEventListener(
      'pointerdown',
      this.pointerdown_handler.bind(this)
    );

    this.container.addEventListener(
      'pointermove',
      this.pointermove_handler.bind(this)
    );

    this.container.addEventListener(
      'pointerup',
      this.pointerup_handler.bind(this)
    );

    this.container.addEventListener(
      'pointercancel',
      this.pointerup_handler.bind(this)
    );
    // this.container.onpointerout = this.pointerup_handler.bind(this);

    this.container.addEventListener(
      'pointerleave',
      this.pointerup_handler.bind(this)
    );

    this.load();

    this._silentMode = false;

    this.dispatchEvent(new CustomEvent('initialized'));
  }

  load(): void {
    const data = this.data[this.module].data;

    for (const node of Object.values(data)) {
      this.addNodeImport(node, this.precanvas);
    }

    if (this.reroute) {
      for (const node of Object.values(data)) {
        this.addRerouteImport(node);
      }
    }

    for (const key of Object.keys(data)) {
      this.updateConnectionNodes(`node-${key}`);
    }
  }

  updateNodePosition(
    id: DrawflowNode['id'],
    x: number,
    y: number,
    module: string = this.module
  ) {
    if (x < 0) throw new RangeError('x must be greater or equal to 0');
    if (y < 0) throw new RangeError('x must be greater or equal to 0');

    const ele_selected = this.getElementOfNode(id);

    if (!ele_selected) throw new Error('invalid id');

    ele_selected.style.setProperty('--top', `${y}px`);
    ele_selected.style.setProperty('--left', `${x}px`);

    this.data[module].data[id].pos_x = x;
    this.data[module].data[id].pos_y = y;

    const { width, height } = ele_selected.getBoundingClientRect();

    if (x + width > this.canvasW) this.canvasW = x + width;
    if (y + height > this.canvasH) this.canvasH = y + height;

    this.updateConnectionNodes(`node-${id}`);
  }

  /** Increment zoom by zoom_factor */
  zoom_in() {
    if (this.zoom < this.zoom_max) {
      this.zoom += this.zoom_factor;
    }
  }

  /** Decrement zoom by zoom_factor */
  zoom_out() {
    if (this.zoom > this.zoom_min) {
      this.zoom -= this.zoom_factor;
    }
  }

  /** Restores zoom to 1 */
  zoom_reset() {
    if (this.zoom !== 1) {
      this.zoom = 1;
    }
  }

  private drawConnection(ele: Element) {
    const connection = htmlToTemplate(html`
      <svg class="connection">
        <path class="main-path" d="" />
      </svg>
    `).content.cloneNode(true) as DocumentFragment;

    this.connection_ele = connection.querySelector('.connection');
    this.precanvas.appendChild(connection);
    const id_output = ele.parentElement!.parentElement!.id.slice(5);
    const output_class = ele.classList[1];
    this.dispatchEvent(
      new CustomEvent('connectionStart', {
        detail: {
          output_id: id_output,
          output_class: output_class,
        },
        cancelable: false,
      })
    );
  }

  private updateConnection(eX: number, eY: number) {
    if (!this.connection_ele || !this.ele_selected) return;

    const { x: preCX, y: preCY } = this.precanvas.getBoundingClientRect();
    const { x: elX, y: elY } = this.ele_selected.getBoundingClientRect();

    const zoom = this.zoom;

    const path = this.connection_ele.children[0] as SVGPathElement;

    const line_x =
      (this.ele_selected as HTMLElement).offsetWidth / 2 + (elX - preCX) / zoom;
    const line_y =
      (this.ele_selected as HTMLElement).offsetHeight / 2 +
      (elY - preCY) / zoom;

    const x = (eX - preCX) / zoom;
    const y = (eY - preCY) / zoom;

    const lineCurve = createCurvature(
      line_x,
      line_y,
      x,
      y,
      this.curvature,
      'openclose'
    );

    path.setAttributeNS(null, 'd', lineCurve);
  }

  /**
   * Add connection. Ex: 15,16,'output_1','input_1'
   * @param outputNodeId
   * @param inputNodeId
   * @param outputName
   * @param inputName
   */
  addConnection(
    id_output: DrawflowNode['id'],
    id_input: DrawflowNode['id'],
    output_class: `output_${number}`,
    input_class: `input_${number}`,
    connection_class: string = ''
  ) {
    const nodeOneModule = this.getModuleFromNodeId(id_output);

    if (nodeOneModule === this.getModuleFromNodeId(id_input)) {
      const dataNode: DrawflowNode = this._getNodeFromId(id_output);

      const exist: boolean = !!dataNode.outputs[output_class]?.find(
        ({ node, output }) => node === id_input && output === input_class
      );

      if (exist) return;

      //Create Connection
      this.data[nodeOneModule].data[id_output].outputs[output_class]?.push({
        node: id_input.toString(),
        output: input_class,
        pathClass: connection_class,
      });

      this.data[nodeOneModule].data[id_input].inputs[input_class]?.push({
        node: id_output.toString(),
        input: output_class,
        pathClass: connection_class,
      });

      if (this.module === nodeOneModule && this.precanvas) {
        //Draw connection
        const con = htmlToTemplate(html`
          <svg
            class="connection node_in_node-${id_input} node_out_node-${id_output} ${output_class} ${input_class} ${connection_class}"
            data-node_in="node-${id_input}"
            data-node_out="node-${id_output}"
            data-output-from="${output_class}"
            data-input-to="${input_class}"
          >
            <path class="main-path" d="" />
          </svg>
        `).content.cloneNode(true);

        this.precanvas.appendChild(con);
        this.updateConnectionNodes(`node-${id_output}`);
        this.updateConnectionNodes(`node-${id_input}`);
      }

      this.dispatchEvent(
        new CustomEvent('connectionCreated', {
          detail: {
            output_id: id_output,
            input_id: id_input,
            output_class: output_class,
            input_class: input_class,
          },
          cancelable: false,
        })
      );
    }
  }

  /**
   * Update connections position from Node Ex id: node-x
   * @param id
   */
  updateConnectionNodes(id: `node-${DrawflowNode['id']}`): void {
    const idSearchIn = `node_in_${id}`;
    const idSearchOut = `node_out_${id}`;
    const curvature = this.curvature;
    const reroute_curvature = this.reroute_curvature;
    const reroute_curvature_start_end = this.reroute_curvature_start_end;
    const reroute_fix_curvature = this.reroute_fix_curvature;
    const rerouteWidth = this.reroute_width;
    const zoom = this.zoom;

    const { x: pcX, y: pcY } = this.precanvas.getBoundingClientRect();

    // outs
    for (const el of this.container.querySelectorAll<SVGElement>(
      `.${idSearchOut}`
    )) {
      const points = el.querySelectorAll<HTMLElement>('.point');

      if (!points.length) {
        const elStart = this.container.querySelector<HTMLElement>(
          `#${id} .${el.classList[3]}`
        );

        const elEnd = this.container.querySelector<HTMLElement>(
          `#${el.dataset.node_in} .${el.classList[4]}`
        );

        if (!elStart || !elEnd) return;

        const { x: elEndX, y: elEndY } = elEnd.getBoundingClientRect();
        const { x: elStartX, y: elStartY } = elStart.getBoundingClientRect();

        const startX = elStart.offsetWidth / 2 + (elStartX - pcX) / zoom;
        const startY = elStart.offsetHeight / 2 + (elStartY - pcY) / zoom;
        const endX = elEnd.offsetWidth / 2 + (elEndX - pcX) / zoom;
        const endY = elEnd.offsetHeight / 2 + (elEndY - pcY) / zoom;

        const lineCurve = createCurvature(
          startX,
          startY,
          endX,
          endY,
          curvature,
          'openclose'
        );
        (el.children[0] as SVGPathElement).setAttributeNS(null, 'd', lineCurve);
      } else {
        const reoute_fix: string[] = [];
        for (let i = 0; i < points.length; i++) {
          const item = points[i];

          const { x: elX, y: elY } = item.getBoundingClientRect();
          const start_x = (elX - pcX) / zoom + rerouteWidth;
          const start_y = (elY - pcY) / zoom + rerouteWidth;

          if (i === 0) {
            const elemtsearchOut = this.container.querySelector<HTMLElement>(
              `#${id} .${item.parentElement!.classList[3]}`
            )!;

            const { x: elSearchOutX, y: elSearchOutY } =
              elemtsearchOut.getBoundingClientRect();

            const init_x =
              (elSearchOutX - pcX) / zoom + elemtsearchOut.offsetWidth / 2;
            const init_y =
              (elSearchOutY - pcY) / zoom + elemtsearchOut.offsetHeight / 2;

            const lineCurve1 = createCurvature(
              init_x,
              init_y,
              start_x,
              start_y,
              reroute_curvature_start_end,
              'open'
            );

            reoute_fix.push(lineCurve1);
          }

          let endCurveType: 'close' | 'other';
          let end_x: number;
          let end_y: number;

          if (i === points.length - 1) {
            const id_search = item.parentElement!.classList[1].replace(
              'node_in_',
              ''
            );
            const elemtsearch = this.container.querySelector<HTMLElement>(
              `#${id_search} .${item.parentElement!.classList[4]}`
            )!;

            const { x: elSearchX, y: elSearchY } =
              elemtsearch.getBoundingClientRect();

            end_x = (elSearchX - pcX) / zoom + elemtsearch.offsetWidth / 2;
            end_y = (elSearchY - pcY) / zoom + elemtsearch.offsetHeight / 2;
            endCurveType = 'close';
          } else {
            const elemtsearch = points[i + 1];

            const { x: elSearchX, y: elSearchY } =
              elemtsearch.getBoundingClientRect();

            end_x = (elSearchX - pcX) / zoom + rerouteWidth;
            end_y = (elSearchY - pcY) / zoom + rerouteWidth;
            endCurveType = 'other';
          }

          const lineCurveSearch = createCurvature(
            start_x,
            start_y,
            end_x,
            end_y,
            reroute_curvature_start_end,
            endCurveType
          );

          reoute_fix.push(lineCurveSearch);
        }

        if (reroute_fix_curvature) {
          reoute_fix.forEach((itempath, i) => {
            el.children[i].setAttributeNS(null, 'd', itempath);
          });
        } else {
          const linecurve = reoute_fix.join(' ');
          el.children[0].setAttributeNS(null, 'd', linecurve);
        }
      }
    }

    // ins
    for (const el of this.container.querySelectorAll<SVGElement>(
      `.${idSearchIn}`
    )) {
      const points = el.querySelectorAll<HTMLElement>('.point');

      if (!points.length) {
        const elStart = this.container.querySelector<HTMLElement>(
          `#${el.dataset.node_out} .${el.classList[3]}`
        );

        const elEnd = this.container.querySelector<HTMLElement>(
          `#${id} .${el.classList[4]}`
        );

        if (!elStart || !elEnd) return;

        const { x: elStartX, y: elStartY } = elStart.getBoundingClientRect();
        const { x: elEndX, y: elEndY } = elEnd.getBoundingClientRect();

        const startX = elStart.offsetWidth / 2 + (elStartX - pcX) / zoom;
        const startY = elStart.offsetHeight / 2 + (elStartY - pcY) / zoom;
        const endX = elEnd.offsetWidth / 2 + (elEndX - pcX) / zoom;
        const endY = elEnd.offsetHeight / 2 + (elEndY - pcY) / zoom;

        const lineCurve = createCurvature(
          startX,
          startY,
          endX,
          endY,
          curvature,
          'openclose'
        );
        (el.children[0] as SVGPathElement).setAttributeNS(null, 'd', lineCurve);
      } else {
        const reoute_fix: string[] = [];
        for (let i = 0; i < points.length; i++) {
          const item = points[i];
          const { x: elX, y: elY } = item.getBoundingClientRect();
          const start_x = (elX - pcX) / zoom + rerouteWidth;
          const start_y = (elY - pcY) / zoom + rerouteWidth;

          if (i === 0) {
            const { node_out: nodeOrigin, outputFrom: slotOriginName } =
              item.parentElement!.dataset;

            const slotOrigin = this.container.querySelector<HTMLElement>(
              `#${nodeOrigin} .${slotOriginName}`
            )!;

            const { x: slotX, y: slotY } = slotOrigin.getBoundingClientRect();

            const init_x = slotOrigin.offsetWidth / 2 + (slotX - pcX) / zoom;
            const init_y = slotOrigin.offsetHeight / 2 + (slotY - pcY) / zoom;

            const lineCurve1 = createCurvature(
              init_x,
              init_y,
              start_x,
              start_y,
              reroute_curvature_start_end,
              'open'
            );

            reoute_fix.push(lineCurve1);
          }

          let endCurveType: 'close' | 'other';
          let end_x: number;
          let end_y: number;

          if (i === points.length - 1) {
            const { node_in: nodeDestiny, inputTo: slotDestName } =
              item.parentElement!.dataset;

            const slotDest = this.container.querySelector<HTMLElement>(
              `#${nodeDestiny} .${slotDestName}`
            )!;

            const { x: slotX, y: slotY } = slotDest.getBoundingClientRect();

            end_x = (slotX - pcX) / zoom + slotDest.offsetWidth / 2;
            end_y = (slotY - pcY) / zoom + slotDest.offsetHeight / 2;
            endCurveType = 'close';
          } else {
            const point = points[i + 1];
            const { x: pointX, y: pointY } = point.getBoundingClientRect();

            end_x = (pointX - pcX) / zoom + rerouteWidth;
            end_y = (pointY - pcY) / zoom + rerouteWidth;
            endCurveType = 'other';
          }

          const lineCurve2 = createCurvature(
            start_x,
            start_y,
            end_x,
            end_y,
            reroute_curvature,
            endCurveType
          );

          reoute_fix.push(lineCurve2);
        }

        if (reroute_fix_curvature) {
          reoute_fix.forEach((itempath, i) => {
            el.children[i].setAttributeNS(null, 'd', itempath);
          });
        } else {
          const linecurve = reoute_fix.join(' ');
          el.children[0].setAttributeNS(null, 'd', linecurve);
        }
      }
    }
  }

  private dblclick(e: MouseEvent) {
    if (this.connection_selected != null && this.reroute) {
      this.createReroutePoint(this.connection_selected);
      this.connection_selected = null;
    }

    if ((e.target as HTMLElement).classList[0] === 'point') {
      this.removeReroutePoint(e.target as SVGCircleElement);
    }
  }

  private createReroutePoint(ele: SVGPathElement) {
    if (!ele.parentElement) return;

    ele.classList.remove('selected');
    const nodeUpdate = ele.parentElement.classList[2].slice(
      9
    ) as `node-${string}`;
    const nodeUpdateIn = ele.parentElement.classList[1].slice(13);
    const sourceSlot = ele.parentElement.classList[3] as `output_${number}`;
    const targetSlot = ele.parentElement.classList[4] as `input_${number}`;

    const { x: pcX, y: pcY } = this.precanvas.getBoundingClientRect();

    const pos_x = (this.pos_x - pcX) / this.zoom;
    const pos_y = (this.pos_y - pcY) / this.zoom;

    /** render point */
    const point = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'circle'
    );
    point.classList.add('point');
    point.setAttributeNS(null, 'cx', pos_x.toString());
    point.setAttributeNS(null, 'cy', pos_y.toString());
    point.setAttributeNS(null, 'r', this.reroute_width.toString());

    let position_add_array_point = 0;
    if (this.reroute_fix_curvature) {
      const numberPoints =
        ele.parentElement.querySelectorAll('.main-path').length;

      const path = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'path'
      );

      path.classList.add('main-path');
      path.setAttributeNS(null, 'd', '');

      ele.parentElement.insertBefore(
        path,
        ele.parentElement.children[numberPoints]
      );

      if (numberPoints === 1) {
        ele.parentElement.appendChild(point);
      } else {
        const search_point = Array.from(ele.parentElement.children).indexOf(
          ele
        );

        position_add_array_point = search_point;

        ele.parentElement.insertBefore(
          point,
          ele.parentElement.children[search_point + numberPoints + 1]
        );
      }
    } else {
      ele.parentElement.appendChild(point);
    }
    /** end render point */

    const nodeId = nodeUpdate.slice(5);

    const nodeConnections = this._getNodeFromId(nodeId).outputs[sourceSlot];

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const connection = nodeConnections.find(
      (item) => item.node === nodeUpdateIn && item.output === targetSlot
    )!;

    connection.points ??= [];

    const newPoint: Exclude<
      DrawflowConnection<any>['points'],
      undefined
    >[number] = { pos_x, pos_y };

    if (this.reroute_fix_curvature) {
      if (position_add_array_point > 0 || !!connection.points.length) {
        connection.points.splice(position_add_array_point, 0, newPoint);
      } else {
        connection.points.push(newPoint);
      }

      ele.parentElement.querySelectorAll('.main-path').forEach((item) => {
        item.classList.remove('selected');
      });
    } else {
      connection.points.push(newPoint);
    }

    this.dispatchEvent(
      new CustomEvent('addReroute', { detail: { nodeId }, cancelable: false })
    );

    this.updateConnectionNodes(nodeUpdate);
  }

  private removeReroutePoint(ele: SVGCircleElement) {
    if (!ele.parentElement) throw new Error('el is not in DOM');

    const nodeUpdate = ele.parentElement.classList[2].slice(
      9
    ) as `node-${string}`;
    const nodeUpdateIn = ele.parentElement.classList[1].slice(13);
    const output_class = ele.parentElement.classList[3] as `output_${number}`;
    const input_class = ele.parentElement.classList[4] as `input_${number}`;

    const nodeId = nodeUpdate.slice(5);

    const searchConnection = this.data[this.module].data[nodeId].outputs[
      output_class
    ].findIndex(
      (item) => item.node === nodeUpdateIn && item.output === input_class
    );

    let numberPointPosition = Array.from(ele.parentElement.children).indexOf(
      ele
    );

    if (this.reroute_fix_curvature) {
      const numberMainPath =
        ele.parentElement.querySelectorAll('.main-path').length;

      ele.parentElement.children[numberMainPath - 1].remove();

      numberPointPosition -= numberMainPath;

      if (numberPointPosition < 0) numberPointPosition = 0;
    } else {
      numberPointPosition--;
    }

    this.data[this.module].data[nodeId].outputs[output_class][
      searchConnection
    ].points?.splice(numberPointPosition, 1);

    ele.remove();

    this.dispatchEvent(
      new CustomEvent('removeReroute', {
        detail: { nodeId },
        cancelable: false,
      })
    );

    this.updateConnectionNodes(nodeUpdate);
  }

  /**
   *
   * @param name Name of module registered.
   * @param component HTML to drawn or vue component.
   * @param props Only for vue. Props of component. Not Required
   * @param options Only for vue. Options of component. Not Required
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registerNode(name: string, component: HTMLElement): void;
  registerNode(
    name: string,
    component: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    props: object,
    options: object
  ): void;
  registerNode(
    name: string,
    component: any,
    props: object | null = null,
    options: object | null = null
  ): void {
    this.noderegister[name] = {
      html: component,
      props: props,
      options: options,
    };
  }

  isNodeRegister(name: string): boolean {
    return name in this.noderegister;
  }

  private _getNodeFromId(id: DrawflowNode['id']): DrawflowNode {
    const moduleName = this.getModuleFromNodeId(id);
    if (!moduleName) throw new Error('undefined');

    const node = this.data[moduleName].data[id];
    if (!node) throw new Error('undefined');

    return node;
  }

  /**
   * Get Info of node. Ex: id: 5
   */
  getNodeFromId(id: DrawflowNode['id']): DrawflowNodeLive {
    const nodeData = this._getNodeFromId(id);
    return wrapNodeData(nodeData, this);
  }
  /**
   *  Return Array of nodes id. Ex: name: telegram
   */
  getNodesFromName(name: string): DrawflowNode['id'][] {
    const nodes: DrawflowNode['id'][] = [];

    for (const module of Object.values(this.data)) {
      for (const node of Object.values(module.data)) {
        if (node.name == name) {
          nodes.push(node.id);
        }
      }
    }

    return nodes;
  }

  protected renderNodeFirstTime(
    dataNode: DrawflowNode,
    precanvas: HTMLElement
  ) {
    const container = document.createElement('div');

    container.classList.add('parent-node');

    precanvas.appendChild(container);

    let content: Node | ReturnType<typeof unsafeHTML> | typeof nothing =
      nothing;

    if (dataNode.typenode === false) {
      content = unsafeHTML(dataNode.html);
    } else if (dataNode.typenode === true) {
      const { html: template } = this.noderegister[dataNode.html];

      if (!(template instanceof Element))
        throw new TypeError('html must be instace of Element');

      content = (
        template instanceof HTMLTemplateElement ? template.content : template
      ).cloneNode(true);
    }

    const template = litHtml`
      <df-node
        id="node-${dataNode.id}"
        class="drawflow-node ${dataNode.classname || ''}"
        data-node_id="${dataNode.id}"
        tabindex="0"
        style="
          --top: ${dataNode.pos_y}px;
          --left: ${dataNode.pos_x}px;
          top: var(--top, 0px);
          left: var(--left, 0px);
        "
      >
        <div class="inputs">
          ${Object.keys(dataNode.inputs).map(
            (input_item) => litHtml`<div class="input ${input_item}"></div>`
          )}
        </div>
        <div class="drawflow_content_node">${content}</div>
        <div class="outputs">
          ${Object.keys(dataNode.outputs).map(
            (output_item) => litHtml`<div class="output ${output_item}"></div>`
          )}
        </div>
      </df-node>
    `;

    litRender(template, container, {
      host: this,
    });

    if (dataNode.typenode === 'vue') {
      const content = container.querySelector<HTMLElement>(
        '.drawflow_content_node'
      )!;

      if (parseInt((this.render as Vue).version) === 3) {
        //Vue 3
        const wrapper = (this.render as Vue).h(
          this.noderegister[dataNode.html].html,
          this.noderegister[dataNode.html].props,
          this.noderegister[dataNode.html].options
        );
        wrapper.appContext = this.parent;
        (this.render as Vue).render(wrapper, content);
      } else {
        //Vue 2
        const wrapper = new (this.render as Vue)({
          parent: this.parent,
          render: (h: (...args: any) => any) =>
            h(this.noderegister[dataNode.html].html, {
              props: this.noderegister[dataNode.html].props,
            }),
          ...this.noderegister[dataNode.html].options,
        }).$mount();
        content.appendChild(wrapper.$el);
      }
    }

    const { width, height } = this.getElementOfNode(
      dataNode.id
    )!.getBoundingClientRect();

    if (dataNode.pos_x + width > this.canvasW) {
      this.canvasW = dataNode.pos_x + width + 40;
    }
    if (dataNode.pos_y + height > this.canvasH) {
      this.canvasH = dataNode.pos_y + height + 40;
    }
  }

  /**
   * @param nodeData - DrawflowNode object
   */
  addNode(nodeData: Omit<DrawflowNode, 'id'>): DrawflowNode['id'];

  /**
   * @param name Name of module
   * @param inputs Number of inputs
   * @param outputs Number of outputs
   * @param posx Position on start node left
   * @param posy Position on start node top
   * @param className Added classname to de node
   * @param data Data passed to node
   * @param html HTML drawn on node or name of register node.
   * @param typenode Default false, true for Object HTML, vue for vue
   * @param preventRemove
   *
   * @deprecated
   */
  addNode(
    name: DrawflowNode['name'],
    num_in: number,
    num_out: number,
    ele_pos_x: number,
    ele_pos_y: number,
    classoverride: string,
    data: any,
    html: string,
    typenode: DrawflowNode['typenode'],
    preventRemove?: boolean
  ): DrawflowNode['id'];

  addNode(
    ...args:
      | [Omit<DrawflowNode, 'id'>]
      | [
          name: DrawflowNode['name'],
          num_in: number,
          num_out: number,
          ele_pos_x: number,
          ele_pos_y: number,
          classoverride: string,
          data: any,
          html: string,
          typenode: DrawflowNode['typenode'],
          preventRemove?: boolean
        ]
  ): DrawflowNode['id'] {
    const newNodeId: DrawflowNode['id'] = uuidv4();

    let json: DrawflowNode;

    if (((s: any[]): s is [Omit<DrawflowNode, 'id'>] => s.length === 1)(args)) {
      json = { ...args[0], id: newNodeId };
    } else {
      const [
        name,
        num_in,
        num_out,
        ele_pos_x,
        ele_pos_y,
        classoverride,
        data,
        html,
        typenode = false,
        preventRemove = false,
      ] = args;

      if (typenode === true && !(html in this.noderegister))
        throw new RangeError(`node ${html} not found!`);

      const json_inputs: DrawflowNode['inputs'] = {};
      for (let x = 0; x < num_in; x++) {
        json_inputs[`input_${x + 1}`] = [];
      }

      const json_outputs: DrawflowNode['outputs'] = {};
      for (let x = 0; x < num_out; x++) {
        json_outputs[`output_${x + 1}`] = [];
      }

      json = {
        id: newNodeId,
        name,
        data,
        classname: classoverride,
        html,
        typenode,
        inputs: json_inputs,
        outputs: json_outputs,
        pos_x: ele_pos_x,
        pos_y: ele_pos_y,
        preventRemove,
      };
    }

    this.data[this.module].data[newNodeId] = json;
    this.renderNodeFirstTime(json, this.precanvas);
    this.dispatchEvent(
      new CustomEvent('nodeCreated', { detail: { nodeId: newNodeId } })
    );

    return newNodeId;
  }

  private addNodeImport(dataNode: DrawflowNode, precanvas: HTMLElement) {
    this.renderNodeFirstTime(dataNode, precanvas);
  }

  private addRerouteImport(dataNode: DrawflowNode) {
    const reroute_width = this.reroute_width;
    const reroute_fix_curvature = this.reroute_fix_curvature;

    for (const output_item of Object.keys(
      dataNode.outputs
    ) as (keyof typeof dataNode.outputs)[]) {
      for (const { node: input_id, output: input_class, points } of dataNode
        .outputs[output_item]) {
        if (points === undefined) continue;

        for (const [i, item] of points.entries()) {
          const ele = this._getConnectionEl(
            dataNode.id,
            input_id,
            output_item,
            input_class!
          );

          if (reroute_fix_curvature) {
            if (i === 0) {
              for (let z = 0; z < points.length; z++) {
                const path = document.createElementNS(
                  'http://www.w3.org/2000/svg',
                  'path'
                );
                path.classList.add('main-path');
                path.setAttributeNS(null, 'd', '');
                ele?.appendChild(path);
              }
            }
          }

          const point = document.createElementNS(
            'http://www.w3.org/2000/svg',
            'circle'
          );
          point.classList.add('point');
          const pos_x = item.pos_x;
          const pos_y = item.pos_y;

          point.setAttributeNS(null, 'cx', pos_x.toString());
          point.setAttributeNS(null, 'cy', pos_y.toString());
          point.setAttributeNS(null, 'r', reroute_width.toString());

          ele?.appendChild(point);
        }
      }
    }
  }

  /**
   * Add input to node. Ex id: 5
   * @param id
   */
  addNodeInput(id: DrawflowNode['id']): void {
    const moduleName = this.getModuleFromNodeId(id);
    const infoNode = this._getNodeFromId(id);
    const numInput = Object.keys(infoNode.inputs).length + 1;

    infoNode.inputs[`input_${numInput}`] = [];

    if (this.module === moduleName) {
      const input = document.createElement('div');
      input.classList.add('input');
      input.classList.add(`input_${numInput}`);

      this.container.querySelector(`#node-${id} .inputs`)?.appendChild(input);

      this.updateConnectionNodes(`node-${id}`);
    }
  }

  /**
   * Add output to node. Ex id: 5
   * @param id
   */
  addNodeOutput(id: DrawflowNode['id']): void {
    const moduleName = this.getModuleFromNodeId(id);

    const infoNode = this._getNodeFromId(id);

    const numOutput = Object.keys(infoNode.outputs).length + 1;

    infoNode.outputs[`output_${numOutput}`] = [];

    if (this.module === moduleName) {
      //Draw output
      const output = document.createElement('div');
      output.classList.add('output');
      output.classList.add(`output_${numOutput}`);
      const parent = this.container.querySelector(`#node-${id} .outputs`);
      parent?.appendChild(output);
      this.updateConnectionNodes(`node-${id}`);
    }
  }

  /**
   * Remove input to node. Ex id: 5, input_2
   * @param id
   * @param inputId
   *
   * TODO: revisar
   */
  removeNodeInput(id: DrawflowNode['id'], inputId: `input_${number}`): void {
    const moduleName = this.getModuleFromNodeId(id);
    const infoNode = this._getNodeFromId(id);

    if (this.module === moduleName) {
      this.container
        .querySelector(`#node-${id} .inputs .input.${inputId}`)
        ?.remove();
    }

    for (const connectionDetail of infoNode.inputs[inputId]) {
      const id_output = connectionDetail.node;
      const output_class = connectionDetail.input;
      this.removeSingleConnection(id_output, id, output_class!, inputId);
    }

    delete infoNode.inputs[inputId];

    const inputSlots = Object.values(infoNode.inputs);

    infoNode.inputs = {};

    const input_class_id = inputId.slice(6) as `${number}`;

    let nodeUpdates: DrawflowConnection<'input'>[] = [];

    inputSlots.forEach((item, i) => {
      item.forEach((itemx) => nodeUpdates.push(itemx));

      infoNode.inputs[`input_${i + 1}`] = item;
    });

    nodeUpdates = [...new Set(nodeUpdates.map((e) => JSON.stringify(e)))].map(
      (e) => JSON.parse(e)
    );

    if (this.module === moduleName) {
      // prettier-ignore
      for (const item of this.container.querySelectorAll(`#node-${id} .inputs .input`)) {
        const id_class = item.classList[1].slice(6) as `${number}`;

        if (parseInt(input_class_id) < parseInt(id_class)) {
          item.classList.remove(`input_${id_class}`);
          item.classList.add(`input_${+id_class - 1}`);
        }
      }
    }

    for (const itemx of nodeUpdates) {
      this.data[moduleName].data[itemx.node].outputs[itemx.input!].forEach(
        (itemz, g) => {
          if (itemz.node === id) {
            const output_id = itemz.output!.slice(6) as `${number}`;

            if (parseInt(input_class_id) < parseInt(output_id)) {
              if (this.module === moduleName) {
                const ele = this._getConnectionEl(
                  itemx.node,
                  id,
                  itemx.input!,
                  `input_${output_id}`
                );

                ele?.classList.remove(`input_${output_id}`);
                ele?.classList.add(`input_${+output_id - 1}`);
              }

              const connDetail: DrawflowConnection<'output'> = {
                node: itemz.node,
                output: `input_${+output_id - 1}`,
              };

              if (itemz.points) {
                connDetail.points = itemz.points;
              }

              this.data[moduleName].data[itemx.node].outputs[itemx.input!][g] =
                connDetail;
            }
          }
        }
      );
    }

    this.updateConnectionNodes(`node-${id}`);
  }

  /**
   * Remove output to node. Ex id: 5, output_2
   * @param id
   * @param outputId
   *
   * TODO: revisra
   */
  removeNodeOutput(id: DrawflowNode['id'], outputId: `output_${number}`): void {
    const moduleName = this.getModuleFromNodeId(id);
    const infoNode = this._getNodeFromId(id);

    if (this.module === moduleName) {
      this.container
        .querySelector(`#node-${id} .outputs .output.${outputId}`)
        ?.remove();
    }

    for (const { node, output } of infoNode.outputs[outputId]) {
      this.removeSingleConnection(id, node, outputId, output!);
    }

    delete infoNode.outputs[outputId];

    const outputSlots = Object.values(infoNode.outputs);

    infoNode.outputs = {};

    const output_class_id = outputId.slice(7) as `${number}`;

    let nodeUpdates: DrawflowConnection<'output'>[] = [];

    outputSlots.forEach((item, i) => {
      item.forEach((itemx) => {
        nodeUpdates.push({ node: itemx.node, output: itemx.output });
      });

      this.data[moduleName].data[id].outputs[`output_${i + 1}`] = item;
    });

    nodeUpdates = [...new Set(nodeUpdates.map((e) => JSON.stringify(e)))].map(
      (e) => JSON.parse(e)
    );

    if (this.module === moduleName) {
      const eles = this.container.querySelectorAll(
        `#node-${id} .outputs .output`
      );
      eles.forEach((item) => {
        const id_class = item.classList[1].slice(7);
        if (parseInt(output_class_id) < parseInt(id_class)) {
          item.classList.remove(`output_${id_class}`);
          item.classList.add(`output_${+id_class - 1}`);
        }
      });
    }

    nodeUpdates.forEach((itemx) => {
      this.data[moduleName].data[itemx.node].inputs[itemx.output!].forEach(
        (itemz, g) => {
          if (itemz.node == id) {
            const input_id = itemz.input!.slice(7) as `${number}`;
            if (parseInt(output_class_id) < parseInt(input_id)) {
              if (this.module === moduleName) {
                const ele = this._getConnectionEl(
                  id,
                  itemx.node,
                  `output_${input_id}`,
                  itemx.output!
                );
                ele?.classList.remove(`output_${input_id}`);
                ele?.classList.remove(itemx.output!);
                ele?.classList.add(`output_${+input_id - 1}`);
                ele?.classList.add(itemx.output!);
              }

              const connDetail: DrawflowConnection<'input'> = {
                node: itemz.node,
                input: `output_${+input_id - 1}`,
              };

              if (itemz.points) {
                connDetail.points = itemz.points;
              }

              this.data[moduleName].data[itemx.node].inputs[itemx.output!][g] =
                connDetail;
            }
          }
        }
      );
    });

    this.updateConnectionNodes(`node-${id}`);
  }

  /**
   * Remove node. Ex id: node-x
   */
  removeNodeId(
    nodeId: DrawflowNode['id'],
    options?: { notify?: boolean; cancelable?: boolean }
  ): void {
    const { notify = true, cancelable = true } = options ?? {};

    if (notify) {
      const nodeRemoveEvent = new CustomEvent('nodeRemove', {
        detail: { nodeId },
        cancelable,
      });

      const canceled = !this.dispatchEvent(nodeRemoveEvent);

      if (cancelable && canceled) return;
    }

    const moduleName = this.getModuleFromNodeId(nodeId);

    const nodeData = JSON.parse(
      JSON.stringify(this.data[moduleName].data[nodeId])
    );

    this.removeConnectionNodeId(nodeId);

    if (this.module === moduleName) {
      this.getElementOfNode(nodeId)?.parentElement?.remove();
    }

    delete this.data[moduleName].data[nodeId];

    if (notify)
      this.dispatchEvent(
        new CustomEvent('nodeRemoved', {
          detail: { nodeId, nodeData },
          cancelable: false,
        })
      );
  }

  private removeConnectionSelected() {
    if (this.connection_selected?.parentElement) {
      const listclass = this.connection_selected.parentElement.classList;

      const sourceNodeId = listclass[2].slice(14);
      const targetNodeId = listclass[1].slice(13);
      const sourceSlot = listclass[3] as `output_${number}`;
      const targetSlot = listclass[4] as `input_${number}`;

      this.removeSingleConnection(
        sourceNodeId,
        targetNodeId,
        sourceSlot,
        targetSlot
      );

      this.connection_selected = null;
    }
  }

  /**
   * Remove connection. Ex: 15,16,'output_1','input_1'
   * @param sourceNodeId
   * @param targetNodeId
   * @param sourceSlot
   * @param targetSlot
   */
  removeSingleConnection(
    sourceNodeId: DrawflowNode['id'],
    targetNodeId: DrawflowNode['id'],
    sourceSlot: `output_${number}`,
    targetSlot: `input_${number}`
  ): boolean {
    const nodeOneModule = this.getModuleFromNodeId(sourceNodeId);
    const nodeTwoModule = this.getModuleFromNodeId(targetNodeId);

    if (nodeOneModule === nodeTwoModule) {
      const outputNode = this._getNodeFromId(sourceNodeId);
      const inputNode = this._getNodeFromId(targetNodeId);

      const index_out = outputNode.outputs[sourceSlot].findIndex(
        (item) => item.node == targetNodeId && item.output === targetSlot
      );

      const index_in = inputNode.inputs[targetSlot].findIndex(
        (item) => item.node == sourceNodeId && item.input === sourceSlot
      );

      if (index_out >= 0 && index_in >= 0) {
        if (this.module === nodeOneModule) {
          this._getConnectionEl(
            sourceNodeId,
            targetNodeId,
            sourceSlot,
            targetSlot
          )?.remove();
        }

        outputNode.outputs[sourceSlot].splice(index_out, 1);

        inputNode.inputs[targetSlot].splice(index_in, 1);

        this.dispatchEvent(
          new CustomEvent('connectionRemoved', {
            detail: { sourceNodeId, targetNodeId, sourceSlot, targetSlot },
            cancelable: false,
          })
        );

        return true;
      }
    }
    return false;
  }

  /**
   * Remove node connections. Ex id: x
   * @param nodeId
   */
  removeConnectionNodeId(nodeId: DrawflowNode['id']): void {
    const { inputs, outputs } = this.getNodeFromId(nodeId);

    for (const [sourceSlot, connections] of outputs.entries()) {
      for (const { node: targetNodeId, output: targetSlot } of connections) {
        this.removeSingleConnection(
          nodeId,
          targetNodeId,
          sourceSlot,
          targetSlot!
        );
      }
    }

    for (const [targetSlot, connections] of inputs.entries()) {
      for (const { node: sourceNodeId, input: sourceSlot } of connections) {
        this.removeSingleConnection(
          sourceNodeId,
          nodeId,
          sourceSlot!,
          targetSlot
        );
      }
    }
  }

  /**
   * Get name of module where is the id. Ex id: 5
   * @param id
   */
  getModuleFromNodeId(id: DrawflowNode['id']): string {
    let nameModule: string = '';

    if (Object.hasOwn(this.data[this.module].data, id)) {
      nameModule = this.module;
    } else {
      for (const [moduleName, { data }] of Object.entries(this.data)) {
        if (Object.hasOwn(data, id)) {
          nameModule = moduleName;
          break;
        }
      }
    }

    return nameModule;
  }

  addModule(moduleName: string): void {
    this.data[moduleName] = { data: {} };
    this.dispatchEvent(
      new CustomEvent('moduleCreated', {
        detail: { moduleName },
        cancelable: false,
      })
    );
  }

  changeModule(name: string): void {
    const event = new CustomEvent('moduleChanged', {
      detail: { moduleName: name },
      cancelable: true,
    });

    if (this.dispatchEvent(event)) {
      this.module = name;
      if (this.precanvas) this.precanvas.innerHTML = '';
      this.canvas_x = 0;
      this.canvas_y = 0;
      this.pos_x = 0;
      this.pos_y = 0;
      this.mouse_x = 0;
      this.mouse_y = 0;
      this.zoom = 1;
      this.load();
    }
  }

  removeModule(name: string): void {
    if (this.module === name) {
      this.changeModule('Home');
    }
    delete this.data[name];
    this.dispatchEvent(
      new CustomEvent('moduleRemoved', {
        detail: { moduleName: name },
        cancelable: false,
      })
    );
  }

  /** Clear data of module selected */
  clearModuleSelected(): void {
    if (this.precanvas) this.precanvas.innerHTML = '';
    this.data[this.module] = { data: {} };
  }

  /** Clear all data of all modules and modules remove. */
  clear(): void {
    if (this.precanvas) this.precanvas.innerHTML = '';
    this.data = { Home: { data: {} } };
  }

  export(): DrawflowExport {
    const dataExport = JSON.parse(JSON.stringify(this.data));
    this.dispatchEvent(
      new CustomEvent('export', {
        detail: { data: dataExport },
        cancelable: false,
      })
    );
    return dataExport;
  }

  toJson() {
    return this.export();
  }

  /**
   *
   * @param data
   * @param notifi - default to true
   */
  import(data: DrawflowExport, notifi: boolean = true): void {
    this.clear();
    this.data = JSON.parse(JSON.stringify(data));
    this.load();
    if (notifi) {
      this.dispatchEvent(
        new CustomEvent('import', {
          detail: { event: 'import' },
          cancelable: false,
        })
      );
    }
  }

  getElementOfNode(nodeId: DrawflowNode['id']): HTMLElement | null {
    return this.precanvas.querySelector<HTMLElement>(`#node-${nodeId}`);
  }

  protected _getConnectionEl(
    sourceNodeId: DrawflowNode['id'],
    targetNodeId: DrawflowNode['id'],
    sourceSlot: `output_${number}`,
    targetSlot: `input_${number}`
  ) {
    return this.container.querySelector<SVGSVGElement>(
      `.connection.node_in_node-${targetNodeId}.node_out_node-${sourceNodeId}.${sourceSlot}.${targetSlot}`
    );
  }

  addEventListener<K extends keyof DrawflowEventsMap>(
    type: K,
    listener: (this: Drawflow, ev: DrawflowEventsMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(
    type: '$all',
    listener: (this: Drawflow, ev: AllEvent<keyof DrawflowEventsMap>) => any,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void;
  override addEventListener(
    type: string,
    callback:
      | EventListenerOrEventListenerObject
      | ((
          this: Drawflow,
          ev: DrawflowEventsMap[keyof DrawflowEventsMap]
        ) => any)
      | ((this: Drawflow, ev: AllEvent<keyof DrawflowEventsMap>) => any),
    options?: boolean | AddEventListenerOptions | undefined
  ): void {
    super.addEventListener(
      type,
      callback as EventListenerOrEventListenerObject,
      options
    );
  }

  removeEventListener<K extends keyof DrawflowEventsMap>(
    type: K,
    listener: (this: Drawflow, ev: DrawflowEventsMap[K]) => any,
    options?: boolean | EventListenerOptions
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions
  ): void;
  override removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions
  ): void {
    super.removeEventListener(type, listener, options);
  }

  override dispatchEvent<K extends keyof DrawflowEventsMap>(
    event: DrawflowEventsMap[K]
  ): boolean {
    if (this._silentMode) return true;

    super.dispatchEvent(new AllEvent(event.type as K, event.detail));

    return super.dispatchEvent(event);
  }

  clearSelection() {
    this.precanvas.querySelectorAll('.selected').forEach((el) => {
      el.classList.remove('selected');
    });

    if (this.node_selected) {
      // this.node_selected.classList.remove('selected');
      this.node_selected = null;
      this.dispatchEvent(
        new CustomEvent('nodeUnselected', { cancelable: false })
      );
    }
    this.ele_selected = null;
    if (this.connection_selected) {
      // this.connection_selected.classList.remove('selected');
      this.connection_selected = null;
    }
  }
}

export class AllEvent<K extends keyof DrawflowEventsMap> extends Event {
  constructor(
    public readonly originalEventType: K,
    public readonly detail: DrawflowEventsMap[K]['detail']
  ) {
    super('$all', { cancelable: false });
  }
}
