import Vec2, { IVec2, vec2 } from '../Lib/Vector2.js'
import GUIView, { GUIEventType } from '../GUI/GUIView.js'
import { GUIChildElement } from '../GUI/GUIChildElement.js'
import * as HTML from '../Lib/HTML.js'
import { defaultStyle, Style } from './Common.js'
import { BlockEvent, BlockEventType, FunctionBlock, FunctionBlockInterface, FunctionTypeDefinition } from '../State/FunctionBlock.js'
import { CircuitBlock, FunctionTypeName } from '../State/FunctionLib.js'
import FunctionBlockView from './FunctionBlockView.js'
import { EventEmitter } from '../Lib/Events.js'
import { IRootViewGUI } from '../GUI/GUITypes.js'
import CircuitSelection from './Selection.js'
import CircuitPointerHandler from './PointerHandler.js'
import TraceLayer from './TraceLayer.js'
import { TraceLine } from './TraceLine.js'
import IOPinView from './IOPinView.js'
import { IOPinEvent, IOPinEventType, IOPinInterface } from '../State/IOPin.js'
import CircuitGrid from './CircuitGrid.js'
import CircuitIOView from './CircuitIOView.js'

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

class CircuitIOArea extends GUIChildElement
{
    constructor(readonly circuitView: CircuitView, readonly type: 'inputs' | 'outputs') {
        super(circuitView.children, 'div', vec2(0, 0), vec2(0, 0), {
            cursor: 'auto',
            backgroundColor: circuitView.style.colors.IOAreaBackground
        }, true)
            
        circuitView.events.subscribe(this.handleCircuitResize, [GUIEventType.Resized])
            
        this.onRestyle()
        this.handleCircuitResize()
    }

    handleCircuitResize = () => {
        this.setPos((this.type == 'inputs')
            ? vec2(0, 0)
            : vec2(this.circuitView.size.x - CircuitView.IO_AREA_WIDTH, 0))
        this.setSize(vec2(CircuitView.IO_AREA_WIDTH, this.circuitView.size.y))
    }

