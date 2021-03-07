import Vec2, { IVec2, vec2 } from '../Lib/Vector2.js'
import GUIView, { GUIEventType } from '../GUI/GUIView.js'
import Circuit from '../State/Circuit.js'
import { GUIChildElement } from '../GUI/GUIChildElement.js'
import * as HTML from '../Lib/HTML.js'
import { defaultStyle, Style } from './Common.js'
import { FunctionBlock, FunctionBlockInterface, FunctionTypeDefinition } from '../State/FunctionBlock.js'
import { CircuitBlock } from '../State/FunctionLib.js'
import FunctionBlockView from './FunctionBlockView.js'
import { EventEmitter } from '../Lib/Events.js'
import { IRootViewGUI } from '../GUI/GUITypes.js'
import CircuitSelection from './Selection.js'
import CircuitPointerHandler from './PointerHandler.js'
import TraceLayer from './TraceLayer.js'
import { TraceLine } from './TraceLine.js'
import IOPinView from './IOPinView.js'
import { IOPinInterface } from '../State/IOPin.js'

export interface CircuitViewDefinition
{
    definition: FunctionTypeDefinition
    size: IVec2
    positions: {
        blocks: IVec2[]
        inputs: number[]
        outputs: number[]
    }
}

export const enum CircuitViewEventType {
    CircuitLoaded,
    CircuitClosed,
}

export interface CircuitViewEvent {
    type:   CircuitViewEventType
    source: ICircuitView
}

export interface ICircuitView extends IRootViewGUI
{
    style: Style,
    readonly circuitBlock: FunctionBlockInterface
    loadCircuitDefinition(circuitViewDefinition: CircuitViewDefinition)
}

export default class CircuitView extends GUIView<GUIChildElement, Style>
{
    static readonly IO_AREA_WIDTH = 5

    loadCircuitDefinition(circuitViewDefinition: CircuitViewDefinition) {
        const { definition, positions, size } = circuitViewDefinition
        this.resize(vec2(size))
        this._circuitBlock = new CircuitBlock(definition)
        
        // Create block views
        this.circuit.blocks.forEach((block, index) => {
            const pos = positions.blocks[index]
            const blockView = new FunctionBlockView(block, vec2(pos), this.children)
            this.blockViews.set(block, blockView)
        })

        // Create circuit IO pins
        this.createPins(circuitViewDefinition)
        
        // Create connection lines
        this.blockViews.forEach(blockView => {
            blockView.block.inputs.forEach(input => {
                if (input.source) {
                    const destPin = blockView.getPinForIO(input)
                    const sourceBlock = input.source.block
                    let sourcePin: IOPinView
                    if (sourceBlock == this.circuitBlock) {
                        sourcePin = this.inputPins.find(pin => pin.io == input.source)
                    } else {
                        const blockView = this.blockViews.get(sourceBlock)
                        sourcePin = blockView?.getPinForIO(input.source)
                    }
                    const traceLine = new TraceLine(this.traceLayer, sourcePin, destPin)
                    this.traceLines.set(input, traceLine)
                }
            })
        })

        this.events.emit(CircuitViewEventType.CircuitLoaded)
    }
    
    blockViews = new Map<FunctionBlockInterface, FunctionBlockView>()

    traceLines = new Map<IOPinInterface, TraceLine>()

    circuitViewEvents = new EventEmitter<CircuitViewEvent>(this)

    selection = new CircuitSelection(this.style)

    get circuitBlock(): FunctionBlockInterface { return this._circuitBlock }


    constructor(parent: HTMLElement, size: Vec2, scale: Vec2, style: Readonly<Style> = defaultStyle)
    {
        super(parent, size, scale, style, {
            backgroundColor: style.colors.background,
            ...HTML.backgroundGridStyle(scale, style.colors.gridLines),
            fontFamily: 'system-ui',
            fontSize: Math.round(scale.y * style.fontSize)+'px'
        })
        this.pointer.attachEventHandler(CircuitPointerHandler(this))
        this.traceLayer = new TraceLayer(this.DOMElement, this.scale, this.style)
    }

    protected inputPins: IOPinView[]
    protected outputPins: IOPinView[]
    
    protected createPins(def: CircuitViewDefinition) {
        this.inputPins ??= this.circuitBlock.inputs.map((input, index) => {
            const posY = def.positions?.inputs?.[index] || index
            const pin = new IOPinView(input, vec2(0, posY), this.children)
            return pin
        })
        this.outputPins ??= this.circuitBlock.outputs.map((output, index) => {
            const posY = def.positions?.outputs?.[index] || index
            const pin = new IOPinView(output, vec2(this.size.x-1, posY), this.children)
            return pin
        })
    }

    protected onResize() {
    }
    
    protected onRescale() {
        this.traceLayer.rescale(this.scale)
        this.onRestyle()
    }

    protected onRestyle() {
        this.setStyle({
            backgroundColor: this.style.colors.background,
            ...HTML.backgroundGridStyle(this.scale, this.style.colors.gridLines),
            fontSize: Math.round(this.scale.y * this.style.fontSize)+'px'
        })
    }

    protected traceLayer: TraceLayer

    protected _circuitBlock: FunctionBlock
    protected get circuit() { return this._circuitBlock?.circuit }
}