import IDrawflow, {
  ConnectionEvent,
  ConnectionStartEvent,
  DrawflowConnection,
  DrawflowConnectionDetail,
  DrawFlowEditorMode,
  DrawflowExport,
  DrawflowNode,
  MousePositionEvent,
  Vue,
} from './types';
import { v4 as uuid } from 'uuid';

export * from './types';

export const htmlToTemplate = (_template: string): HTMLTemplateElement => {
  const template = document.createElement('template');
  template.innerHTML = _template;
  return template;
};

export const html = (strings: TemplateStringsArray, ...values: any[]) =>
  String.raw({ raw: strings }, ...values);

const deleteBoxTemplate = document.createElement('template');
deleteBoxTemplate.innerHTML = html` <div class="drawflow-delete">x</div> `;

export class Drawflow implements IDrawflow {
  private events: Record<
    string,
    { listeners: ((event: any, det?: any) => void)[] }
  > = {};
  private nodeId: number = 1;
  protected precanvas: HTMLElement | null = null;
  private ele_selected: HTMLElement | null = null;
  protected node_selected: HTMLElement | null = null;
  private drag: boolean = false;

  private _canvasX: number = 0;

  get canvasX() {
    return this._canvasX;
  }

  set canvasX(val: number) {
    this._canvasX = val;
    this.precanvas?.style.setProperty('--x', `${val}px`);
  }

  private _canvasY: number = 0;

  get canvasY() {
    return this._canvasY;
  }

  set canvasY(val: number) {
    this._canvasY = val;
    this.precanvas?.style.setProperty('--y', `${val}px`);
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
  protected connection_selected: HTMLElement | SVGElement | null = null;

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
  line_path: number = 5;
  first_click: HTMLElement | null = null;

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

  useuuid: boolean = false;

  private noderegister: Record<
    string,
    {
      html: any;
      props: object | null;
      options: object | null;
    }
  > = {};

  /**
   * Graph data object
   */
  drawflow: DrawflowExport = { drawflow: { Home: { data: {} } } };
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
    if (this.precanvas) this.precanvas.dataset.mode = mode;
  }
  get editor_mode() {
    return this.#editor_mode;
  }

  /**
   * Default zoom
   * @default 1
   */
  zoom: number = 1;

  /**
   * Default zoom max
   * @default 1.6
   */
  zoom_max: number = 1.6;
  /**
   * Default zoom min
   * @default 0.5
   */
  zoom_min: number = 0.5;
  /**
   * Default zoom value update
   * @default 0.1
   */
  zoom_value: number = 0.1;
  /**
   * Default zoom last value
   * @default 1
   */
  zoom_last_value: number = 1;

  // Mobile
  private evCache = new Array();
  private prevDiff = -1;

  constructor(
    private readonly container: HTMLElement,
    private readonly render?: object,
    private readonly parent?: object
  ) {}

  start() {
    // console.info("Start Drawflow!!");
    this.container.classList.add('parent-drawflow');

    this.container.tabIndex = 0;

    this.precanvas = document.createElement('div');
    Reflect.defineProperty(this, 'precanvas', { writable: false });
    this.precanvas.classList.add('drawflow');

    /* run side effects */
    this.canvasX = this.canvasX;
    this.canvasY = this.canvasY;
    this.editor_mode = this.editor_mode;
    /* -------- */

    this.container.appendChild(this.precanvas);

    /* Mouse and Touch Actions */
    this.container.addEventListener('mouseup', this.dragEnd.bind(this));
    this.container.addEventListener('mousemove', this.position.bind(this));
    this.container.addEventListener('mousedown', this.click.bind(this));

    this.container.addEventListener('touchend', this.dragEnd.bind(this));
    this.container.addEventListener('touchmove', this.position.bind(this));
    this.container.addEventListener('touchstart', this.click.bind(this));

    /* Context Menu */
    this.container.addEventListener('contextmenu', this.contextmenu.bind(this));
    /* Delete */
    this.container.addEventListener('keydown', this.key.bind(this));

    /* Zoom Mouse */
    this.container.addEventListener('wheel', this.zoom_enter.bind(this));
    /* Update data Nodes */
    this.container.addEventListener('input', this.updateNodeValue.bind(this));

    this.container.addEventListener('dblclick', this.dblclick.bind(this));

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
  }

  /* Mobile zoom */
  private pointerdown_handler(ev: PointerEvent) {
    this.evCache.push(ev);
  }

