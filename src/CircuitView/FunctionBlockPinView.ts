import { GUIChildElement } from '../GUI/GUIChildElement.js'
import { IViewContainerGUI, IWindowGUI } from '../GUI/GUITypes.js'
import Vec2, {vec2} from '../Lib/Vector2.js'
import { FunctionBlock } from './FunctionBlockState.js'
import * as HTML from '../Lib/HTML.js'
import { CircuitElement, ElementType, PinType } from './CircuitTypes.js'
import CircuitView from './CircuitView.js'
import { getIODataType, IODataType, IOFlag } from '../Controller/ControllerDataTypes.js'
import { DataType } from '../Lib/TypedStructs.js'

export default class FunctionBlockPinView extends GUIChildElement implements CircuitElement
{
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
    get traceColor() {
        const col = (this.inverted)
            ? (this.value == 0) ? this.gui.style.colorPinBinary1 : this.gui.style.colorPinBinary0
            : this.color
        console.log('get trace color', this.inverted, col)
        return col
    }
    
    private _name: string
    
    get name()  { return this._name }
    get dataType()  { return getIODataType(this.flags) }
    get flags() { return this.funcState.funcData.ioFlags[this.ioNum] }
    get value() { return this.funcState.funcData.ioValues[this.ioNum] }
    get id()    { return this.funcState.offlineID * 1000 + this.ioNum }
    get inverted() { return !!(this.flags & IOFlag.INVERTED) }
    
    get blockID() {
        return this.funcState.offlineID
    }
    
    get reference() {
        const ref = (this.isInternalCircuitIO)
            ? this.funcState.circuit?.circuitData.outputRefs[this.ioNum - this.funcState.funcData.inputCount]
            : this.funcState.funcData.inputRefs[this.ioNum]
        return ref
    }
    
    private create(gui: CircuitView) {
        const pinStyle = (this.inverted) ? this.invertedPinStyle : this.pinStyle
        this.pin = HTML.domElement(this.DOMElement, 'div', pinStyle)
        this.createValueField()
        this.updatePin()
        this.funcState.onIOUpdated[this.ioNum] = this.updatePin.bind(this)
        this.funcState.onValidateValueModification[this.ioNum] = this.validateValueModification.bind(this)
        this.funcState.onValidateFlagsModification[this.ioNum] = this.validateFlagsModification.bind(this)
    }

    get pinStyle() {
        const size = vec2(0.5, this.gui.style.traceWidth)
        const yOffset = 0.5 - size.y / 2
        
        const scaledOffset = Vec2.mul((this.type == 'inputPin') ? vec2(1-size.x, yOffset) : vec2(0, yOffset), this.gui.scale)
        const scaledSize = Vec2.mul(size, this.gui.scale)

        return {
            position:   'absolute',
            left:       scaledOffset.x + 'px',
            top:        scaledOffset.y + 'px',
            width:      scaledSize.x + 'px',
            height:     scaledSize.y + 'px',
            border:     'none',
            borderRadius: '0',
            pointerEvents: 'none',
        } as Partial<CSSStyleDeclaration>
    }

    get invertedPinStyle() {
        const scale = this.gui.scale
        const scaledSize = vec2(scale.x * 0.6)
        const yOffset = (scale.y - scaledSize.y) / 2
        
        const scaledOffset = (this.type == 'inputPin') ? vec2(scale.x - scaledSize.x, yOffset) : vec2(0, yOffset)

        return {
            position:   'absolute',
            left:       scaledOffset.x + 'px',
            top:        scaledOffset.y + 'px',
            width:      scaledSize.x + 'px',
            height:     scaledSize.y + 'px',
            borderStyle:    'solid',
            borderWidth:    this.gui.style.traceWidth * scale.y + 'px',
            borderRadius:   (scaledSize.x / 2) + 'px',
            backgroundColor: 'transparent',
            pointerEvents:  'none',
            boxSizing: 'border-box'
        } as Partial<CSSStyleDeclaration>
    }

    createValueField() {
        const gui = this.gui
        const textAlign = (this.type == 'inputPin') ? 'right' : 'left'
        
        const scaledYOffset = gui.style.valueFieldyOffset * gui.scale.y
        const scaledXOffset = gui.style.valueFieldxOffset * gui.scale.x
        const scaledHeight = gui.style.valueFieldHeight * gui.scale.y

        this.valueField = HTML.domElement(this.DOMElement, 'div', {
            position:   'absolute',
            [textAlign]: scaledXOffset + 'px',
            top:        scaledYOffset + 'px',
            height:     scaledHeight + 'px',
            lineHeight: scaledHeight + 'px',
            textAlign,
            pointerEvents: 'none'
        })
    }
    setValue(value: number) {
        this.funcState.setIOValue(this.ioNum, value)
        this.updatePin()
        if (this.funcState.onlineID) this.pendingValueModification()
    }

