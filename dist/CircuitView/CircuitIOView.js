import { GUIChildElement } from '../GUI/GUIChildElement.js';
import { vec2 } from '../Lib/Vector2.js';
import FunctionBlockPinView from './FunctionBlockPinView.js';
export default class CircuitIOView extends GUIChildElement {
    constructor(parent, io, pos) {
        super(parent, 'div', pos, vec2(parent.gui.style.IOAreaWidth, 1), {
            backgroundColor: parent.gui.style.colorBlock,
            fontSize: Math.round(parent.gui.scale.y * 0.65) + 'px',
            color: 'white',
            boxSizing: 'border-box',
            fontFamily: 'monospace',
            userSelect: 'none',
        }, true);
        this.type = 'block';
        this.isDraggable = true;
        this.isSelectable = true;
        this.onPointerEnter = () => {
            this.DOMElement.style.backgroundColor = this.gui.style.colorBlockHover;
        };
        this.onPointerLeave = () => {
            this.DOMElement.style.backgroundColor = this.gui.style.colorBlock;
        };
        this.io = io;
        this.build();
    }
    get id() { return this.io.id; }
    build() {
        this.createIOName();
        this.createPin();
    }
    createPin() {
        const pos = (this.io.pinType == 'input') ? vec2(this.gui.style.IOAreaWidth, 0) : vec2(-1, 0);
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
        this.DOMElement.style.outline = this.gui.style.blockOutlineSelected;
    }
    unselected() {
        this.DOMElement.style.outline = this.gui.style.blockOutlineUnselected;
    }
    toFront() {
        this.parentContainer.DOMElement.appendChild(this.DOMElement);
    }
}