  private pointermove_handler(ev: PointerEvent) {
    for (var i = 0; i < this.evCache.length; i++) {
      if (ev.pointerId == this.evCache[i].pointerId) {
        this.evCache[i] = ev;
        break;
      }
    }

    if (this.evCache.length == 2) {
      // Calculate the distance between the two pointers
      var curDiff = Math.abs(this.evCache[0].clientX - this.evCache[1].clientX);

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
    for (var i = 0; i < this.evCache.length; i++) {
      if (this.evCache[i].pointerId == ev.pointerId) {
        this.evCache.splice(i, 1);
        break;
      }
    }
  }
  /* End Mobile Zoom */
  load(): void {
    if (!this.precanvas) throw new Error('drawflow instance is not started');

    for (const node of Object.values(
      this.drawflow.drawflow[this.module].data
    )) {
      this.addNodeImport(node, this.precanvas);
    }

    if (this.reroute) {
      for (const node of Object.values(
        this.drawflow.drawflow[this.module].data
      )) {
        this.addRerouteImport(node);
      }
    }

    for (var key in this.drawflow.drawflow[this.module].data) {
      this.updateConnectionNodes('node-' + key);
    }

    const editor = this.drawflow.drawflow;
    let number = 1;
    Object.keys(editor).map(function (moduleName, index) {
      Object.keys(editor[moduleName].data).map(function (id, index2) {
        if (parseInt(id) >= number) {
          number = parseInt(id) + 1;
        }
      });
    });
    this.nodeId = number;
  }

  private removeReouteConnectionSelected() {
    this.dispatch('connectionUnselected', true);
    if (this.reroute_fix_curvature) {
      this.connection_selected?.parentElement
        ?.querySelectorAll('.main-path')
        .forEach((item, i) => {
          item.classList.remove('selected');
        });
    }
  }

  private click(e: MouseEvent | TouchEvent): boolean | void {
    this.dispatch('click', e);
    const target = e.target as HTMLElement;

    if (this.editor_mode === 'fixed') {
      //return false;
      e.preventDefault();

      if (
        target.classList[0] === 'parent-drawflow' ||
        target.classList[0] === 'drawflow'
      ) {
        this.ele_selected = target.closest('.parent-drawflow');
      } else {
        return false;
      }
    } else if (this.editor_mode === 'view') {
      if (
        target.closest('.drawflow') != null ||
        target.matches('.parent-drawflow')
      ) {
        this.ele_selected = target.closest('.parent-drawflow');
        e.preventDefault();
      }
    } else {
      this.first_click = e.target as HTMLElement;
      this.ele_selected = e.target as HTMLElement;
      if ((e as MouseEvent).button === 0) {
        this.contextmenuDel();
      }

      if (target.closest('.drawflow_content_node') != null) {
        this.ele_selected =
          target.closest('.drawflow_content_node')?.parentElement ?? null;
      }
    }
    switch (this.ele_selected?.classList[0]) {
      case 'drawflow-node':
        if (this.node_selected != null) {
          this.node_selected.classList.remove('selected');
          if (this.node_selected != this.ele_selected) {
            this.dispatch('nodeUnselected', true);
          }
        }
        if (this.connection_selected != null) {
          this.connection_selected.classList.remove('selected');
          this.removeReouteConnectionSelected();
          this.connection_selected = null;
        }
        if (this.node_selected != this.ele_selected) {
          this.dispatch('nodeSelected', this.ele_selected.id.slice(5));
        }
        this.node_selected = this.ele_selected;
        this.node_selected.classList.add('selected');
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
        break;
      case 'output':
        this.connection = true;
        if (this.node_selected != null) {
          this.node_selected.classList.remove('selected');
          this.node_selected = null;
          this.dispatch('nodeUnselected', true);
        }
        if (this.connection_selected != null) {
          this.connection_selected.classList.remove('selected');
          this.removeReouteConnectionSelected();
          this.connection_selected = null;
        }
        this.drawConnection(e.target as Element);
        break;
      case 'parent-drawflow':
        if (this.node_selected != null) {
          this.node_selected.classList.remove('selected');
          this.node_selected = null;
          this.dispatch('nodeUnselected', true);
        }
        if (this.connection_selected != null) {
          this.connection_selected.classList.remove('selected');
          this.removeReouteConnectionSelected();
          this.connection_selected = null;
        }
        this.editor_selected = true;
        break;
      case 'drawflow':
        if (this.node_selected != null) {
          this.node_selected.classList.remove('selected');
          this.node_selected = null;
          this.dispatch('nodeUnselected', true);
        }
        if (this.connection_selected != null) {
          this.connection_selected.classList.remove('selected');
          this.removeReouteConnectionSelected();
          this.connection_selected = null;
        }
        this.editor_selected = true;
        break;
      case 'main-path':
        if (this.node_selected != null) {
          this.node_selected.classList.remove('selected');
          this.node_selected = null;
          this.dispatch('nodeUnselected', true);
        }
        if (this.connection_selected != null) {
          this.connection_selected.classList.remove('selected');
          this.removeReouteConnectionSelected();
          this.connection_selected = null;
        }
        this.connection_selected = this.ele_selected;
        this.connection_selected.classList.add('selected');
        const listclassConnection =
          this.connection_selected?.parentElement?.classList ?? [];
        if (listclassConnection.length > 1) {
          this.dispatch('connectionSelected', {
            output_id: listclassConnection[2].slice(14),
            input_id: listclassConnection[1].slice(13),
            output_class: listclassConnection[3],
            input_class: listclassConnection[4],
          });
          if (this.reroute_fix_curvature) {
            this.connection_selected?.parentElement
              ?.querySelectorAll('.main-path')
              .forEach((item, i) => {
                item.classList.add('selected');
              });
          }
        }
        break;
      case 'point':
        this.drag_point = true;
        this.ele_selected.classList.add('selected');
        break;
      case 'drawflow-delete':
        if (this.node_selected) {
          this.removeNodeId(this.node_selected.id);
        }

        if (this.connection_selected) {
          this.removeConnection();
        }

        if (this.node_selected != null) {
          this.node_selected.classList.remove('selected');
          this.node_selected = null;
          this.dispatch('nodeUnselected', true);
        }
        if (this.connection_selected != null) {
          this.connection_selected.classList.remove('selected');
          this.removeReouteConnectionSelected();
          this.connection_selected = null;
        }

        break;
      default:
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
      ['input', 'output', 'main-path'].includes(
        this.ele_selected?.classList?.[0] ?? ''
      )
    ) {
      e.preventDefault();
    }
    this.dispatch('clickEnd', e);
  }

  updateNodePosition(
    id: DrawflowNode['id'],
    x: number,
    y: number,
    module: string = this.module
  ) {
    const ele_selected = this.precanvas!.querySelector<HTMLElement>(
      `#node-${id}`
    )!;
    ele_selected.style.setProperty('--top', `${y}px`);
    ele_selected.style.setProperty('--left', `${x}px`);

    this.drawflow.drawflow[module].data[id].pos_x = x;
    this.drawflow.drawflow[module].data[id].pos_y = y;

    this.updateConnectionNodes(`node-${id}`);
  }

  private position(e: TouchEvent | MouseEvent) {
    const { clientX: e_pos_x, clientY: e_pos_y } =
      e instanceof MouseEvent ? e : e.touches[0];

    if (this.connection) {
      this.updateConnection(e_pos_x, e_pos_y);
    }

    if (this.editor_selected) {
      const x = this.canvas_x + -(this.pos_x - e_pos_x);
      const y = this.canvas_y + -(this.pos_y - e_pos_y);
      this.dispatch('translate', { x: x, y: y });
      this.canvasX = x;
      this.canvasY = y;
    } else if (this.drag && this.ele_selected) {
      e.preventDefault();

      const { offsetTop, offsetLeft, id } = this.ele_selected;

      const x = offsetLeft - (this.pos_x - e_pos_x) / this.zoom - this.canvasX;
      const y = offsetTop - (this.pos_y - e_pos_y) / this.zoom - this.canvasY;

      this.pos_x = e_pos_x;
      this.pos_y = e_pos_y;

      this.ele_selected.style.setProperty('--top', `${y}px`);
      this.ele_selected.style.setProperty('--left', `${x}px`);

      this.drawflow.drawflow[this.module].data[id.slice(5)].pos_x = x;
      this.drawflow.drawflow[this.module].data[id.slice(5)].pos_y = y;

      this.updateConnectionNodes(id);
    } else if (this.drag_point) {
      console.log('drag_point');
      // const x =
      //   ((this.pos_x - e_pos_x) * this.precanvas!.clientWidth) /
      //   (this.precanvas!.clientWidth * this.zoom);
      // const y =
      //   ((this.pos_y - e_pos_y) * this.precanvas!.clientHeight) /
      //   (this.precanvas!.clientHeight * this.zoom);

      this.pos_x = e_pos_x;
      this.pos_y = e_pos_y;

      const { x, y } = this.precanvas!.getBoundingClientRect();
      const { clientWidth, clientHeight } = this.precanvas!;

      const pos_x = (1 / this.zoom) * (this.pos_x - x);
      const pos_y = (1 / this.zoom) * (this.pos_y - y);

      // const pos_x = this.pos_x * (clientWidth / (clientWidth * this.zoom)) - x * (clientWidth / (clientWidth * this.zoom));
      // const pos_y = this.pos_y * (clientHeight / (clientHeight * this.zoom)) - y * (clientHeight / (clientHeight * this.zoom));

      this.ele_selected!.setAttribute('cx', pos_x.toString());
      this.ele_selected!.setAttribute('cy', pos_y.toString());

      const nodeUpdate =
        this.ele_selected!.parentElement!.classList[2].slice(9);
      const nodeUpdateIn =
        this.ele_selected!.parentElement!.classList[1].slice(13);
      const output_class = this.ele_selected!.parentElement!.classList[3];
      const input_class = this.ele_selected!.parentElement!.classList[4];

      let numberPointPosition =
        Array.from(this.ele_selected!.parentElement!.children).indexOf(
          this.ele_selected!
        ) - 1;

      if (this.reroute_fix_curvature) {
        const numberMainPath =
          this.ele_selected!.parentElement!.querySelectorAll('.main-path')
            .length - 1;
        numberPointPosition -= numberMainPath;
        if (numberPointPosition < 0) {
          numberPointPosition = 0;
        }
      }

      const nodeId = nodeUpdate.slice(5);
      const searchConnection = this.drawflow.drawflow[this.module].data[
        nodeId
      ].outputs[output_class].connections.findIndex(
        (item) => item.node === nodeUpdateIn && item.output === input_class
      );

      this.drawflow.drawflow[this.module].data[nodeId].outputs[
        output_class
      ].connections[searchConnection].points![numberPointPosition] = {
        pos_x: pos_x,
        pos_y: pos_y,
      };

      const parentSelected =
        this.ele_selected!.parentElement!.classList[2].slice(9);

      this.updateConnectionNodes(parentSelected);
    }

    if (e.type === 'touchmove') {
      this.mouse_x = e_pos_x;
      this.mouse_y = e_pos_y;
    }
    this.dispatch('mouseMove', { x: e_pos_x, y: e_pos_y });
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
      if (this.pos_x_start != e_pos_x || this.pos_y_start != e_pos_y) {
        this.dispatch('nodeMoved', this.ele_selected!.id.slice(5));
      }
    }

    if (this.drag_point) {
      this.ele_selected!.classList.remove('selected');
      if (this.pos_x_start != e_pos_x || this.pos_y_start != e_pos_y) {
        this.dispatch(
          'rerouteMoved',
          this.ele_selected!.parentElement!.classList[2].slice(14)
        );
      }
    }

    if (this.editor_selected) {
      this.canvas_x = this.canvas_x + -(this.pos_x - e_pos_x);
      this.canvas_y = this.canvas_y + -(this.pos_y - e_pos_y);
      this.editor_selected = false;
    }
    if (this.connection === true) {
      if (
        ele_last.classList[0] === 'input' ||
        (this.force_first_input &&
          (ele_last.closest('.drawflow_content_node') != null ||
            ele_last.classList[0] === 'drawflow-node'))
      ) {
        if (
          this.force_first_input &&
          (ele_last.closest('.drawflow_content_node') != null ||
            ele_last.classList[0] === 'drawflow-node')
        ) {
          if (ele_last.closest('.drawflow_content_node') != null) {
            var input_id = ele_last.closest('.drawflow_content_node')!
              .parentElement!.id;
          } else {
            var input_id = ele_last.id;
          }
          if (
            Object.keys(this.getNodeFromId(input_id.slice(5)).inputs).length ===
            0
          ) {
            var input_class: string | boolean = false;
          } else {
            var input_class: string | boolean = 'input_1';
          }
        } else {
          // Fix connection;
          var input_id = ele_last.parentElement!.parentElement!.id;
          var input_class: string | boolean = ele_last.classList[1];
        }
        var output_id = this.ele_selected!.parentElement!.parentElement!.id;
        var output_class = this.ele_selected!.classList[1];

        if (output_id !== input_id && input_class !== false) {
          if (
            !this.container.querySelector(
              `.connection.node_in_${input_id}.node_out_${output_id}.${output_class}.${input_class}`
            )
          ) {
            // Conection no exist save connection

            this.connection_ele!.dataset.node_in = input_id;
            this.connection_ele!.dataset.node_out = output_id;

            this.connection_ele!.classList.add(
              `node_in_${input_id}`,
              `node_out_${output_id}`,
              output_class
            );

            if (typeof input_class === 'string')
              this.connection_ele!.classList.add(input_class);

            var id_input = input_id.slice(5);
            var id_output = output_id.slice(5);

            this.drawflow.drawflow[this.module].data[id_output].outputs[
              output_class
            ].connections.push({ node: id_input, output: input_class });
            this.drawflow.drawflow[this.module].data[id_input].inputs[
              input_class
            ].connections.push({ node: id_output, input: output_class });
            this.updateConnectionNodes('node-' + id_output);
            this.updateConnectionNodes('node-' + id_input);
            this.dispatch('connectionCreated', {
              output_id: id_output,
              input_id: id_input,
              output_class: output_class,
              input_class: input_class,
            });
          } else {
            this.dispatch('connectionCancel', true);
            this.connection_ele!.remove();
          }

          this.connection_ele = null;
        } else {
          // Connection exists Remove Connection;
          this.dispatch('connectionCancel', true);
          this.connection_ele?.remove();
          this.connection_ele = null;
        }
      } else {
        // Remove Connection;
        this.dispatch('connectionCancel', true);
        this.connection_ele?.remove();
        this.connection_ele = null;
      }
    }

    this.drag = false;
    this.drag_point = false;
    this.connection = false;
    this.ele_selected = null;
    this.editor_selected = false;

    this.dispatch('mouseUp', e);
  }
  protected contextmenu(
    e: GlobalEventHandlersEventMap['contextmenu']
  ): boolean | void {
    this.dispatch('contextmenu', e);
    e.preventDefault();
    if (this.editor_mode === 'fixed' || this.editor_mode === 'view') {
      return false;
    }
    if (this.precanvas!.getElementsByClassName('drawflow-delete').length) {
      for (const el of this.precanvas!.getElementsByClassName(
        'drawflow-delete'
      )) {
        el.remove();
      }
    }
    if (this.node_selected || this.connection_selected) {
      const deletebox = deleteBoxTemplate.content
        .querySelector('.drawflow-delete')!
        .cloneNode(true) as HTMLElement;

      if (this.node_selected) {
        this.node_selected.appendChild(deletebox);
      }
      if (
        Number(this.connection_selected?.parentElement?.classList?.length) > 1
      ) {
        const { x, y } = this.precanvas!.getBoundingClientRect();
        const { clientHeight, clientWidth } = this.precanvas!;
        const { clientY, clientX } = e;

        deletebox.style.top = `${
          clientY * (clientHeight / (clientHeight * this.zoom)) -
          y * (clientHeight / (clientHeight * this.zoom))
        }px`;

        deletebox.style.left = `${
          clientX * (clientWidth / (clientWidth * this.zoom)) -
          x * (clientWidth / (clientWidth * this.zoom))
        }px`;

        this.precanvas!.appendChild(deletebox);
      }
    }
  }
  protected contextmenuDel() {
    if (this.precanvas!.getElementsByClassName('drawflow-delete').length) {
      this.precanvas!.getElementsByClassName('drawflow-delete')[0].remove();
    }
  }

  private key(e: KeyboardEvent): boolean | void {
    this.dispatch('keydown', e);
    if (this.editor_mode === 'fixed' || this.editor_mode === 'view') {
      return false;
    }
    if (e.key === 'Delete' || (e.key === 'Backspace' && e.metaKey)) {
      if (this.node_selected != null) {
        if (
          this.first_click!.tagName !== 'INPUT' &&
          this.first_click!.tagName !== 'TEXTAREA' &&
          this.first_click!.hasAttribute('contenteditable') !== true
        ) {
          this.removeNodeId(this.node_selected.id);
        }
      }
      if (this.connection_selected != null) {
        this.removeConnection();
      }
    }
  }

  private zoom_enter(event: WheelEvent, delta?: any) {
    if (event.ctrlKey) {
      event.preventDefault();
      if (event.deltaY > 0) {
        // Zoom Out
        this.zoom_out();
      } else {
        // Zoom In
        this.zoom_in();
      }
    }
  }

  /**
   * Redraws according to new zoom
   */
  zoom_refresh() {
    this.dispatch('zoom', this.zoom);
    this.canvas_x = (this.canvas_x / this.zoom_last_value) * this.zoom;
    this.canvas_y = (this.canvas_y / this.zoom_last_value) * this.zoom;
    this.zoom_last_value = this.zoom;
    this.precanvas!.style.setProperty('--scale', this.zoom.toString());
    // this.precanvas!.style.transform =
    //   'translate(' +
    //   this.canvas_x +
    //   'px, ' +
    //   this.canvas_y +
    //   'px) scale(' +
    //   this.zoom +
    //   ')';
  }

