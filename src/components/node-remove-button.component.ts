import { css, CSSResultGroup, html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { debugeable } from 'src/utils';

const styles = css`
  :host {
    position: absolute;
    width: fit-content;
    height: fit-content;
  }

  * {
    box-sizing: border-box;
  }

  button {
    display: block;
    width: 30px;
    height: 30px;
    background: black;
    color: white;
    z-index: 4;
    border: 2px solid white;
    line-height: 30px;
    font-weight: bold;
    text-align: center;
    border-radius: 50%;
    font-family: monospace;
    cursor: pointer;
    position: relative;
    padding: 0;
  }
  button::before,
  button::after {
    content: '';
    height: 2px;
    width: 24px;
    background-color: #fff;
    position: absolute;
    top: 50%;
    left: 50%;
    display: block;
    width: 60%;
    transform-box: border-box;
    border-radius: 1px;
  }
  button::before {
    transform: translate(-50%, -50%) rotate(45deg);
  }
  button::after {
    transform: translate(-50%, -50%) rotate(-45deg);
  }
`;

@customElement('df-node-remove-button')
export class NodeRemoveButtonComponent extends LitElement {
  static styles?: CSSResultGroup = styles;

  constructor() {
    super();

    this.addEventListener('click', this._onClickHandler);
  }

  @debugeable()
  _onClickHandler(e: MouseEvent): void {
    e.stopPropagation();
    const event = new CustomEvent('delete-node', {
      cancelable: true,
      bubbles: true,
    });

    this.dispatchEvent(event);
  }

  protected render() {
    return html` <button type="button" part="button"></button> `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'df-node-remove-button': NodeRemoveButtonComponent;
  }
}