    setFlag(flag: number, enabled: boolean) {
        this.funcState.setIOFlag(this.ioNum, flag, enabled)
        Object.assign(this.pin.style, (this.inverted) ? this.invertedPinStyle : this.pinStyle)
        this.updatePin(false)
        if (this.funcState.onlineID) this.pendingFlagsModification()
    }

    formatValue(value: number) {
        const maxLength = 8
        let [ints, decs] = value.toString().split('.')
        if (!decs) return value.toString()
        const numDesimals = Math.min(decs.length, maxLength - (ints.length + 1))
        return Number(value.toFixed(numDesimals)).toString()
    }

    updatePin(bubbles = true) {
        this.valueField.textContent = this.formatValue(this.value)
        
        const style = this.gui.style
        
        switch (this.dataType) {
            case IODataType.BINARY:   this.color = (this.value == 0) ? style.colorPinBinary0 : style.colorPinBinary1; break
            case IODataType.INTEGER:  this.color = style.colorPinInteger; break
            case IODataType.FLOAT:    this.color = style.colorPinFloat; break
        }
        
        (this.inverted)
            ? this.pin.style.borderColor = this.color
            : this.pin.style.backgroundColor = this.color
        
        this.valueField.style.color = this.color
        
        console.log('update pin:', this.id)
        bubbles && this.onPinUpdated?.()
    }
    onPinUpdated?(): void

    editValue() {
        const gui = this.gui
        const textAlign = (this.type == 'inputPin') ? 'right' : 'left'

        const scaledYOffset = gui.style.valueFieldyOffset * gui.scale.y
        const scaledXOffset = gui.style.valueFieldxOffset * gui.scale.x
        const scaledHeight = gui.style.valueFieldHeight * gui.scale.y

        const inputField = HTML.domElement(this.DOMElement, 'input', {
            zIndex: '2',
            position: 'absolute',
            [textAlign]: scaledXOffset + 'px',
            top:        scaledYOffset + 'px',
            width: '64px',
            backgroundColor: 'black',
            color: this.color,
            textAlign,
        })
        inputField.type = 'text'
        inputField.value = this.value.toString()
        inputField.select()
        inputField.onkeydown = ev => {
            if (ev.key == 'Enter') {
                let raw = inputField.value
                raw = raw.replace(',', '.')
                let value = Number(raw)
                if (this.dataType == IODataType.INTEGER) value = Math.trunc(value)
                console.log('input value', raw, value)
                if (!Number.isNaN(value)) {
                    this.setValue(value)
                    this.DOMElement.removeChild(inputField)
                } else {
                    inputField.select()
                }
            } else if (ev.key == 'Escape') {
                this.DOMElement.removeChild(inputField)
            }
        }
        inputField.onblur = () => this.DOMElement.removeChild(inputField)
    }

    togglePin() {
        if (this.dataType == IODataType.BINARY && !this.reference) {
            this.setValue((this.value) ? 0 : 1)
        }
        else if (this.dataType == IODataType.BINARY && this.reference) {
            this.setFlag(IOFlag.INVERTED, !this.inverted)
        }
        else {
            this.editValue()
        }
    }

    pendingValueModification() {
        this.valueField.style.outline = this.gui.style.borderPending
        this.valueField.style.backgroundColor = this.gui.style.colorPending
    }

    validateValueModification(successful: boolean) {
        this.valueField.style.outline = (successful) ? 'none' : this.gui.style.borderError
        this.valueField.style.backgroundColor = this.gui.style.colorValueBg
    }
    
    pendingFlagsModification() {
        this.DOMElement.style.backgroundColor = this.gui.style.colorPending
    }

    validateFlagsModification(successful: boolean) {
        console.log('flags validated!')
        this.DOMElement.style.backgroundColor = 'transparent'
    }

    onSelected() {
        this.pin.style.outline = this.gui.style.blockOutlineSelected
        this.pin.style.backgroundColor = this.gui.style.colorSelected
    }

    onUnselected() {
        this.pin.style.outline = this.gui.style.blockOutlineUnselected
        this.updatePin(false)
    }

    onPointerEnter = (ev: PointerEvent) => {
        this.DOMElement.style.filter = this.gui.style.filterActive
    }

    onPointerLeave = (ev: PointerEvent) => {
        this.DOMElement.style.filter = 'none'
    }

    onDoubleClicked = ev => {
        this.togglePin()
    }

}