  /**
   *  Increment zoom +0.1
   */
  zoom_in() {
    if (this.zoom < this.zoom_max) {
      this.zoom += this.zoom_value;
      this.zoom_refresh();
    }
  }

  /**
   *  Decrement zoom -0.1
   */
  zoom_out() {
    if (this.zoom > this.zoom_min) {
      this.zoom -= this.zoom_value;
      this.zoom_refresh();
    }
  }

  /**
   *  Restores zoom to 1
   */
  zoom_reset() {
    if (this.zoom != 1) {
      this.zoom = 1;
      this.zoom_refresh();
    }
  }

  private createCurvature(
    start_pos_x: number,
    start_pos_y: number,
    end_pos_x: number,
    end_pos_y: number,
    curvature_value: number,
    type: 'open' | 'close' | 'other' | 'openclose'
  ): string {
    const line_x = start_pos_x;
    const line_y = start_pos_y;
    const x = end_pos_x;
    const y = end_pos_y;
    const curvature = curvature_value;

    let hx1: number;
    let hx2: number;

    //type openclose open close other
    switch (type) {
      case 'open':
        hx1 = line_x + Math.abs(x - line_x) * curvature;
        hx2 =
          x -
          Math.abs(x - line_x) *
            (start_pos_x >= end_pos_x ? curvature * -1 : curvature);
        break;
      case 'close':
        hx1 =
          line_x +
          Math.abs(x - line_x) *
            (start_pos_x >= end_pos_x ? curvature * -1 : curvature);
        hx2 = x - Math.abs(x - line_x) * curvature;
        break;
      case 'other':
        hx1 =
          line_x +
          Math.abs(x - line_x) *
            (start_pos_x >= end_pos_x ? curvature * -1 : curvature);
        hx2 =
          x -
          Math.abs(x - line_x) *
            (start_pos_x >= end_pos_x ? curvature * -1 : curvature);
        break;
      default:
        hx1 = line_x + Math.abs(x - line_x) * curvature;
        hx2 = x - Math.abs(x - line_x) * curvature;
    }

    return `M ${line_x} ${line_y} C ${hx1} ${line_y} ${hx2} ${y} ${x} ${y}`;
  }

  private drawConnection(ele: Element) {
    const connection = htmlToTemplate(html`
      <svg class="connection">
        <path class="main-path" d="" />
      </svg>
    `).content.cloneNode(true) as DocumentFragment;

    this.connection_ele = connection.querySelector('.connection');
    this.precanvas!.appendChild(connection);
    const id_output = ele.parentElement!.parentElement!.id.slice(5);
    const output_class = ele.classList[1];
    this.dispatch('connectionStart', {
      output_id: id_output,
      output_class: output_class,
    });
  }

