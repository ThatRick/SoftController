import { domElement, Element } from './HTMLCommon.js';
export class Text extends Element {
    constructor(text, options) {
        super();
        this.DOMElement = domElement(null, 'div', {
            paddingLeft: '2px',
            paddingRight: '4px',
            ...options?.style
        });
        this.setText(text);
        options?.parent?.appendChild(this.DOMElement);
    }
    setText(text) { this.DOMElement.textContent = text; }
}
