import { GUIChildElement } from '../GUI/GUIChildElement.js';
import { vec2 } from '../Lib/Vector2.js';
import FunctionBlockPinView from './FunctionBlockPinView.js';
export default class CircuitIOView extends GUIChildElement {
    constructor(parent, io, pos) {
        super(parent, 'div', pos, vec2(parent.gui.style.IOAreaWidth, 1), {
            border: '1px solid',
            borderColor: parent.gui.style.colorBlock,
            fontSize: Math.round(parent.gui.scale.y * 0.65) + 'px',
            color: 'white',
            boxSizing: 'content-box',
            fontFamily: 'monospace',
            userSelect: 'none',
        }, true);
        this.isDraggable = true;
        this.isSelectable = true;
        this.onPointerEnter = () => {
            this.DOMElement.style.backgroundColor = this.gui.style.colorBlockHover;
        };
        this.onPointerLeave = () => {
            this.DOMElement.style.backgroundColor = 'transparent';
        };
        this.io = io;
        this.type = (this.io.pinType == 'inputPin') ? 'circuitInput' : 'circuitOutput';
        this.build();
    }
    get id() { return this.io.id; }
    // Restrict horizontal movement
    setPos(v) {
        v.x = this._pos.x;
        super.setPos(v);
    }
    build() {
        this.createIOName();
        this.createPin();
    }
    createPin() {
        const pos = (this.io.pinType == 'inputPin') ? vec2(this.gui.style.IOAreaWidth, 0) : vec2(-1, 0);
        this.ioPin = new FunctionBlockPinView(this.children, this.io, pos, true);
    }
    createIOName() {
        this.DOMElement.textContent = this.io.name;
        this.setStyle({
            textAlign: 'center',
            verticalAlign: 'middle',
            lineHeight: this._sizeScaled.y + 'px'
        });
    }
    selected() {
        this.DOMElement.style.borderColor = this.gui.style.colorSelected;
    }
    unselected() {
        this.DOMElement.style.borderColor = this.gui.style.colorBlock;
    }
    toFront() {
        this.parentContainer.DOMElement.appendChild(this.DOMElement);
    }
}