  private updateConnection(eX: number, eY: number) {
    const precanvas = this.precanvas;
    const zoom = this.zoom;
    let precanvasWitdhZoom =
      precanvas!.clientWidth / (precanvas!.clientWidth * zoom);
    precanvasWitdhZoom = precanvasWitdhZoom || 0;
    let precanvasHeightZoom =
      precanvas!.clientHeight / (precanvas!.clientHeight * zoom);
    precanvasHeightZoom = precanvasHeightZoom || 0;
    var path = this.connection_ele!.children[0];

    var line_x =
      this.ele_selected!.offsetWidth / 2 +
      (this.ele_selected!.getBoundingClientRect().x -
        precanvas!.getBoundingClientRect().x) *
        precanvasWitdhZoom;
    var line_y =
      this.ele_selected!.offsetHeight / 2 +
      (this.ele_selected!.getBoundingClientRect().y -
        precanvas!.getBoundingClientRect().y) *
        precanvasHeightZoom;

    var x =
      eX *
        (this.precanvas!.clientWidth /
          (this.precanvas!.clientWidth * this.zoom)) -
      this.precanvas!.getBoundingClientRect().x *
        (this.precanvas!.clientWidth /
          (this.precanvas!.clientWidth * this.zoom));
    var y =
      eY *
        (this.precanvas!.clientHeight /
          (this.precanvas!.clientHeight * this.zoom)) -
      this.precanvas!.getBoundingClientRect().y *
        (this.precanvas!.clientHeight /
          (this.precanvas!.clientHeight * this.zoom));

    var curvature = this.curvature;
    var lineCurve = this.createCurvature(
      line_x,
      line_y,
      x,
      y,
      curvature,
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
    id_output: string | number,
    id_input: string | number,
    output_class: string,
    input_class: string,
    connection_class: string = ''
  ) {
    const nodeOneModule = this.getModuleFromNodeId(id_output);
    // const nodeTwoModule = this.getModuleFromNodeId(id_input);

    if (nodeOneModule === this.getModuleFromNodeId(id_input)) {
      const dataNode: DrawflowNode = this.getNodeFromId(id_output);

      const exist: boolean = !!dataNode.outputs[output_class]?.connections.find(
        ({ node, output }) => node === id_input && output === input_class
      );

      // for (const {node, output} of dataNode.outputs[output_class].connections) {
      //   // const {node, output} = dataNode.outputs[output_class].connections[checkOutput];
      //   if (node === id_input && output === input_class) {
      //     exist = true;
      //     break;
      //   }
      // }
      // Check connection exist
      if (exist) return;
      //Create Connection
      this.drawflow.drawflow[nodeOneModule].data[id_output].outputs[
        output_class
      ]?.connections.push({
        node: id_input.toString(),
        output: input_class,
        pathClass: connection_class,
      });
      this.drawflow.drawflow[nodeOneModule].data[id_input].inputs[
        input_class
      ]?.connections.push({
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
          >
            <path class="main-path" d="" />
          </svg>
        `).content.cloneNode(true);

        this.precanvas.appendChild(con);
        this.updateConnectionNodes(`node-${id_output}`);
        this.updateConnectionNodes(`node-${id_input}`);
      }

      this.dispatch('connectionCreated', {
        output_id: id_output,
        input_id: id_input,
        output_class: output_class,
        input_class: input_class,
      });
      // }
    }
  }

  /**
   * Update connections position from Node Ex id: node-x
   * @param id
   */
  updateConnectionNodes(id: DrawflowNode['id']): void {
    const idSearchIn = `node_in_${id}`;
    const idSearchOut = `node_out_${id}`;
    const container = this.container;
    const precanvas = this.precanvas!;
    const curvature = this.curvature;
    const reroute_curvature = this.reroute_curvature;
    const reroute_curvature_start_end = this.reroute_curvature_start_end;
    const reroute_fix_curvature = this.reroute_fix_curvature;
    const rerouteWidth = this.reroute_width;
    const zoom = this.zoom;
    const precanvasWitdhZoom =
      precanvas!.clientWidth / (precanvas!.clientWidth * zoom) || 0;
    const precanvasHeightZoom =
      precanvas!.clientHeight / (precanvas!.clientHeight * zoom) || 0;

    // const elemsOut = container.querySelectorAll<SVGElement>(`.${idSearchOut}`);

    const { x: pcX, y: pcY } = precanvas.getBoundingClientRect();

    for (const el of container.querySelectorAll<SVGElement>(
      `.${idSearchOut}`
    )) {
      if (el.querySelector('.point') === null) {
        const id_search = el.dataset.node_in;
        if (!id_search) return;

        const elStart = container.querySelector<HTMLElement>(
          `#${id} .${el.classList[3]}`
        )!;

        if (!elStart) return;

        const elEnd = container.querySelector<HTMLElement>(
          `#${id_search} .${el.classList[4]}`
        );

        if (!elEnd) return;

        const { x: elStartX, y: elStartY } = elEnd.getBoundingClientRect();
        const { x: elEndX, y: elEndY } = elStart.getBoundingClientRect();

        const endX =
          elEnd.offsetWidth / 2 + (elStartX - pcX) * precanvasWitdhZoom;

        const endY =
          elEnd.offsetHeight / 2 + (elStartY - pcY) * precanvasHeightZoom;

        const startX =
          elStart.offsetWidth / 2 + (elEndX - pcX) * precanvasWitdhZoom;

        const startY =
          elStart.offsetHeight / 2 + (elEndY - pcY) * precanvasHeightZoom;

        const lineCurve = this.createCurvature(
          startX,
          startY,
          endX,
          endY,
          curvature,
          'openclose'
        );
        (el.children[0] as SVGPathElement).setAttributeNS(null, 'd', lineCurve);
      } else {
        const points = el.querySelectorAll('.point') as NodeListOf<HTMLElement>;
        let linecurve = '';
        const reoute_fix: string[] = [];

        points.forEach((item, i) => {
          if (i === 0 && points.length - 1 === 0) {
            const { x: elX, y: elY } = item.getBoundingClientRect();
            //
            console.log(item);

            {
              const eX = (elX - pcX) * precanvasWitdhZoom + rerouteWidth;
              const eY = (elY - pcY) * precanvasHeightZoom + rerouteWidth;

              const elemtsearchOut = container.querySelector<HTMLElement>(
                `#${id} .${item.parentElement!.classList[3]}`
              )!;

              const { x: elSearchOutX, y: elSearchOutY } =
                elemtsearchOut.getBoundingClientRect();

              const line_x =
                elemtsearchOut.offsetWidth / 2 +
                (elSearchOutX - pcX) * precanvasWitdhZoom;

              const line_y =
                elemtsearchOut.offsetHeight / 2 +
                (elSearchOutY - pcY) * precanvasHeightZoom;

              const lineCurveSearch = this.createCurvature(
                line_x,
                line_y,
                eX,
                eY,
                reroute_curvature_start_end,
                'open'
              );
              linecurve += lineCurveSearch;
              reoute_fix.push(lineCurveSearch);
            }
            {
              // const elemtsearchId_out = item;
              const id_search = item.parentElement!.classList[1].replace(
                'node_in_',
                ''
              );

              const elemtsearchIn = container.querySelector<HTMLElement>(
                `#${id_search} .${item.parentElement!.classList[4]}`
              )!;

              const { x: elSearchX, y: elSearchY } =
                elemtsearchIn.getBoundingClientRect();

              const eX =
                elemtsearchIn.offsetWidth / 2 +
                (elSearchX - pcX) * precanvasWitdhZoom;

              const eY =
                elemtsearchIn.offsetHeight / 2 +
                (elSearchY - pcY) * precanvasHeightZoom;

              const line_x = (elX - pcX) * precanvasWitdhZoom + rerouteWidth;
              const line_y = (elY - pcY) * precanvasHeightZoom + rerouteWidth;

              const lineCurveSearch = this.createCurvature(
                line_x,
                line_y,
                eX,
                eY,
                reroute_curvature_start_end,
                'close'
              );
              linecurve += lineCurveSearch;
              reoute_fix.push(lineCurveSearch);
            }
          } else if (i === 0) {
            var elemtsearchId_out = container.querySelector(
              `#${id}`
            ) as HTMLElement;
            var elemtsearch = item;

            var eX =
              (elemtsearch.getBoundingClientRect().x -
                precanvas.getBoundingClientRect().x) *
                precanvasWitdhZoom +
              rerouteWidth;
            var eY =
              (elemtsearch.getBoundingClientRect().y -
                precanvas.getBoundingClientRect().y) *
                precanvasHeightZoom +
              rerouteWidth;

            var elemtsearchOut = elemtsearchId_out.querySelectorAll(
              '.' + item.parentElement!.classList[3]
            )[0] as HTMLElement;
            var line_x =
              elemtsearchOut.offsetWidth / 2 +
              (elemtsearchOut.getBoundingClientRect().x -
                precanvas.getBoundingClientRect().x) *
                precanvasWitdhZoom;
            var line_y =
              elemtsearchOut.offsetHeight / 2 +
              (elemtsearchOut.getBoundingClientRect().y -
                precanvas.getBoundingClientRect().y) *
                precanvasHeightZoom;

            var x = eX;
            var y = eY;

            var lineCurveSearch = this.createCurvature(
              line_x,
              line_y,
              x,
              y,
              reroute_curvature_start_end,
              'open'
            );
            linecurve += lineCurveSearch;
            reoute_fix.push(lineCurveSearch);

            // SECOND
            var elemtsearchId_out = item;
            var elemtsearch = points[i + 1];

            var eX =
              (elemtsearch.getBoundingClientRect().x -
                precanvas.getBoundingClientRect().x) *
                precanvasWitdhZoom +
              rerouteWidth;
            var eY =
              (elemtsearch.getBoundingClientRect().y -
                precanvas.getBoundingClientRect().y) *
                precanvasHeightZoom +
              rerouteWidth;
            var line_x =
              (elemtsearchId_out.getBoundingClientRect().x -
                precanvas.getBoundingClientRect().x) *
                precanvasWitdhZoom +
              rerouteWidth;
            var line_y =
              (elemtsearchId_out.getBoundingClientRect().y -
                precanvas.getBoundingClientRect().y) *
                precanvasHeightZoom +
              rerouteWidth;
            var x = eX;
            var y = eY;

            var lineCurveSearch = this.createCurvature(
              line_x,
              line_y,
              x,
              y,
              reroute_curvature,
              'other'
            );
            linecurve += lineCurveSearch;
            reoute_fix.push(lineCurveSearch);
          } else if (i === points.length - 1) {
            var elemtsearchId_out = item;

            var id_search = item.parentElement!.classList[1].replace(
              'node_in_',
              ''
            );
            var elemtsearchId = container.querySelector(
              `#${id_search}`
            ) as HTMLElement;
            var elemtsearch = elemtsearchId.querySelectorAll(
              '.' + item.parentElement!.classList[4]
            )[0] as HTMLElement;

            var elemtsearchIn = elemtsearchId.querySelectorAll(
              '.' + item.parentElement!.classList[4]
            )[0] as HTMLElement;
            var eX =
              elemtsearchIn.offsetWidth / 2 +
              (elemtsearchIn.getBoundingClientRect().x -
                precanvas.getBoundingClientRect().x) *
                precanvasWitdhZoom;
            var eY =
              elemtsearchIn.offsetHeight / 2 +
              (elemtsearchIn.getBoundingClientRect().y -
                precanvas.getBoundingClientRect().y) *
                precanvasHeightZoom;
            var line_x =
              (elemtsearchId_out.getBoundingClientRect().x -
                precanvas.getBoundingClientRect().x) *
                (precanvas.clientWidth / (precanvas.clientWidth * zoom)) +
              rerouteWidth;
            var line_y =
              (elemtsearchId_out.getBoundingClientRect().y -
                precanvas.getBoundingClientRect().y) *
                (precanvas.clientHeight / (precanvas.clientHeight * zoom)) +
              rerouteWidth;
            var x = eX;
            var y = eY;

            var lineCurveSearch = this.createCurvature(
              line_x,
              line_y,
              x,
              y,
              reroute_curvature_start_end,
              'close'
            );
            linecurve += lineCurveSearch;
            reoute_fix.push(lineCurveSearch);
          } else {
            var elemtsearchId_out = item;
            var elemtsearch = points[i + 1];

            var eX =
              (elemtsearch.getBoundingClientRect().x -
                precanvas.getBoundingClientRect().x) *
                (precanvas.clientWidth / (precanvas.clientWidth * zoom)) +
              rerouteWidth;
            var eY =
              (elemtsearch.getBoundingClientRect().y -
                precanvas.getBoundingClientRect().y) *
                (precanvas.clientHeight / (precanvas.clientHeight * zoom)) +
              rerouteWidth;
            var line_x =
              (elemtsearchId_out.getBoundingClientRect().x -
                precanvas.getBoundingClientRect().x) *
                (precanvas.clientWidth / (precanvas.clientWidth * zoom)) +
              rerouteWidth;
            var line_y =
              (elemtsearchId_out.getBoundingClientRect().y -
                precanvas.getBoundingClientRect().y) *
                (precanvas.clientHeight / (precanvas.clientHeight * zoom)) +
              rerouteWidth;
            var x = eX;
            var y = eY;

            var lineCurveSearch = this.createCurvature(
              line_x,
              line_y,
              x,
              y,
              reroute_curvature,
              'other'
            );
            linecurve += lineCurveSearch;
            reoute_fix.push(lineCurveSearch);
          }
        });
        if (reroute_fix_curvature) {
          reoute_fix.forEach((itempath, i) => {
            el.children[i].setAttributeNS(null, 'd', itempath);
          });
        } else {
          el.children[0].setAttributeNS(null, 'd', linecurve);
        }
      }
    }

    // const elemsIn = container.querySelectorAll<SVGElement>(`.${idSearchIn}`);

    for (const el of container.querySelectorAll<SVGElement>(`.${idSearchIn}`)) {
      if (el.querySelector('.point') === null) {
        const elemtsearch = container.querySelector<HTMLElement>(
          `#${el.dataset.node_out} .${el.classList[3]}`
        )!;

        console.log(el, `#${el.dataset.node_out} .${el.classList[3]}`);

        const { x: elX, y: elY } = elemtsearch.getBoundingClientRect();

        const line_x =
          elemtsearch.offsetWidth / 2 + (elX - pcX) * precanvasWitdhZoom;
        const line_y =
          elemtsearch.offsetHeight / 2 + (elY - pcY) * precanvasHeightZoom;

        const elemtsearchId_in = container.querySelectorAll(
          `#${id} .${el.classList[4]}`
        )[0] as HTMLElement;
        const x =
          elemtsearchId_in.offsetWidth / 2 +
          (elemtsearchId_in.getBoundingClientRect().x -
            precanvas.getBoundingClientRect().x) *
            precanvasWitdhZoom;
        const y =
          elemtsearchId_in.offsetHeight / 2 +
          (elemtsearchId_in.getBoundingClientRect().y -
            precanvas.getBoundingClientRect().y) *
            precanvasHeightZoom;

        const lineCurve = this.createCurvature(
          line_x,
          line_y,
          x,
          y,
          curvature,
          'openclose'
        );
        el.children[0].setAttributeNS(null, 'd', lineCurve);
      } else {
        const points = el.querySelectorAll<HTMLElement>('.point');
        let linecurve = '';
        const reoute_fix: string[] = [];
        points.forEach((item, i) => {
          if (i === 0 && points.length - 1 === 0) {
            var elemtsearchId_out = container.querySelector(
              `#${id}`
            ) as HTMLElement;
            var elemtsearch = item;

            var line_x =
              (elemtsearch.getBoundingClientRect().x -
                precanvas.getBoundingClientRect().x) *
                precanvasWitdhZoom +
              rerouteWidth;
            var line_y =
              (elemtsearch.getBoundingClientRect().y -
                precanvas.getBoundingClientRect().y) *
                precanvasHeightZoom +
              rerouteWidth;

            var elemtsearchIn = elemtsearchId_out.querySelectorAll(
              '.' + item.parentElement!.classList[4]
            )[0] as HTMLElement;
            var eX =
              elemtsearchIn.offsetWidth / 2 +
              (elemtsearchIn.getBoundingClientRect().x -
                precanvas.getBoundingClientRect().x) *
                precanvasWitdhZoom;
            var eY =
              elemtsearchIn.offsetHeight / 2 +
              (elemtsearchIn.getBoundingClientRect().y -
                precanvas.getBoundingClientRect().y) *
                precanvasHeightZoom;

            var x = eX;
            var y = eY;

            var lineCurveSearch = this.createCurvature(
              line_x,
              line_y,
              x,
              y,
              reroute_curvature_start_end,
              'close'
            );
            linecurve += lineCurveSearch;
            reoute_fix.push(lineCurveSearch);

            var elemtsearchId_out = item;
            var id_search = item.parentElement!.classList[2].replace(
              'node_out_',
              ''
            );
            var elemtsearchId = container.querySelector(
              `#${id_search}`
            ) as HTMLElement;
            var elemtsearch = elemtsearchId.querySelectorAll(
              '.' + item.parentElement!.classList[3]
            )[0] as HTMLElement;

            var elemtsearchOut = elemtsearchId.querySelectorAll(
              '.' + item.parentElement!.classList[3]
            )[0] as HTMLElement;
            var line_x =
              elemtsearchOut.offsetWidth / 2 +
              (elemtsearchOut.getBoundingClientRect().x -
                precanvas.getBoundingClientRect().x) *
                precanvasWitdhZoom;
            var line_y =
              elemtsearchOut.offsetHeight / 2 +
              (elemtsearchOut.getBoundingClientRect().y -
                precanvas.getBoundingClientRect().y) *
                precanvasHeightZoom;

            var eX =
              (elemtsearchId_out.getBoundingClientRect().x -
                precanvas.getBoundingClientRect().x) *
                precanvasWitdhZoom +
              rerouteWidth;
            var eY =
              (elemtsearchId_out.getBoundingClientRect().y -
                precanvas.getBoundingClientRect().y) *
                precanvasHeightZoom +
              rerouteWidth;
            var x = eX;
            var y = eY;

            var lineCurveSearch = this.createCurvature(
              line_x,
              line_y,
              x,
              y,
              reroute_curvature_start_end,
              'open'
            );
            linecurve += lineCurveSearch;
            reoute_fix.push(lineCurveSearch);
          } else if (i === 0) {
            // FIRST
            var elemtsearchId_out = item;
            var id_search = item.parentElement!.classList[2].replace(
              'node_out_',
              ''
            );
            var elemtsearchId = container.querySelector<HTMLElement>(
              `#${id_search}`
            )!;
            var elemtsearch = elemtsearchId.querySelectorAll<HTMLElement>(
              '.' + item.parentElement!.classList[3]
            )[0];
            var elemtsearchOut = elemtsearchId.querySelectorAll<HTMLElement>(
              '.' + item.parentElement!.classList[3]
            )[0];
            var line_x =
              elemtsearchOut.offsetWidth / 2 +
              (elemtsearchOut.getBoundingClientRect().x -
                precanvas.getBoundingClientRect().x) *
                precanvasWitdhZoom;
            var line_y =
              elemtsearchOut.offsetHeight / 2 +
              (elemtsearchOut.getBoundingClientRect().y -
                precanvas.getBoundingClientRect().y) *
                precanvasHeightZoom;

            var eX =
              (elemtsearchId_out.getBoundingClientRect().x -
                precanvas.getBoundingClientRect().x) *
                precanvasWitdhZoom +
              rerouteWidth;
            var eY =
              (elemtsearchId_out.getBoundingClientRect().y -
                precanvas.getBoundingClientRect().y) *
                precanvasHeightZoom +
              rerouteWidth;
            var x = eX;
            var y = eY;

            var lineCurveSearch = this.createCurvature(
              line_x,
              line_y,
              x,
              y,
              reroute_curvature_start_end,
              'open'
            );
            linecurve += lineCurveSearch;
            reoute_fix.push(lineCurveSearch);

            // SECOND
            var elemtsearchId_out = item;
            var elemtsearch = points[i + 1];

            var eX =
              (elemtsearch.getBoundingClientRect().x -
                precanvas.getBoundingClientRect().x) *
                precanvasWitdhZoom +
              rerouteWidth;
            var eY =
              (elemtsearch.getBoundingClientRect().y -
                precanvas.getBoundingClientRect().y) *
                precanvasHeightZoom +
              rerouteWidth;
            var line_x =
              (elemtsearchId_out.getBoundingClientRect().x -
                precanvas.getBoundingClientRect().x) *
                precanvasWitdhZoom +
              rerouteWidth;
            var line_y =
              (elemtsearchId_out.getBoundingClientRect().y -
                precanvas.getBoundingClientRect().y) *
                precanvasHeightZoom +
              rerouteWidth;
            var x = eX;
            var y = eY;

            var lineCurveSearch = this.createCurvature(
              line_x,
              line_y,
              x,
              y,
              reroute_curvature,
              'other'
            );
            linecurve += lineCurveSearch;
            reoute_fix.push(lineCurveSearch);
          } else if (i === points.length - 1) {
            var elemtsearchId_out = item;

            var id_search = item.parentElement!.classList[1].replace(
              'node_in_',
              ''
            );
            var elemtsearchId = container.querySelector<HTMLElement>(
              `#${id_search}`
            )!;
            var elemtsearch = elemtsearchId.querySelectorAll<HTMLElement>(
              '.' + item.parentElement!.classList[4]
            )[0];

            var elemtsearchIn = elemtsearchId.querySelectorAll<HTMLElement>(
              '.' + item.parentElement!.classList[4]
            )[0];
            var eX =
              elemtsearchIn.offsetWidth / 2 +
              (elemtsearchIn.getBoundingClientRect().x -
                precanvas.getBoundingClientRect().x) *
                precanvasWitdhZoom;
            var eY =
              elemtsearchIn.offsetHeight / 2 +
              (elemtsearchIn.getBoundingClientRect().y -
                precanvas.getBoundingClientRect().y) *
                precanvasHeightZoom;

            var line_x =
              (elemtsearchId_out.getBoundingClientRect().x -
                precanvas.getBoundingClientRect().x) *
                precanvasWitdhZoom +
              rerouteWidth;
            var line_y =
              (elemtsearchId_out.getBoundingClientRect().y -
                precanvas.getBoundingClientRect().y) *
                precanvasHeightZoom +
              rerouteWidth;
            var x = eX;
            var y = eY;

            var lineCurveSearch = this.createCurvature(
              line_x,
              line_y,
              x,
              y,
              reroute_curvature_start_end,
              'close'
            );
            linecurve += lineCurveSearch;
            reoute_fix.push(lineCurveSearch);
          } else {
            var elemtsearchId_out = item;
            var elemtsearch = points[i + 1];

            var eX =
              (elemtsearch.getBoundingClientRect().x -
                precanvas.getBoundingClientRect().x) *
                precanvasWitdhZoom +
              rerouteWidth;
            var eY =
              (elemtsearch.getBoundingClientRect().y -
                precanvas.getBoundingClientRect().y) *
                precanvasHeightZoom +
              rerouteWidth;
            var line_x =
              (elemtsearchId_out.getBoundingClientRect().x -
                precanvas.getBoundingClientRect().x) *
                precanvasWitdhZoom +
              rerouteWidth;
            var line_y =
              (elemtsearchId_out.getBoundingClientRect().y -
                precanvas.getBoundingClientRect().y) *
                precanvasHeightZoom +
              rerouteWidth;
            var x = eX;
            var y = eY;

            var lineCurveSearch = this.createCurvature(
              line_x,
              line_y,
              x,
              y,
              reroute_curvature,
              'other'
            );
            linecurve += lineCurveSearch;
            reoute_fix.push(lineCurveSearch);
          }
        });
        if (reroute_fix_curvature) {
          reoute_fix.forEach((itempath, i) => {
            el.children[i].setAttributeNS(null, 'd', itempath);
          });
        } else {
          el.children[0].setAttributeNS(null, 'd', linecurve);
        }
      }
    }
  }

  private dblclick(e: MouseEvent) {
    if (this.connection_selected != null && this.reroute) {
      this.createReroutePoint(this.connection_selected);
    }

    if ((e.target as HTMLElement).classList[0] === 'point') {
      this.removeReroutePoint(e.target as HTMLElement);
    }
  }

  private createReroutePoint(ele: HTMLElement | SVGElement) {
    this.connection_selected!.classList.remove('selected');
    const nodeUpdate =
      this.connection_selected!.parentElement!.classList[2].slice(9);
    const nodeUpdateIn =
      this.connection_selected!.parentElement!.classList[1].slice(13);
    const output_class = this.connection_selected!.parentElement!.classList[3];
    const input_class = this.connection_selected!.parentElement!.classList[4];
    this.connection_selected = null;
    const point = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'circle'
    );
    point.classList.add('point');
    var pos_x =
      this.pos_x *
        (this.precanvas!.clientWidth /
          (this.precanvas!.clientWidth * this.zoom)) -
      this.precanvas!.getBoundingClientRect().x *
        (this.precanvas!.clientWidth /
          (this.precanvas!.clientWidth * this.zoom));
    var pos_y =
      this.pos_y *
        (this.precanvas!.clientHeight /
          (this.precanvas!.clientHeight * this.zoom)) -
      this.precanvas!.getBoundingClientRect().y *
        (this.precanvas!.clientHeight /
          (this.precanvas!.clientHeight * this.zoom));

    point.setAttributeNS(null, 'cx', pos_x.toString());
    point.setAttributeNS(null, 'cy', pos_y.toString());
    point.setAttributeNS(null, 'r', this.reroute_width.toString());

    let position_add_array_point = 0;
    if (this.reroute_fix_curvature) {
      const numberPoints =
        ele.parentElement!.querySelectorAll('.main-path').length;
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.classList.add('main-path');
      path.setAttributeNS(null, 'd', '');

      ele.parentElement!.insertBefore(
        path,
        ele.parentElement!.children[numberPoints]
      );
      if (numberPoints === 1) {
        ele.parentElement!.appendChild(point);
      } else {
        const search_point = Array.from(ele.parentElement!.children).indexOf(
          ele
        );
        position_add_array_point = search_point;
        ele.parentElement!.insertBefore(
          point,
          ele.parentElement!.children[search_point + numberPoints + 1]
        );
      }
    } else {
      ele.parentElement!.appendChild(point);
    }

    const nodeId = nodeUpdate.slice(5);
    const searchConnection = this.drawflow.drawflow[this.module].data[
      nodeId
    ].outputs[output_class].connections.findIndex(function (item, i) {
      return item.node === nodeUpdateIn && item.output === input_class;
    });

    if (
      this.drawflow.drawflow[this.module].data[nodeId].outputs[output_class]
        .connections[searchConnection].points === undefined
    ) {
      this.drawflow.drawflow[this.module].data[nodeId].outputs[
        output_class
      ].connections[searchConnection].points = [];
    }

    if (this.reroute_fix_curvature) {
      if (
        position_add_array_point > 0 ||
        !!this.drawflow.drawflow[this.module].data[nodeId].outputs[output_class]
          .connections[searchConnection].points?.length
      ) {
        this.drawflow.drawflow[this.module].data[nodeId].outputs[
          output_class
        ].connections[searchConnection].points?.splice(
          position_add_array_point,
          0,
          { pos_x: pos_x, pos_y: pos_y }
        );
      } else {
        this.drawflow.drawflow[this.module].data[nodeId].outputs[
          output_class
        ].connections[searchConnection].points?.push({
          pos_x: pos_x,
          pos_y: pos_y,
        });
      }

      ele.parentElement!.querySelectorAll('.main-path').forEach((item, i) => {
        item.classList.remove('selected');
      });
    } else {
      this.drawflow.drawflow[this.module].data[nodeId].outputs[
        output_class
      ].connections[searchConnection].points?.push({
        pos_x: pos_x,
        pos_y: pos_y,
      });
    }

    this.dispatch('addReroute', nodeId);
    this.updateConnectionNodes(nodeUpdate);
  }

