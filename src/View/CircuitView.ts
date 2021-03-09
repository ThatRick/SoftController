import Vec2, { IVec2, vec2 } from '../Lib/Vector2.js'
import GUIView, { GUIEvent, GUIEventType } from '../GUI/GUIView.js'
import Circuit from '../State/Circuit.js'
import { GUIChildElement } from '../GUI/GUIChildElement.js'
import * as HTML from '../Lib/HTML.js'
import { defaultStyle, Style } from './Common.js'
import { BlockEventType, FunctionBlock, FunctionBlockInterface, FunctionTypeDefinition } from '../State/FunctionBlock.js'
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

class CircuitBody extends GUIChildElement
{
    constructor(protected circuitView: CircuitView) {
        super(circuitView.children, 'div', vec2(0, 0), vec2(circuitView.size), {
            cursor: 'auto'
        }, true)
        this.onRestyle()

        circuitView.events.subscribe((ev: GUIEvent) => {this.setSize(this.circuitView.size)}, [GUIEventType.Resized])
    }
    onRestyle() {
        this.setStyle({
            ...HTML.backgroundGridStyle(this.circuitView.scale, this.circuitView.style.colors.gridLines),
        })
    }
    onRescale() {
        this.onRestyle()
    }
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
            const blockView = new FunctionBlockView(block, vec2(pos), this.body.children)
            this.blockViewsMap.set(block, blockView)
        })

        // Create circuit IO pins
        this.createPins(circuitViewDefinition)
        
        // Create connection lines
        this.circuit.blocks.forEach((destBlock) => {
            destBlock.inputs?.forEach(input => {
                if (input.sourcePin) {
                    const destPin = this.blockViewsMap.get(destBlock)?.getPinForIO(input)
                    const sourceBlock = input.sourcePin.block
                    const sourcePin = (sourceBlock == this.circuitBlock)
                        ? this.inputPins.find(pin => pin.io == input.sourcePin)
                        : this.blockViewsMap.get(sourceBlock)?.getPinForIO(input.sourcePin)
                    
                    const traceLine = new TraceLine(this, sourcePin, destPin)
                    this.traceLinesMap.set(input, traceLine)
                }
            })
        })

        this.events.emit(CircuitViewEventType.CircuitLoaded)
    }
    
    circuitViewEvents = new EventEmitter<CircuitViewEvent>(this)

    body: GUIChildElement

    traceLayer: TraceLayer

    selection = new CircuitSelection(this.style)
    
    get circuitBlock(): FunctionBlockInterface { return this._circuitBlock }

    get blockViews() {
        return this.circuit.blocks.map(block => this.blockViewsMap.get(block))
    }

    constructor(parent: HTMLElement, size: Vec2, scale: Vec2, style: Readonly<Style> = defaultStyle)
    {
        super(parent, size, scale, style, {
            backgroundColor: style.colors.background,
            fontFamily: 'system-ui',
            fontSize: Math.round(scale.y * style.fontSize)+'px'
        })
        
        this.body = new CircuitBody(this)
        this.traceLayer = new TraceLayer(this.DOMElement, this.scale, this.style)
        
        this.pointer.attachEventHandler(CircuitPointerHandler(this))
    }

    protected inputPins: IOPinView[]
    protected outputPins: IOPinView[]
    
    protected blockViewsMap = new WeakMap<FunctionBlockInterface, FunctionBlockView>()
    protected traceLinesMap = new WeakMap<IOPinInterface, TraceLine>()

    protected createPins(def: CircuitViewDefinition) {
        this.inputPins ??= this.circuitBlock.inputs.map((input, index) => {
            const posY = def.positions?.inputs?.[index] || index
            const pin = new IOPinView(input, vec2(0, posY), this.body.children)
            return pin
        })
        this.outputPins ??= this.circuitBlock.outputs.map((output, index) => {
            const posY = def.positions?.outputs?.[index] || index
            const pin = new IOPinView(output, vec2(this.body.size.x-1, posY), this.body.children)
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
            fontSize: Math.round(this.scale.y * this.style.fontSize)+'px'
        })
    }

    protected _circuitBlock: FunctionBlock
    protected get circuit() { return this._circuitBlock?.circuit }
}