    onRestyle() {
        this.setStyle({
            ...HTML.backgroundLinesStyle(this.circuitView.scale, this.circuitView.style.colors.gridLines),
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
        
        // Create circuit IO views
        this.createCircuitIOViews(circuitViewDefinition)

        // Create function block views
        this.circuit.blocks.forEach((block, index) => {
            const pos = positions.blocks[index]
            this.createFunctionBlockView(block, vec2(pos))
        })
        
        // Create connection lines
        this.circuit.blocks.forEach((destBlock) => {
            destBlock.inputs?.forEach(destIO => {
                if (destIO.sourcePin) this.createConnectionTrace(destIO)
            })
        })

        this.events.emit(CircuitViewEventType.CircuitLoaded)
    }
    
    ioEventHandler = (event: IOPinEvent) => {
        const io = event.source
        switch (event.type)
        {
            case IOPinEventType.SourceChanged:
                // Get containing function block view (or this as circuit view)
                const blockView = (io.block == this.circuitBlock) ? this : this.blockViews.get(io.block)
                // Get IOPinView
                const pinView = blockView?.getPinForIO(io)
                if (!pinView) { console.error('Pin view not found for IO event:', event); return }
                
                const currentTrace = this.traceLines.get(io)
                // If connection removed
                if (!io.sourcePin) {
                    currentTrace?.delete()
                }
                // If connection made
                if (io.sourcePin) {
                    if (currentTrace && (currentTrace.sourcePinView.io != io.sourcePin)) currentTrace.delete()
                    this.createConnectionTrace(io)
                }
                this.requestUpdate(this.grid)
                break
                
            case IOPinEventType.Removed:
                if (io.sourcePin) {
                    const trace = this.traceLines.get(io)
                    trace.delete()
                    this.traceLines.delete(io)
                }
                this.requestUpdate(this.grid)
                break
        }
    }

    functionBlockEventHandler = (event: BlockEvent) => {
        const block = event.source
        switch (event.type)
        {
            case BlockEventType.InputAdded:
                const newInput = block.inputs[block.inputs.length-1]
                newInput.events.subscribe(this.ioEventHandler, [IOPinEventType.SourceChanged])
                break

            case BlockEventType.Removed:
                this.blockViews.delete(block)
                this.requestUpdate(this.grid)
                break
        }
    }

    getPinForIO(io: IOPinInterface) { 
        let foundPin: IOPinView
        foundPin = this.inputPins.find(ioView => ioView.pin.io == io)?.pin
        foundPin ??= this.outputPins.find(ioView => ioView.pin.io == io)?.pin
        return foundPin
    }

    addFunctionBlock(name: FunctionTypeName, pos: Vec2) {
        const block = this.circuit.addBlock({typeName: name})
        this.createFunctionBlockView(block, Vec2.round(pos))
    }

    circuitViewEvents = new EventEmitter<CircuitViewEvent>(this)

    body: CircuitBody
    inputArea: CircuitIOArea
    outputArea: CircuitIOArea
    
    grid: CircuitGrid
    traceLayer: TraceLayer

    selection = new CircuitSelection(this.style)
    
    get circuitBlock(): FunctionBlockInterface { return this._circuitBlock }

    constructor(parent: HTMLElement, size: Vec2, scale: Vec2, style: Readonly<Style> = defaultStyle)
    {
        super(parent, size, scale, style, {
            backgroundColor: style.colors.background,
            fontFamily: 'system-ui',
            fontSize: Math.round(scale.y * style.fontSize)+'px'
        })
        
        this.grid = new CircuitGrid(this)
        this.body = new CircuitBody(this)
        this.inputArea = new CircuitIOArea(this, 'inputs')
        this.outputArea = new CircuitIOArea(this, 'outputs')
        this.traceLayer = new TraceLayer(this.DOMElement, this.scale, this.style)
        
        this.pointer.attachEventHandler(CircuitPointerHandler(this))
    }

    protected inputPins: CircuitIOView[]
    protected outputPins: CircuitIOView[]
    
    blockViews = new Map<FunctionBlockInterface, FunctionBlockView>()
    traceLines = new Map<IOPinInterface, TraceLine>()

    protected createFunctionBlockView(block: FunctionBlockInterface, pos: Vec2) {
        const blockView = new FunctionBlockView(block, pos, this.body.children)
        // subscribe for io connection events
        block.inputs.forEach(input => input.events.subscribe(this.ioEventHandler, [ IOPinEventType.SourceChanged ]))

        block.events.subscribe(this.functionBlockEventHandler, [ BlockEventType.InputAdded, BlockEventType.Removed ])
        
        this.blockViews.set(block, blockView)
        this.requestUpdate(this.grid)
        return blockView
    }

    protected createConnectionTrace(destIO: IOPinInterface) {
        if (destIO.sourcePin) {
            const destBlock = destIO.block
            const destPin = (destBlock == this.circuitBlock)
                ? this.getPinForIO(destIO)
                : this.blockViews.get(destBlock)?.getPinForIO(destIO)
            const sourceBlock = destIO.sourcePin.block
            const sourcePin = (sourceBlock == this.circuitBlock)
                ? this.getPinForIO(destIO.sourcePin)
                : this.blockViews.get(sourceBlock)?.getPinForIO(destIO.sourcePin)
            
            if (destPin && sourcePin) {
                const traceLine = new TraceLine(this, sourcePin, destPin)
                this.traceLines.set(destIO, traceLine)
                this.requestUpdate(this.grid)
            }
            else if (!destPin) console.error('Trace failed. Destination IO pin view not found', destIO)
            else if (!sourcePin) console.error('Trace failed. Source IO pin view not found', destIO.sourcePin)
        }
        else console.error('Trace failed. IO has no source', destIO)
    }

    protected createCircuitIOViews(def: CircuitViewDefinition)
    {
        this.inputPins ??= this.circuitBlock.inputs.map((input, index) => {
            const posY = def.positions?.inputs?.[index] || index
            return this.createCircuitIOView(input, posY)
        })
        this.outputPins ??= this.circuitBlock.outputs.map((output, index) => {
            const posY = def.positions?.outputs?.[index] || index
            return this.createCircuitIOView(output, posY)
        })
    }

    protected createCircuitIOView(io: IOPinInterface, posY: number) {
        const parentContainer = (io.type == 'input') ? this.inputArea : this.outputArea
        const ioView = new CircuitIOView(io, posY, parentContainer.children)
        if (ioView.pin.direction == 'left') io.events.subscribe(this.ioEventHandler.bind(this), [IOPinEventType.SourceChanged])
        return ioView 
    }

    protected onResize() {
        this.grid.resize()
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