  private removeReroutePoint(ele: HTMLElement) {
    const nodeUpdate = ele.parentElement!.classList[2].slice(9);
    const nodeUpdateIn = ele.parentElement!.classList[1].slice(13);
    const output_class = ele.parentElement!.classList[3];
    const input_class = ele.parentElement!.classList[4];

    let numberPointPosition = Array.from(ele.parentElement!.children).indexOf(
      ele
    );
    const nodeId = nodeUpdate.slice(5);
    const searchConnection = this.drawflow.drawflow[this.module].data[
      nodeId
    ].outputs[output_class].connections.findIndex(function (item, i) {
      return item.node === nodeUpdateIn && item.output === input_class;
    });

    if (this.reroute_fix_curvature) {
      const numberMainPath =
        ele.parentElement!.querySelectorAll('.main-path').length;
      ele.parentElement!.children[numberMainPath - 1].remove();
      numberPointPosition -= numberMainPath;
      if (numberPointPosition < 0) {
        numberPointPosition = 0;
      }
    } else {
      numberPointPosition--;
    }
    this.drawflow.drawflow[this.module].data[nodeId].outputs[
      output_class
    ].connections[searchConnection].points?.splice(numberPointPosition, 1);

    ele.remove();
    this.dispatch('removeReroute', nodeId);
    this.updateConnectionNodes(nodeUpdate);
  }

