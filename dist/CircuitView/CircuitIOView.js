import { GUIChildElement } from '../GUI/GUIChildElement.js';
import { vec2 } from '../Lib/Vector2.js';
import FunctionBlockPinView from './FunctionBlockPinView.js';
export default class CircuitIOView extends GUIChildElement {
    type;
    get id() { return this.ioPin.id; }
    isDraggable = true;
    isSelectable = true;
    ioPin;
    circuit;
    ioNum;
    // Restrict horizontal movement
    setPos(v) {
        v.x = this._pos.x;
        super.setPos(v);
    }
    constructor(parent, circuit, ioNum, pos) {
        super(parent, 'div', pos, vec2(parent.gui.style.IOAreaWidth, 1), {
            borderBottom: '1px solid',
            borderColor: parent.gui.style.colorPanelLines,
            backgroundColor: parent.gui.style.colorBlock,
            color: 'white',
            boxSizing: 'border-box',
            userSelect: 'none',
        }, true);
        this.circuit = circuit;
        this.ioNum = ioNum;
        this.type = (ioNum < circuit.funcState.funcData.inputCount) ? 'circuitInput' : 'circuitOutput';
        this.build();
    }
    build() {
        this.createIOName();
        this.createPin();
    }
    createPin() {
        const pos = (this.type == 'circuitInput') ? vec2(this.gui.style.IOAreaWidth, 0) : vec2(-1, 0);
        this.ioPin = new FunctionBlockPinView(this.children, this.circuit.funcState, this.ioNum, pos, true);
    }
    createIOName() {
        this.DOMElement.textContent = this.ioNum.toString();
        this.setStyle({
            textAlign: 'center',
            verticalAlign: 'middle',
            lineHeight: this._sizeScaled.y + 'px'
        });
    }
    onSelected() {
        this.DOMElement.style.backgroundColor = this.gui.style.colorSelected;
    }
    onUnselected() {
        this.DOMElement.style.backgroundColor = this.gui.style.colorBlock;
    }
    toFront() {
        this.parentContainer.DOMElement.appendChild(this.DOMElement);
    }
    onPointerEnter = () => {
        this.DOMElement.style.backgroundColor = this.gui.style.colorBlockHover;
    };
    onPointerLeave = () => {
        this.DOMElement.style.backgroundColor = this.gui.style.colorBlock;
    };
}
