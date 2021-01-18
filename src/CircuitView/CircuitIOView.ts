import { GUIChildElement } from '../GUI/GUIChildElement.js'
import { IViewContainerGUI, IWindowGUI } from '../GUI/GUITypes.js'
import Vec2, {vec2} from '../Lib/Vector2.js'
import { FunctionBlock, FunctionBlockIO, Input, Output } from './CircuitModel.js'
import CircuitView from './CircuitView.js'
import { Table } from '../Lib/HTML.js'
import FunctionBlockPinView from './FunctionBlockPinView.js'
import { CircuitElement, ElementType } from './CircuitTypes.js'

export default class CircuitIOView<T extends FunctionBlockIO> extends GUIChildElement implements CircuitElement
{
    type: ElementType
    get id(): number { return this.io.id }
    gui: CircuitView

    isDraggable = true
    isSelectable = true

    io: T
    ioPin: FunctionBlockPinView<T>

    // Restrict horizontal movement
    setPos(v: Vec2) {
        v.x = this._pos.x
        super.setPos(v)
    }

    constructor(parent: IViewContainerGUI, io: T, pos: Vec2)
    {
        super(parent, 'div', pos, vec2(parent.gui.style.IOAreaWidth, 1), {
            border: '1px solid',
            borderColor: parent.gui.style.colorBlock,
            fontSize: Math.round(parent.gui.scale.y * 0.65)+'px',
            color: 'white',
            boxSizing: 'content-box',
            fontFamily: 'monospace',
            userSelect: 'none',
        }, true)
        this.io = io
        this.type = (this.io.pinType == 'inputPin') ? 'circuitInput' : 'circuitOutput'

        this.build()
    }

    private build() {
        this.createIOName()
        this.createPin()
    }

    createPin() {
        const pos = (this.io.pinType == 'inputPin') ? vec2(this.gui.style.IOAreaWidth, 0) : vec2(-1, 0)
        this.ioPin = new FunctionBlockPinView(this.children, this.io, pos, true)
    }

    createIOName() {
        this.DOMElement.textContent = this.io.name
        this.setStyle({
            textAlign: 'center',
            verticalAlign: 'middle',
            lineHeight: this._sizeScaled.y + 'px'
        })
    }

    selected() {
        this.DOMElement.style.borderColor = this.gui.style.colorSelected
    }

    unselected() {
        this.DOMElement.style.borderColor = this.gui.style.colorBlock
    }

    toFront() {
        this.parentContainer.DOMElement.appendChild(this.DOMElement)
    }

    onPointerEnter = () => {
        this.DOMElement.style.backgroundColor = this.gui.style.colorBlockHover
    }

    onPointerLeave = () => {
        this.DOMElement.style.backgroundColor = 'transparent'
    }
}