  /**
   *
   * @param name Name of module registered.
   * @param component HTML to drawn or vue component.
   * @param props Only for vue. Props of component. Not Required
   * @param options Only for vue. Options of component. Not Required
   */
  registerNode(name: string, component: any): void;
  registerNode(
    name: string,
    component: any,
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

  /**
   * Get Info of node. Ex: id: 5
   */
  getNodeFromId(id: string | number): DrawflowNode {
    const moduleName = this.getModuleFromNodeId(id);
    return JSON.parse(
      JSON.stringify(this.drawflow.drawflow[moduleName].data[id])
    );
  }

  /**
   *  Return Array of nodes id. Ex: name: telegram
   */
  getNodesFromName(name: string): DrawflowNode['id'][] {
    const nodes: DrawflowNode['id'][] = [];
    const editor = this.drawflow.drawflow;
    Object.keys(editor).map((moduleName) => {
      for (const node in editor[moduleName].data) {
        if (editor[moduleName].data[node].name == name) {
          nodes.push(editor[moduleName].data[node].id);
        }
      }
    });
    return nodes;
  }

  protected renderNodeFirstTime(
    dataNode: DrawflowNode,
    precanvas: HTMLElement
  ) {
    const template = html`
      <div class="parent-node">
        <div
          id="node-${dataNode.id}"
          class="drawflow-node ${dataNode.class || ''}"
          style="
          --top: ${dataNode.pos_y}px;
          --left: ${dataNode.pos_x}px;
          top: calc(var(--top, 0px) + var(--y, 0px));
          left: calc(var(--left, 0px) + var(--x, 0px));
        "
        >
          <div class="inputs">
            ${Object.keys(dataNode.inputs)
              .map(
                (input_item) => html` <div class="input ${input_item}"></div> `
              )
              .join('')}
          </div>
          <div class="drawflow_content_node"></div>
          <div class="outputs">
            ${Object.keys(dataNode.outputs)
              .map(
                (output_item) =>
                  html` <div class="output ${output_item}"></div> `
              )
              .join('')}
          </div>
        </div>
      </div>
    `;

    const parent = htmlToTemplate(template).content.cloneNode(
      true
    ) as DocumentFragment;

    const content = parent.querySelector<HTMLDivElement>(
      `#node-${dataNode.id} .drawflow_content_node`
    )!;

    if (dataNode.typenode === false) {
      content.innerHTML = dataNode.html;
    } else if (dataNode.typenode === true) {
      const { html: template } = this.noderegister[dataNode.html];

      if (!(template instanceof Element))
        throw new TypeError('html must be instace of Element');

      const nodeTree =
        template instanceof HTMLTemplateElement ? template.content : template;

      content.appendChild(nodeTree.cloneNode(true));
    }

    precanvas.appendChild(parent);

    if (dataNode.typenode === 'vue') {
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

    // Object.entries(dataNode.data).forEach(function ([key, value]) {
    //   if (value === null) return;

    //   if (typeof value === 'object' && value !== null) {
    //     insertObjectkeys(value as DrawflowNode['data'], key, key);
    //   } else {
    //     const elems = content.querySelectorAll<HTMLInputElement>(`[df-${key}]`);

    //     for (const el of elems) {
    //       el.value = value as string;
    //       if (el.isContentEditable) {
    //         el.innerText = value as string;
    //       }
    //     }
    //   }
    // });

    // // // TODO: revisar
    // const insertObjectkeys = (
    //   _object: DrawflowNode['data'],
    //   name: string,
    //   completname: string
    // ) => {
    //   const object = _object[name];

    //   if (object === null) return;

    //   if (typeof object === 'object') {
    //     for (const [key, value] of Object.entries(object)) {
    //       if (typeof value === 'object') {
    //         insertObjectkeys(
    //           object as DrawflowNode['data'],
    //           key,
    //           `${completname}-${key}`
    //         );
    //       } else {
    //         const elems = content.querySelectorAll<HTMLInputElement>(
    //           `[df-${completname}-${key}]`
    //         );

    //         for (const el of elems) {
    //           el.value = value as string;
    //           if (el.isContentEditable) {
    //             el.innerText = value as string;
    //           }
    //         }
    //       }
    //     }
    //   }
    // };
    // node.appendChild(inputs);
    // node.appendChild(content);
    // node.appendChild(outputs);

    // node.style.setProperty('--top', `${dataNode.pos_y}px`);
    // node.style.setProperty('--left', `${dataNode.pos_x}px`);

    // node.style.top = `calc(var(--top, 0px) + var(--y, 0px))`;
    // node.style.left = `calc(var(--left, 0px) + var(--x, 0px))`;

    // parent.appendChild(node);

    // precanvas.appendChild(parent);
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
    typenode: DrawflowNode['typenode']
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
          typenode: DrawflowNode['typenode']
        ]
  ): DrawflowNode['id'] {
    const newNodeId: string | number = this.useuuid
      ? this.getUuid()
      : this.nodeId++;

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
      ] = args;

      if (typenode === true && !(html in this.noderegister))
        throw new RangeError(`node ${html} not found!`);

      const json_inputs: DrawflowNode['inputs'] = {};
      for (let x = 0; x < num_in; x++) {
        json_inputs[`input_${x + 1}`] = { connections: [] };
      }

      const json_outputs: DrawflowNode['outputs'] = {};
      for (let x = 0; x < num_out; x++) {
        json_outputs[`output_${x + 1}`] = { connections: [] };
      }

      json = {
        id: newNodeId,
        name,
        data,
        class: classoverride,
        html,
        typenode,
        inputs: json_inputs,
        outputs: json_outputs,
        pos_x: ele_pos_x,
        pos_y: ele_pos_y,
      };
    }

    if (this.precanvas) this.renderNodeFirstTime(json, this.precanvas);
    this.drawflow.drawflow[this.module].data[newNodeId] = json;
    this.dispatch('nodeCreated', newNodeId);

