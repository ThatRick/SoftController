import GUIElement from '../GUI/GUIElement.js';
import Vec2, { vec2 } from '../Lib/Vector2.js';
import { domElement } from '../Lib/HTML.js';
export default class FunctionBlockPinElem extends GUIElement {
    constructor(parent, io, pos) {
        super(parent, 'div', pos, vec2(1, 1));
        this.onPointerEnter = (ev) => {
            this.pin.style.backgroundColor = this.gui.style.colorPinHover;
        };
        this.onPointerLeave = (ev) => {
            this.pin.style.backgroundColor = this.gui.style.colorPin;
        };
        this.io = io;
        this.type = io.pinType;
    }
    get id() { return this.io.id; }
    onInit(gui) {
        const size = vec2(0.5, 0.2);
        const yOffset = 0.5 - size.y / 2;
        const scaledOffset = Vec2.mul((this.type == 'input') ? vec2(1 - size.x, yOffset) : vec2(0, yOffset), gui.scale);
        const scaledSize = Vec2.mul(size, gui.scale);
        this.pin = domElement(this.DOMElement, 'div', {
            position: 'absolute',
            left: scaledOffset.x + 'px',
            top: scaledOffset.y + 'px',
            width: scaledSize.x + 'px',
            height: scaledSize.y + 'px',
            backgroundColor: gui.style.colorPin,
            pointerEvents: 'none'
        });
    }
}
