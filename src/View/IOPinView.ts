import { GUIChildElement } from '../GUI/GUIChildElement.js'
import { IContainerGUI } from '../GUI/GUITypes.js'
import Vec2, { vec2 } from '../Lib/Vector2.js'
import { IOPinEvent, IOPinEventType, IOPinInterface } from '../State/IOPin.js'
import * as HTML from '../Lib/HTML.js'
import CircuitView from './CircuitView.js'
import { formatValue } from './Common.js'
import { EventEmitter } from '../Lib/Events.js'

export const enum IOPinViewEventType {
    ColorChanged,
}

export interface IOPinViewEvent {
    type:   IOPinViewEventType
    source: IOPinView
}

export default class IOPinView extends GUIChildElement
{
    get type() { return this.io.type }

    readonly direction: 'left' | 'right'

    readonly io: IOPinInterface

    readonly isCircuitIO: boolean

    get color() { return this.pinColor }

    declare gui: CircuitView

    set backgroundColor(color: string) {
        this._backgroundColor = color
        this.setStyle({ backgroundColor: color })
    }

    ioPinViewEvents = new EventEmitter<IOPinViewEvent>(this)

    setValueVisibility(visible: boolean) {
        if (!this.valueField) return
        this.valueField.style.visibility = (visible) ? 'visible' : 'hidden'
    }

    getValue() { return this.valueField?.textContent }

    //////////////////////////////////////////////
    //              Constructor
    //////////////////////////////////////////////

    constructor(io: IOPinInterface, pos: Vec2, parentContainer: IContainerGUI )
    {
        super(parentContainer, 'div', pos, vec2(1, 1), {cursor: 'crosshair'})
        this.DOMElement.className = 'hoverBackground'
        this.io = io
        this.isCircuitIO = (io.block.circuit != null)
        this.direction = ((this.type == 'input' && !this.isCircuitIO) || (this.type == 'output' && this.isCircuitIO)) ? 'left' : 'right'
        io.events.subscribe(this.ioEventHandler)
        this.init()
    }

    //////////////////////////////////////////////
    //               Protected
    //////////////////////////////////////////////

    protected init() {
        this.createPin()
        if (this.gui.style.showBinaryValue || this.io.datatype != 'BINARY') this.createValueField()
        this.updatePinColor()
        this.update()
    }

    protected createPin() {
        const pinStyle = (this.io.inverted) ? this.invertedPinStyle : this.pinStyle
        this.pin = HTML.domElement(this.DOMElement, 'div', pinStyle)
    }

    protected createValueField() {
        this.valueField = HTML.domElement(this.DOMElement, 'div', this.valueFieldStyle())
    }

    protected valueFieldStyle() {
        const {scale, style} = this.gui
        
        const scaledYOffset = style.valueFieldyOffset * scale.y
        const scaledXOffset = style.valueFieldxOffset * scale.x
        const scaledHeight = style.valueFieldHeight * scale.y
        const textAlign = (this.direction == 'left') ? 'right' : 'left'

        return {
            position:       'absolute',
            [textAlign]:    scaledXOffset + 'px',
            top:            scaledYOffset + 'px',
            height:         scaledHeight + 'px',
            lineHeight:     scaledHeight + 'px',
            paddingLeft:    '2px',
            paddingRight:   '2px',
            textAlign,
            pointerEvents:  'none',
            zIndex:         '2'
        }
    }

    protected _backgroundColor = 'transparent'

    protected pin: HTMLDivElement
    protected valueField: HTMLDivElement

    protected pinColor: string

    protected ioEventHandler = (ev: IOPinEvent) => {
        switch (ev.type)
        {
            case IOPinEventType.ValueChanged:
                this.requestUpdate()
                break
            case IOPinEventType.SourceChanged:
                break
            case IOPinEventType.InvertionChanged:
                this.updateStyle()
                break
            case IOPinEventType.Removed:
                this.delete()
                break
            default:
                console.error('FunctionBlockView: Unhandled block event!')
        }
    }

    protected onUpdate() {
        if (this.valueField) this.valueField.textContent = formatValue(this.io.value)
        if (this.io.datatype == 'BINARY') this.updatePinColor()
        return false
    }

    protected onRescale() {
        this.updateStyle()
    }

    protected updateStyle() {
        const pinStyle = (this.io.inverted) ? this.invertedPinStyle : this.pinStyle
        Object.assign(this.pin.style, pinStyle)
        if (this.valueField) Object.assign(this.valueField.style, this.valueFieldStyle())
        this.updatePinColor()
    }

    protected updatePinColor() {
        const style = this.gui.style
        let color: string

        switch (this.io.datatype) {
            case 'BINARY':   color = (this.io.value == 0) ? style.colors.binaryOff : style.colors.binaryOn; break
            case 'INTEGER':  color = style.colors.integer; break
            case 'FLOAT':    color = style.colors.float; break
        }
        
        (this.io.inverted)
            ? this.pin.style.borderColor = color
            : this.pin.style.backgroundColor = color
        
        if (this.pinColor != color) this.ioPinViewEvents.emit(IOPinViewEventType.ColorChanged)

        this.pinColor = color

        if (this.valueField) this.valueField.style.color = this.color
    }

    protected get pinStyle() {
        const height = Math.round(this.gui.style.traceWidth * this.gui.scale.y)
        const width = Math.round(0.5 * this.gui.scale.x)
        const halfHeight = Math.round(height / 2)
        
        const scaledOffsetX = (this.direction == 'left') ? this.gui.scale.x-width : 0
        const scaledOffsetY = Math.round(this.gui.scale.y / 2 - halfHeight) 
        
        return {
            position:   'absolute',
            left:       scaledOffsetX + 'px',
            top:        scaledOffsetY + 'px',
            width:      width + 'px',
            height:     height + 'px',
            border:     'none',
            borderRadius: '0',
            pointerEvents: 'none',
        } as Partial<CSSStyleDeclaration>
    }

    protected get invertedPinStyle() {
        const scale = this.gui.scale
        const scaledSize = vec2(scale.x * 0.5).round()
        const yOffset = Math.round((scale.y - scaledSize.y) / 2)
        const traceWidth = Math.round(this.gui.style.traceWidth * this.gui.scale.y)
        
        const scaledOffset = (this.direction == 'left') ? vec2(scale.x - scaledSize.x, yOffset) : vec2(0, yOffset)

        return {
            position:   'absolute',
            left:       scaledOffset.x + 'px',
            top:        scaledOffset.y + 'px',
            width:      scaledSize.x + 'px',
            height:     scaledSize.y + 'px',
            borderStyle:    'solid',
            borderWidth:    traceWidth + 'px',
            borderRadius:   (scaledSize.x / 2) + 'px',
            backgroundColor: 'transparent',
            pointerEvents:  'none',
            boxSizing: 'border-box'
        } as Partial<CSSStyleDeclaration>
    }

    onPointerEnter = () => this.setStyle({ backgroundColor: this.gui.style.colors.pinHighlight })
    onPointerLeave = () => this.setStyle({ backgroundColor: this._backgroundColor })

}