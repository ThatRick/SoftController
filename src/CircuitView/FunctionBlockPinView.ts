import { GUIChildElement } from '../GUI/GUIChildElement.js'
import { IViewContainerGUI, IWindowGUI } from '../GUI/GUITypes.js'
import Vec2, {vec2} from '../Lib/Vector2.js'
import { FunctionBlock, FunctionBlockIO } from './CircuitModel.js'
import { domElement } from '../Lib/HTML.js'
import { CircuitElement, ElementType, PinType } from './CircuitTypes.js'
import CircuitView from './CircuitView.js'
import { IODataType } from '../Controller/ControllerDataTypes.js'


export default class FunctionBlockPinView<T extends FunctionBlockIO> extends GUIChildElement implements CircuitElement
{
    type: ElementType
    get id(): number { return this.io.id }
    gui: CircuitView

    isSelectable = true

    io: T
    pin: HTMLDivElement
    valueField: HTMLDivElement

    color: string

    dataType: IODataType

    get blockID() {
        return this.io.funcBlock.offlineID
    }
    
    constructor(parent: IViewContainerGUI, io: T, pos: Vec2) {
        super(parent, 'div', pos, vec2(1, 1))

        this.io = io
        this.type = io.pinType
        this.dataType = this.io.type

        this.create(this.gui)
    }

    private create(gui: CircuitView) {
        this.createPinElement(gui)
        this.createValueField(gui)
        this.updatePin()
        this.io.onValueChanged = this.updatePin.bind(this)
    }

    createPinElement(gui: CircuitView) {
        const size = vec2(0.5, gui.style.traceWidth)
        const yOffset = 0.5 - size.y / 2
        
        const scaledOffset = Vec2.mul((this.type == 'input') ? vec2(1-size.x, yOffset) : vec2(0, yOffset), gui.scale)
        const scaledSize = Vec2.mul(size, gui.scale)

        this.pin = domElement(this.DOMElement, 'div', {
            position:   'absolute',
            left:       scaledOffset.x + 'px',
            top:        scaledOffset.y + 'px',
            width:      scaledSize.x + 'px',
            height:     scaledSize.y + 'px',
            pointerEvents: 'none'
        })
    }

    createValueField(gui: CircuitView) {
        const width = (this.dataType == IODataType.BINARY) ? 1 : 5
        const height = 0.7
        const size = vec2(width, height)
        const yOffset = -0.3
        const xOffset = 0.3

        const textAlign = (this.dataType == IODataType.BINARY) ? 'center' : 'left'
        
        const scaledOffset = Vec2.mul((this.type == 'input') ? vec2(1 - width - xOffset, yOffset) : vec2(xOffset, yOffset), gui.scale)
        const scaledSize = Vec2.mul(size, gui.scale)

        this.valueField = domElement(this.DOMElement, 'div', {
            position:   'absolute',
            left:       scaledOffset.x + 'px',
            top:        scaledOffset.y + 'px',
            width:      scaledSize.x + 'px',
            height:     scaledSize.y + 'px',
            lineHeight: scaledSize.y + 'px',
            textAlign,
            backgroundColor: gui.style.pinValueFieldBg,
            pointerEvents: 'none'
        })
    }

    updatePin() {
        console.log('update pin:', this.id, this.io.value, this.onPinUpdated)
        this.valueField.textContent = this.io.value.toString()

        const style = this.gui.style

        switch (this.dataType) {
            case IODataType.BINARY:   this.color = (this.io.value == 0) ? style.colorPinBinary0 : style.colorPinBinary1; break
            case IODataType.INTEGER:  this.color = style.colorPinInteger; break
            case IODataType.FLOAT:    this.color = style.colorPinFloat; break
        }

        this.pin.style.backgroundColor = this.color
        this.valueField.style.color = this.color

        this.onPinUpdated?.()
    }

    onPinUpdated?(): void

    selected() {
        this.pin.style.outline = this.gui.style.blockOutlineSelected
    }

    unselected() {
        this.pin.style.outline = this.gui.style.blockOutlineUnselected
    }

    onPointerEnter = (ev: PointerEvent) => {
        this.DOMElement.style.filter = this.gui.style.colorFilterActive
    }

    onPointerLeave = (ev: PointerEvent) => {
        this.DOMElement.style.filter = 'none'
    }
}