import { customElement } from 'lit/decorators.js';

@customElement('df-node')
export class NodeComponent extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('click', this.select);
  }

  select() {
    const event = new CustomEvent('node-selected', { bubbles: true });
    this.dispatchEvent(event);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'df-node': NodeComponent;
  }
}