    return newNodeId;
  }

  private addNodeImport(dataNode: DrawflowNode, precanvas: HTMLElement) {
    this.renderNodeFirstTime(dataNode, precanvas);
  }

  private addRerouteImport(dataNode: DrawflowNode) {
    const reroute_width = this.reroute_width;
    const reroute_fix_curvature = this.reroute_fix_curvature;
    const container = this.container;
    Object.keys(dataNode.outputs).map(function (output_item: any, index) {
      Object.keys(dataNode.outputs[output_item].connections).map(function (
        input_item: any,
        index
      ) {
        const points =
          dataNode.outputs[output_item].connections[input_item].points;
        if (points !== undefined) {
          points.forEach((item, i) => {
            const input_id =
              dataNode.outputs[output_item].connections[input_item].node;
            const input_class =
              dataNode.outputs[output_item].connections[input_item].output;
            const ele = container.querySelector(
              '.connection.node_in_node-' +
                input_id +
                '.node_out_node-' +
                dataNode.id +
                '.' +
                output_item +
                '.' +
                input_class
            );

            if (reroute_fix_curvature) {
              if (i === 0) {
                for (var z = 0; z < points.length; z++) {
                  var path = document.createElementNS(
                    'http://www.w3.org/2000/svg',
                    'path'
                  );
                  path.classList.add('main-path');
                  path.setAttributeNS(null, 'd', '');
                  ele!.appendChild(path);
                }
              }
            }

            const point = document.createElementNS(
              'http://www.w3.org/2000/svg',
              'circle'
            );
            point.classList.add('point');
            var pos_x = item.pos_x;
            var pos_y = item.pos_y;

            point.setAttributeNS(null, 'cx', pos_x.toString());
            point.setAttributeNS(null, 'cy', pos_y.toString());
            point.setAttributeNS(null, 'r', reroute_width.toString());

            ele!.appendChild(point);
          });
        }
      });
    });
  }

  private updateNodeValue(event: Event) {
    var attr = (event.target as HTMLElement).attributes;
    for (var i = 0; i < attr.length; i++) {
      if (attr[i].nodeName.startsWith('df-')) {
        var keys = attr[i].nodeName.slice(3).split('-');
        var target =
          this.drawflow.drawflow[this.module].data[
            (event.target as HTMLElement)
              .closest('.drawflow_content_node')!
              .parentElement!.id.slice(5)
          ].data;
        for (var index = 0; index < keys.length - 1; index += 1) {
          if (target[keys[index]] == null) {
            target[keys[index]] = {};
          }
          target = target[keys[index]] as any;
        }
        target[keys[keys.length - 1]] = (
          event.target as HTMLInputElement
        ).value;
        if ((event.target as HTMLElement).isContentEditable) {
          target[keys[keys.length - 1]] = (
            event.target as HTMLElement
          ).innerText;
        }
        this.dispatch(
          'nodeDataChanged',
          (event.target as HTMLElement)
            .closest('.drawflow_content_node')!
            .parentElement!.id.slice(5)
        );
      }
    }
  }

  /**
   * Update data element. Ex: 5, { name: 'Drawflow' }
   * @param id
   * @param data
   */
  updateNodeDataFromId(id: string | number, data: any): void {
    var moduleName = this.getModuleFromNodeId(id);
    this.drawflow.drawflow[moduleName].data[id].data = data;
    if (this.module === moduleName) {
      const content = this.container.querySelector('#node-' + id);

      Object.entries(data).forEach(function (key, value) {
        if (typeof key[1] === 'object') {
          insertObjectkeys(null, key[0], key[0]);
        } else {
          var elems = content!.querySelectorAll<HTMLInputElement>(
            '[df-' + key[0] + ']'
          );
          for (var i = 0; i < elems.length; i++) {
            elems[i].value = key[1] as string;
            if (elems[i].isContentEditable) {
              elems[i].innerText = key[1] as string;
            }
          }
        }
      });

      const insertObjectkeys = (
        object: any,
        name: string,
        completname: string
      ) => {
        if (object === null) {
          var object = data[name];
        } else {
          var object = object[name];
        }
        if (object !== null) {
          Object.entries(object).forEach(function (key, value) {
            if (typeof key[1] === 'object') {
              insertObjectkeys(object, key[0], completname + '-' + key[0]);
            } else {
              var elems = content!.querySelectorAll<HTMLInputElement>(
                '[df-' + completname + '-' + key[0] + ']'
              );
              for (var i = 0; i < elems.length; i++) {
                elems[i].value = key[1] as string;
                if (elems[i].isContentEditable) {
                  elems[i].innerText = key[1] as string;
                }
              }
            }
          });
        }
      };
    }
  }

  /**
   * Add input to node. Ex id: 5
   * @param id
   */
  addNodeInput(id: string | number): void {
    var moduleName = this.getModuleFromNodeId(id);
    const infoNode = this.getNodeFromId(id);
    const numInputs = Object.keys(infoNode.inputs).length;
    if (this.module === moduleName) {
      //Draw input
      const input = document.createElement('div');
      input.classList.add('input');
      input.classList.add('input_' + (numInputs + 1));
      const parent = this.container.querySelector('#node-' + id + ' .inputs');
      parent?.appendChild(input);
      this.updateConnectionNodes('node-' + id);
    }
    this.drawflow.drawflow[moduleName].data[id].inputs[
      'input_' + (numInputs + 1)
    ] = { connections: [] };
  }

  /**
   * Add output to node. Ex id: 5
   * @param id
   */
  addNodeOutput(id: string | number): void {
    var moduleName = this.getModuleFromNodeId(id);
    const infoNode = this.getNodeFromId(id);
    const numOutputs = Object.keys(infoNode.outputs).length;
    if (this.module === moduleName) {
      //Draw output
      const output = document.createElement('div');
      output.classList.add('output');
      output.classList.add('output_' + (numOutputs + 1));
      const parent = this.container.querySelector('#node-' + id + ' .outputs');
      parent?.appendChild(output);
      this.updateConnectionNodes('node-' + id);
    }
    this.drawflow.drawflow[moduleName].data[id].outputs[
      'output_' + (numOutputs + 1)
    ] = { connections: [] };
  }

  /**
   * Remove input to node. Ex id: 5, input_2
   * @param id
   * @param input_class
   */
  removeNodeInput(id: string | number, input_class: string): void {
    var moduleName = this.getModuleFromNodeId(id);
    const infoNode = this.getNodeFromId(id);
    if (this.module === moduleName) {
      this.container
        .querySelector('#node-' + id + ' .inputs .input.' + input_class)
        ?.remove();
    }
    const removeInputs: any[] = [];
    Object.keys(infoNode.inputs[input_class].connections).map(function (
      key,
      index
    ) {
      const id_output = infoNode.inputs[input_class].connections[index].node;
      const output_class =
        infoNode.inputs[input_class].connections[index].input;
      removeInputs.push({ id_output, id, output_class, input_class });
    });
    // Remove connections
    removeInputs.forEach((item, i) => {
      this.removeSingleConnection(
        item.id_output,
        item.id,
        item.output_class,
        item.input_class
      );
    });

    delete this.drawflow.drawflow[moduleName].data[id].inputs[input_class];

    // Update connection
    const connections: DrawflowConnection[] = [];
    const connectionsInputs =
      this.drawflow.drawflow[moduleName].data[id].inputs;
    Object.keys(connectionsInputs).map(function (key, index) {
      connections.push(connectionsInputs[key]);
    });
    this.drawflow.drawflow[moduleName].data[id].inputs = {};
    const input_class_id = input_class.slice(6);
    let nodeUpdates: DrawflowConnectionDetail[] = [];
    connections.forEach((item, i) => {
      item.connections.forEach((itemx, f) => {
        nodeUpdates.push(itemx);
      });
      this.drawflow.drawflow[moduleName].data[id].inputs['input_' + (i + 1)] =
        item;
    });
    nodeUpdates = [...new Set(nodeUpdates.map((e) => JSON.stringify(e)))].map(
      (e) => JSON.parse(e)
    );

    if (this.module === moduleName) {
      const eles = this.container.querySelectorAll(
        '#node-' + id + ' .inputs .input'
      );
      eles.forEach((item, i) => {
        const id_class = item.classList[1].slice(6);
        if (parseInt(input_class_id) < parseInt(id_class)) {
          item.classList.remove('input_' + id_class);
          item.classList.add('input_' + (+id_class - 1));
        }
      });
    }

    nodeUpdates.forEach((itemx, i) => {
      this.drawflow.drawflow[moduleName].data[itemx.node].outputs[
        itemx.input!
      ].connections.forEach((itemz, g) => {
        if (itemz.node == id) {
          const output_id = itemz.output!.slice(6);
          if (parseInt(input_class_id) < parseInt(output_id)) {
            if (this.module === moduleName) {
              const ele = this.container.querySelector(
                '.connection.node_in_node-' +
                  id +
                  '.node_out_node-' +
                  itemx.node +
                  '.' +
                  itemx.input +
                  '.input_' +
                  output_id
              );
              ele!.classList.remove('input_' + output_id);
              ele!.classList.add('input_' + (+output_id - 1));
            }
            if (itemz.points) {
              this.drawflow.drawflow[moduleName].data[itemx.node].outputs[
                itemx.input!
              ].connections[g] = {
                node: itemz.node,
                output: 'input_' + (+output_id - 1),
                points: itemz.points,
              };
            } else {
              this.drawflow.drawflow[moduleName].data[itemx.node].outputs[
                itemx.input!
              ].connections[g] = {
                node: itemz.node,
                output: 'input_' + (+output_id - 1),
              };
            }
          }
        }
      });
    });
    this.updateConnectionNodes('node-' + id);
  }

  /**
   * Remove output to node. Ex id: 5, output_2
   * @param id
   * @param output_class
   */
  removeNodeOutput(id: string | number, output_class: string): void {
    var moduleName = this.getModuleFromNodeId(id);
    const infoNode = this.getNodeFromId(id);
    if (this.module === moduleName) {
      this.container
        .querySelector(`#node-${id} .outputs .output.${output_class}`)
        ?.remove();
    }
    const removeOutputs: any[] = [];
    Object.keys(infoNode.outputs[output_class].connections).map(function (
      key,
      index
    ) {
      const id_input = infoNode.outputs[output_class].connections[index].node;
      const input_class =
        infoNode.outputs[output_class].connections[index].output;
      removeOutputs.push({ id, id_input, output_class, input_class });
    });
    // Remove connections
    removeOutputs.forEach((item, i) => {
      this.removeSingleConnection(
        item.id,
        item.id_input,
        item.output_class,
        item.input_class
      );
    });

    delete this.drawflow.drawflow[moduleName].data[id].outputs[output_class];

    // Update connection
    const connections: DrawflowConnection[] = [];
    const connectionsOuputs =
      this.drawflow.drawflow[moduleName].data[id].outputs;
    Object.keys(connectionsOuputs).map(function (key, index) {
      connections.push(connectionsOuputs[key]);
    });
    this.drawflow.drawflow[moduleName].data[id].outputs = {};
    const output_class_id = output_class.slice(7);
    let nodeUpdates: DrawflowConnectionDetail[] = [];
    connections.forEach((item, i) => {
      item.connections.forEach((itemx, f) => {
        nodeUpdates.push({ node: itemx.node, output: itemx.output });
      });
      this.drawflow.drawflow[moduleName].data[id].outputs['output_' + (i + 1)] =
        item;
    });
    nodeUpdates = [...new Set(nodeUpdates.map((e) => JSON.stringify(e)))].map(
      (e) => JSON.parse(e)
    );

    if (this.module === moduleName) {
      const eles = this.container.querySelectorAll(
        '#node-' + id + ' .outputs .output'
      );
      eles.forEach((item, i) => {
        const id_class = item.classList[1].slice(7);
        if (parseInt(output_class_id) < parseInt(id_class)) {
          item.classList.remove('output_' + id_class);
          item.classList.add('output_' + (+id_class - 1));
        }
      });
    }

    nodeUpdates.forEach((itemx, i) => {
      this.drawflow.drawflow[moduleName].data[itemx.node].inputs[
        itemx.output!
      ].connections.forEach((itemz, g) => {
        if (itemz.node == id) {
          const input_id = itemz.input!.slice(7);
          if (parseInt(output_class_id) < parseInt(input_id)) {
            if (this.module === moduleName) {
              const ele = this.container.querySelector(
                '.connection.node_in_node-' +
                  itemx.node +
                  '.node_out_node-' +
                  id +
                  '.output_' +
                  input_id +
                  '.' +
                  itemx.output
              );
              ele!.classList.remove('output_' + input_id);
              ele!.classList.remove(itemx.output!);
              ele!.classList.add('output_' + (+input_id - 1));
              ele!.classList.add(itemx.output!);
            }
            if (itemz.points) {
              this.drawflow.drawflow[moduleName].data[itemx.node].inputs[
                itemx.output!
              ].connections[g] = {
                node: itemz.node,
                input: 'output_' + (+input_id - 1),
                points: itemz.points,
              };
            } else {
              this.drawflow.drawflow[moduleName].data[itemx.node].inputs[
                itemx.output!
              ].connections[g] = {
                node: itemz.node,
                input: 'output_' + (+input_id - 1),
              };
            }
          }
        }
      });
    });

    this.updateConnectionNodes('node-' + id);
  }

  /**
   * Remove node. Ex id: node-x
   */
  removeNodeId(id: string | number): void {
    this.removeConnectionNodeId(id);
    var moduleName = this.getModuleFromNodeId(id.toString().slice(5));
    if (this.module === moduleName) {
      this.container.querySelector(`#${id}`)?.remove();
    }
    delete this.drawflow.drawflow[moduleName].data[id.toString().slice(5)];
    this.dispatch('nodeRemoved', id.toString().slice(5));
  }

  private removeConnection() {
    if (this.connection_selected != null) {
      var listclass = this.connection_selected!.parentElement!.classList;
      this.connection_selected.parentElement!.remove();
      //console.log(listclass);
      var index_out = this.drawflow.drawflow[this.module].data[
        listclass[2].slice(14)
      ].outputs[listclass[3]].connections.findIndex(function (item, i) {
        return (
          item.node === listclass[1].slice(13) && item.output === listclass[4]
        );
      });
      this.drawflow.drawflow[this.module].data[listclass[2].slice(14)].outputs[
        listclass[3]
      ].connections.splice(index_out, 1);

      var index_in = this.drawflow.drawflow[this.module].data[
        listclass[1].slice(13)
      ].inputs[listclass[4]].connections.findIndex(function (item, i) {
        return (
          item.node === listclass[2].slice(14) && item.input === listclass[3]
        );
      });
      this.drawflow.drawflow[this.module].data[listclass[1].slice(13)].inputs[
        listclass[4]
      ].connections.splice(index_in, 1);
      this.dispatch('connectionRemoved', {
        output_id: listclass[2].slice(14),
        input_id: listclass[1].slice(13),
        output_class: listclass[3],
        input_class: listclass[4],
      });
      this.connection_selected = null;
    }
  }

  /**
   * Remove connection. Ex: 15,16,'output_1','input_1'
   * @param id_output
   * @param id_input
   * @param output_class
   * @param input_class
   */
  removeSingleConnection(
    id_output: string | number,
    id_input: string | number,
    output_class: string,
    input_class: string
  ): boolean {
    var nodeOneModule = this.getModuleFromNodeId(id_output);
    var nodeTwoModule = this.getModuleFromNodeId(id_input);
    if (nodeOneModule === nodeTwoModule) {
      // Check nodes in same module.

      // Check connection exist
      var exists = this.drawflow.drawflow[nodeOneModule].data[
        id_output
      ].outputs[output_class].connections.findIndex(function (item, i) {
        return item.node == id_input && item.output === input_class;
      });
      if (exists > -1) {
        if (this.module === nodeOneModule) {
          // In same module with view.
          this.container
            ?.querySelector(
              `.connection.node_in_node-${id_input}.node_out_node-${id_output}.${output_class}.${input_class}`
            )
            ?.remove();
        }

        var index_out = this.drawflow.drawflow[nodeOneModule].data[
          id_output
        ].outputs[output_class].connections.findIndex(function (item, i) {
          return item.node == id_input && item.output === input_class;
        });
        this.drawflow.drawflow[nodeOneModule].data[id_output].outputs[
          output_class
        ].connections.splice(index_out, 1);

        var index_in = this.drawflow.drawflow[nodeOneModule].data[
          id_input
        ].inputs[input_class].connections.findIndex(function (item, i) {
          return item.node == id_output && item.input === output_class;
        });
        this.drawflow.drawflow[nodeOneModule].data[id_input].inputs[
          input_class
        ].connections.splice(index_in, 1);

        this.dispatch('connectionRemoved', {
          output_id: id_output,
          input_id: id_input,
          output_class: output_class,
          input_class: input_class,
        });
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }

  /**
   * Remove node connections. Ex id: node-x
   * @param id
   */
  removeConnectionNodeId(id: string | number): void {
    const idSearchIn = 'node_in_' + id;
    const idSearchOut = 'node_out_' + id;

    const elemsOut = this.container.querySelectorAll(`.${idSearchOut}`);
    for (var i = elemsOut.length - 1; i >= 0; i--) {
      var listclass = elemsOut[i].classList;

      var index_in = this.drawflow.drawflow[this.module].data[
        listclass[1].slice(13)
      ].inputs[listclass[4]].connections.findIndex(function (item, i) {
        return (
          item.node === listclass[2].slice(14) && item.input === listclass[3]
        );
      });
      this.drawflow.drawflow[this.module].data[listclass[1].slice(13)].inputs[
        listclass[4]
      ].connections.splice(index_in, 1);

      var index_out = this.drawflow.drawflow[this.module].data[
        listclass[2].slice(14)
      ].outputs[listclass[3]].connections.findIndex(function (item, i) {
        return (
          item.node === listclass[1].slice(13) && item.output === listclass[4]
        );
      });
      this.drawflow.drawflow[this.module].data[listclass[2].slice(14)].outputs[
        listclass[3]
      ].connections.splice(index_out, 1);

      elemsOut[i].remove();

      this.dispatch('connectionRemoved', {
        output_id: listclass[2].slice(14),
        input_id: listclass[1].slice(13),
        output_class: listclass[3],
        input_class: listclass[4],
      });
    }

    const elemsIn = this.container.querySelectorAll(`.${idSearchIn}`);
    for (var i = elemsIn.length - 1; i >= 0; i--) {
      var listclass = elemsIn[i].classList;

      var index_out = this.drawflow.drawflow[this.module].data[
        listclass[2].slice(14)
      ].outputs[listclass[3]].connections.findIndex(function (item, i) {
        return (
          item.node === listclass[1].slice(13) && item.output === listclass[4]
        );
      });
      this.drawflow.drawflow[this.module].data[listclass[2].slice(14)].outputs[
        listclass[3]
      ].connections.splice(index_out, 1);

      var index_in = this.drawflow.drawflow[this.module].data[
        listclass[1].slice(13)
      ].inputs[listclass[4]].connections.findIndex(function (item, i) {
        return (
          item.node === listclass[2].slice(14) && item.input === listclass[3]
        );
      });
      this.drawflow.drawflow[this.module].data[listclass[1].slice(13)].inputs[
        listclass[4]
      ].connections.splice(index_in, 1);

      elemsIn[i].remove();

      this.dispatch('connectionRemoved', {
        output_id: listclass[2].slice(14),
        input_id: listclass[1].slice(13),
        output_class: listclass[3],
        input_class: listclass[4],
      });
    }
  }

  /**
   * Get name of module where is the id. Ex id: 5
   * @param id
   */
  getModuleFromNodeId(id: string | number): string {
    let nameModule: string = '';

    for (const [moduleName, { data }] of Object.entries(
      this.drawflow.drawflow
    )) {
      if (Object.hasOwn(data, id.toString())) {
        nameModule = moduleName;
        break;
      }
    }

    // TODO: refactor
    // Object.keys(editor).map((moduleName) => {
    //   Object.keys(editor[moduleName].data).map((node) => {
    //     if (node == id) {
    //       nameModule = moduleName;
    //     }
    //   });
    // });

    return nameModule;
  }

  addModule(name: string): void {
    this.drawflow.drawflow[name] = { data: {} };
    this.dispatch('moduleCreated', name);
  }

  changeModule(name: string): void {
    this.dispatch('moduleChanged', name);
    this.module = name;
    this.precanvas!.innerHTML = '';
    this.canvas_x = 0;
    this.canvas_y = 0;
    this.pos_x = 0;
    this.pos_y = 0;
    this.mouse_x = 0;
    this.mouse_y = 0;
    this.zoom = 1;
    this.zoom_last_value = 1;
    this.precanvas!.style.transform = '';
    this.import(this.drawflow, false);
  }

  removeModule(name: string): void {
    if (this.module === name) {
      this.changeModule('Home');
    }
    delete this.drawflow.drawflow[name];
    this.dispatch('moduleRemoved', name);
  }

  /**
   * Clear data of module selected
   */
  clearModuleSelected(): void {
    this.precanvas!.innerHTML = '';
    this.drawflow.drawflow[this.module] = { data: {} };
  }

  /**
   * Clear all data of all modules and modules remove.
   */
  clear(): void {
    this.precanvas!.innerHTML = '';
    this.drawflow = { drawflow: { Home: { data: {} } } };
  }
  export(): DrawflowExport {
    const dataExport = JSON.parse(JSON.stringify(this.drawflow));
    this.dispatch('export', dataExport);
    return dataExport;
  }

  /**
   *
   * @param data
   * @param notifi - default to true
   */
  import(data: DrawflowExport, notifi: boolean = true): void {
    this.clear();
    this.drawflow = JSON.parse(JSON.stringify(data));
    this.load();
    if (notifi) {
      this.dispatch('import', 'import');
    }
  }

  // /* Events */
  /**
   *
   * @param eventName
   * @param callback (event: id of Node)
   */
  on(eventName: 'nodeCreated', callback: (event: number) => void): void;
  /**
   *
   * @param eventName
   * @param callback (event: id of Node)
   */
  on(eventName: 'nodeRemoved', callback: (event: number) => void): void;
  /**
   *
   * @param eventName
   * @param callback (event: id of Node)
   */
  on(eventName: 'nodeSelected', callback: (event: number) => void): void;
  /**
   *
   * @param eventName
   * @param callback (event: true)
   */
  on(eventName: 'nodeUnselected', callback: (event: boolean) => void): void;
  /**
   *
   * @param eventName
   * @param callback
   */
  on(eventName: 'nodeMoved', callback: (event: any) => void): void;
  /**
   * Called when starting to create a connection
   * @param eventName
   * @param callback
   */
  on(
    eventName: 'connectionStart',
    callback: (event: ConnectionStartEvent) => void
  ): void;
  /**
   * Called when the connection creation was canceled
   * @param eventName
   * @param callback (event: true)
   */
  on(eventName: 'connectionCancel', callback: (event: boolean) => void): void;
  /**
   *
   * @param eventName
   * @param callback (event: id's of nodes and output/input selected)
   */
  on(
    eventName: 'connectionCreated',
    callback: (event: ConnectionEvent) => void
  ): void;
  /**
   *
   * @param eventName
   * @param callback (event: id's of nodes and output/input selected)
   */
  on(
    eventName: 'connectionRemoved',
    callback: (event: ConnectionEvent) => void
  ): void;
  /**
   *
   * @param eventName
   * @param callback (event: id's of nodes and output/input selected)
   */
  on(
    eventName: 'connectionSelected',
    callback: (event: ConnectionEvent) => void
  ): void;
  /**
   *
   * @param eventName
   * @param callback (event: true)
   */
  on(
    eventName: 'connectionUnselected',
    callback: (event: boolean) => void
  ): void;
  /**
   *
   * @param eventName
   * @param callback (event: id of Node output)
   */
  on(eventName: 'addReroute', callback: (event: number) => void): void;
  /**
   *
   * @param eventName
   * @param callback (event: id of Node output)
   */
  on(eventName: 'removeReroute', callback: (event: number) => void): void;
  /**
   *
   * @param eventName
   * @param callback (event: name of Module)
   */
  on(eventName: 'moduleCreated', callback: (event: string) => void): void;
  /**
   *
   * @param eventName
   * @param callback (event: name of Module)
   */
  on(eventName: 'moduleChanged', callback: (event: string) => void): void;
  /**
   *
   * @param eventName
   * @param callback (event: name of Module)
   */
  on(eventName: 'moduleRemoved', callback: (event: string) => void): void;
  /**
   *
   * @param eventName
   * @param callback (event: mouse event)
   */
  on(eventName: 'click', callback: (event: MouseEvent) => void): void;
  /**
   * Once the click changes have been made
   * @param eventName
   * @param callback
   */
  on(eventName: 'clickEnd', callback: (event: any) => void): void;
  /**
   * Click second button mouse event
   * @param eventName
   * @param callback
   */
  on(eventName: 'contextmenu', callback: (event: any) => void): void;
  /**
   *
   * @param eventName
   * @param callback (event: position)
   */
  on(
    eventName: 'mouseMove',
    callback: (event: MousePositionEvent) => void
  ): void;
  /**
   *
   * @param eventName
   * @param callback (event: keyboard event)
   */
  on(eventName: 'keydown', callback: (event: KeyboardEvent) => void): void;
  /**
   *
   * @param eventName
   * @param callback (event: Level of zoom)
   */
  on(eventName: 'zoom', callback: (event: any) => void): void;
  /**
   *
   * @param eventName
   * @param callback (event: position)
   */
  on(
    eventName: 'translate',
    callback: (event: MousePositionEvent) => void
  ): void;
  /**
   * Finish import
   * @param eventName
   * @param callback
   */
  on(eventName: 'import', callback: (event: any) => void): void;
  /**
   * Data export
   * @param eventName
   * @param callback
   */
  on(eventName: 'export', callback: (event: any) => void): void;
  on(event: string, callback: (event: any) => void): boolean | void {
    // Check if the callback is not a function
    if (typeof callback !== 'function') {
      console.error(
        `The listener callback must be a function, the given type is ${typeof callback}`
      );
      return false;
    }
    // Check if the event is not a string
    if (typeof event !== 'string') {
      console.error(
        `The event name must be a string, the given type is ${typeof event}`
      );
      return false;
    }
    // Check if this event not exists
    if (this.events[event] === undefined) {
      this.events[event] = {
        listeners: [],
      };
    }
    this.events[event].listeners.push(callback);
  }

  removeListener(event: string, callback: any): boolean | void {
    // Check if this event not exists

    if (!this.events[event]) return false;

    const listeners = this.events[event].listeners;
    const listenerIndex = listeners.indexOf(callback);
    const hasListener = listenerIndex > -1;
    if (hasListener) listeners.splice(listenerIndex, 1);
  }

  private dispatch(event: string, details: any): boolean | void {
    // Check if this event not exists
    if (this.events[event] === undefined) {
      // console.error(`This event: ${event} does not exist`);
      return false;
    }
    this.events[event].listeners.forEach((listener) => {
      listener(details);
    });
  }

  getUuid(): string {
    return uuid();
    // // http://www.ietf.org/rfc/rfc4122.txt
    // var s: string[] = [];
    // var hexDigits = '0123456789abcdef';
    // for (var i = 0; i < 36; i++) {
    //   s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
    // }
    // s[14] = '4'; // bits 12-15 of the time_hi_and_version field to 0010
    // s[19] = hexDigits.substr(((s[19] as unknown as number) & 0x3) | 0x8, 1); // bits 6-7 of the clock_seq_hi_and_reserved to 01
    // s[8] = s[13] = s[18] = s[23] = '-';

    // var uuid = s.join('');
    // return uuid;
  }

  getElementOfNode(nodeId: DrawflowNode['id']): HTMLElement | null {
    return (
      this.precanvas?.querySelector<HTMLElement>(`#node-${nodeId}`) ?? null
    );
  }
}
