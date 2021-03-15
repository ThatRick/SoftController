import { vec2 } from '../Lib/Vector2.js';
import { GUIChildElement } from '../GUI/GUIChildElement.js';
import * as HTML from '../Lib/HTML.js';
import IOPinView from './IOPinView.js';
import CircuitView from './CircuitView.js';
export default class FunctionBlockView extends GUIChildElement {
    constructor(io, posY, parentContainer) {
        super(parentContainer, 'div', vec2(0, posY), vec2(CircuitView.IO_AREA_WIDTH, 1), {
            color: 'white',
            boxSizing: 'border-box',
            userSelect: 'none',
            borderRadius: '2px',
            cursor: 'grab'
        }, true);
        this.onPointerEnter = () => this.setStyle({ backgroundColor: this.gui.style.colors.primaryHL });
        this.onPointerLeave = () => this.setStyle({ backgroundColor: this.gui.style.colors.primary });
        this.setStyle({
            backgroundColor: this.gui.style.colors.primary
        });
        const pinPosX = (io.type == 'input') ? CircuitView.IO_AREA_WIDTH : -1;
        this.pin = new IOPinView(io, vec2(pinPosX, 0), this.children);
        this.create();
    }
    onRescale() {
        this.create();
    }
    create() {
        this.createTitle();
    }
    createTitle() {
        const gui = this.gui;
        this.titleElem ??= new HTML.Text(this.pin.io.name, {
            parent: this.DOMElement
        });
        this.titleElem.setCSS({
            color: 'black',
            textAlign: 'center',
            width: '100%',
            height: gui.scale.y + 'px',
            lineHeight: gui.scale.y + 'px',
            padding: '0',
            pointerEvents: 'none',
        });
    }
}
