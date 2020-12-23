import { Vec2 } from './GUITypes.js';
import GUIElement from './GUIElement.js';
import GUIContainer from './GUIContainer.js';
export default class GUIRectElement extends GUIElement {
    constructor(parent, elem, pos, size, style) {
        super(parent, elem, pos, size, style);
        this.children = new GUIContainer(this);
        this.isMovable = true;
        this.onPointerDown = (ev, pointer) => {
            this.toFront();
        };
        this.onDragEnded = (ev, pointer) => {
            const pos = this.pos.copy();
            pos.div(this.gui.snap).round().mul(this.gui.snap);
            this.pos = Vec2.round(this.pos);
        };
    }
    init(gui) {
        super.init(gui);
    }
    update(gui, force) {
        super.update(gui, force);
        return false;
    }
    toFront() {
        this.parent.DOMElement.appendChild(this.DOMElement);
    }
}
