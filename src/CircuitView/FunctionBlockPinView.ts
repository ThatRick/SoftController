import { GUIChildElement } from '../GUI/GUIChildElement.js'
import { IViewContainerGUI, IWindowGUI } from '../GUI/GUITypes.js'
import Vec2, {vec2} from '../Lib/Vector2.js'
import { FunctionBlock } from './CircuitState.js'
import { domElement } from '../Lib/HTML.js'
import { CircuitElement, ElementType, PinType } from './CircuitTypes.js'
import CircuitView from './CircuitView.js'
import { getIODataType, IODataType } from '../Controller/ControllerDataTypes.js'
import { DataType } from '../Lib/TypedStructs.js'

export default class FunctionBlockPinView extends GUIChildElement implements CircuitElement
{
    type: ElementType
    gui: CircuitView

    isSelectable = true
    isDraggable = true

    funcState: FunctionBlock
    ioNum: number
    pinType: PinType

    pin: HTMLDivElement
    valueField: HTMLDivElement

    isInternalCircuitIO: boolean
    
    color: string
    
    private _name: string

    private doubleClickPending: boolean

    get name()  { return this._name }
    get dataType()  { return getIODataType(this.flags) }
    get flags() { return this.funcState.funcData.ioFlags[this.ioNum] }
    get value() { return this.funcState.funcData.ioValues[this.ioNum] }
    get id()    { return this.funcState.offlineID * 1000 + this.ioNum }
    
    get blockID() {
        return this.funcState.offlineID
    }
    setValue(value: number) { this.funcState.parentCircuit.setIOValue(this.blockID, this.ioNum, value) }
    
    constructor(parent: IViewContainerGUI, funcState: FunctionBlock, ioNum: number, pos: Vec2, isInternalCircuitIO = false) {
        super(parent, 'div', pos, vec2(1, 1))
        this.funcState = funcState
        this.ioNum = ioNum
        this.pinType = (ioNum < funcState.funcData.inputCount) ? 'inputPin' : 'outputPin'

        this.type = (!isInternalCircuitIO && this.pinType == 'inputPin' || isInternalCircuitIO && this.pinType == 'outputPin')
            ? 'inputPin' : 'outputPin'

        this.isInternalCircuitIO = isInternalCircuitIO
        this.create(this.gui)
    }

    get connection() {
        const ref = (this.isInternalCircuitIO)
            ? this.funcState.parentCircuit.circuitData.outputRefs[this.ioNum - this.funcState.funcData.inputCount]
            : this.funcState.funcData.inputRefs[this.ioNum]
        return ref
    }

    private create(gui: CircuitView) {
        this.createPinElement(gui)
        this.createValueField(gui)
        this.updatePin()
        this.funcState.onIOChanged[this.ioNum] = this.updatePin.bind(this)
    }

    createPinElement(gui: CircuitView) {
        const size = vec2(0.5, gui.style.traceWidth)
        const yOffset = 0.5 - size.y / 2
        
        const scaledOffset = Vec2.mul((this.type == 'inputPin') ? vec2(1-size.x, yOffset) : vec2(0, yOffset), gui.scale)
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
        
        const scaledOffset = Vec2.mul((this.type == 'inputPin') ? vec2(1 - width - xOffset, yOffset) : vec2(xOffset, yOffset), gui.scale)
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
        this.valueField.textContent = this.value.toString()
        
        const style = this.gui.style
        
        switch (this.dataType) {
            case IODataType.BINARY:   this.color = (this.value == 0) ? style.colorPinBinary0 : style.colorPinBinary1; break
            case IODataType.INTEGER:  this.color = style.colorPinInteger; break
            case IODataType.FLOAT:    this.color = style.colorPinFloat; break
        }
        
        this.pin.style.backgroundColor = this.color
        this.valueField.style.color = this.color
        
        //console.log('update pin:', this.id, this.io.value, this.onPinUpdated)
        this.onPinUpdated?.()
    }

    toggleValue() {
        if (this.dataType == IODataType.BINARY && !this.connection) {
            this.setValue((this.value) ? 0 : 1)
        }
    }

    onPinUpdated?(): void

    onSelected() {
        this.pin.style.outline = this.gui.style.blockOutlineSelected
        this.pin.style.backgroundColor = this.gui.style.colorSelected
    }

    onUnselected() {
        this.pin.style.outline = this.gui.style.blockOutlineUnselected
        this.updatePin()
    }

    onPointerEnter = (ev: PointerEvent) => {
        this.DOMElement.style.filter = this.gui.style.filterActive
    }

    onPointerLeave = (ev: PointerEvent) => {
        this.DOMElement.style.filter = 'none'
    }

    onDoubleClicked = ev => {
        this.toggleValue()
    }

}