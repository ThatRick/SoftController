import Vec2, { IVec2, vec2 } from '../Lib/Vector2.js'
import GUIView, { GUIEvent, GUIEventType } from '../GUI/GUIView.js'
import Circuit from '../State/Circuit.js'
import { GUIChildElement } from '../GUI/GUIChildElement.js'
import * as HTML from '../Lib/HTML.js'
import { defaultStyle, Style } from './Common.js'
import { BlockEvent, BlockEventType, FunctionBlock, FunctionBlockInterface, FunctionTypeDefinition } from '../State/FunctionBlock.js'
import { CircuitBlock } from '../State/FunctionLib.js'
import FunctionBlockView from './FunctionBlockView.js'
import { EventEmitter } from '../Lib/Events.js'
import { IRootViewGUI } from '../GUI/GUITypes.js'
import CircuitSelection from './Selection.js'
import CircuitPointerHandler from './PointerHandler.js'
import TraceLayer from './TraceLayer.js'
import { TraceLine } from './TraceLine.js'
import IOPinView from './IOPinView.js'
import { IOPinEvent, IOPinEventType, IOPinInterface } from '../State/IOPin.js'

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

        circuitView.events.subscribe(() => { this.setSize(this.circuitView.size) }, [GUIEventType.Resized])
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
            this.createFunctionBlockView(block, vec2(pos))
        })

        // Create circuit IO pins
        this.createCircuitPinViews(circuitViewDefinition)
        
        // Create connection lines
        this.circuit.blocks.forEach((destBlock) => {
            destBlock.inputs?.forEach(destIO => {
                if (destIO.sourcePin) this.createConnectionTrace(destIO)
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

    ioSourceChangeHandler = (event: IOPinEvent) => {
        const io = event.source
        
        if (event.type == IOPinEventType.SourceChanged) {
            // Get containing block view (or this as circuit view)
            const blockView = (io.block == this.circuitBlock) ? this : this.blockViewsMap.get(io.block)
            // Get IOPinView
            const pinView = blockView?.getPinForIO(io)
            if (!pinView) { console.error('Pin view not found for IO event:', event); return }

            const currentTrace = this.traceLinesMap.get(io)
            // If connection removed
            if (!io.sourcePin) {
                currentTrace?.delete()
            }
            // If connection made
            if (io.sourcePin) {
                if (currentTrace && (currentTrace.sourcePinView.io != io.sourcePin)) currentTrace.delete()
                this.createConnectionTrace(io)
            }
        }
    }

    functionBlockIOAddHandler = (event: BlockEvent) => {
        if (event.type == BlockEventType.InputAdded) {
            const newInput = event.source.inputs[event.source.inputs.length-1]
            newInput.events.subscribe(this.ioSourceChangeHandler, [IOPinEventType.SourceChanged])
        }
    }

    getPinForIO(io: IOPinInterface) { 
        let foundPin: IOPinView
        foundPin = this.inputPins.find(pin => pin.io == io)
        foundPin ??= this.outputPins.find(pin => pin.io == io)
        return foundPin
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

    protected createFunctionBlockView(block: FunctionBlockInterface, pos: Vec2) {
        const blockView = new FunctionBlockView(block, pos, this.body.children)
        // subscribe for io connection events
        block.inputs.forEach(input => input.events.subscribe(this.ioSourceChangeHandler, [IOPinEventType.SourceChanged]))
        block.events.subscribe(this.functionBlockIOAddHandler, [BlockEventType.InputAdded])
        this.blockViewsMap.set(block, blockView)
        return blockView
    }

    protected createConnectionTrace(destIO: IOPinInterface) {
        if (destIO.sourcePin) {
            const destBlock = destIO.block
            const destPin = (destBlock == this.circuitBlock)
                ? this.getPinForIO(destIO)
                : this.blockViewsMap.get(destBlock)?.getPinForIO(destIO)
            const sourceBlock = destIO.sourcePin.block
            const sourcePin = (sourceBlock == this.circuitBlock)
                ? this.getPinForIO(destIO.sourcePin)
                : this.blockViewsMap.get(sourceBlock)?.getPinForIO(destIO.sourcePin)
            
            if (destPin && sourcePin) {
                const traceLine = new TraceLine(this, sourcePin, destPin)
                this.traceLinesMap.set(destIO, traceLine)
            }
            else if (!destPin) console.error('Trace failed. Destination IO pin view not found', destIO)
            else if (!sourcePin) console.error('Trace failed. Source IO pin view not found', destIO.sourcePin)
        }
        else console.error('Trace failed. Destionation IO has no source', destIO)
    }

    protected createCircuitPinViews(def: CircuitViewDefinition)
    {
        this.inputPins ??= this.circuitBlock.inputs.map((input, index) => {
            const posY = def.positions?.inputs?.[index] || index
            return this.createCircuitPinView(input, vec2(0, posY))
        })
        this.outputPins ??= this.circuitBlock.outputs.map((output, index) => {
            const posY = def.positions?.outputs?.[index] || index
            return this.createCircuitPinView(output, vec2(this.body.size.x-1, posY))
        })
    }

    protected createCircuitPinView(io: IOPinInterface, pos: Vec2) {
        const pin = new IOPinView(io, pos, this.body.children)
        if (pin.direction == 'left') io.events.subscribe(this.ioSourceChangeHandler.bind(this), [IOPinEventType.SourceChanged])
        return pin 
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