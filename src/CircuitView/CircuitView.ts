import Vec2, { vec2 } from '../Lib/Vector2.js'
import GUIView from '../GUI/GUIView.js'
import CircuitGrid from './CircuitGrid.js'
import { CircuitElement, CircuitStyle, ElementType } from './CircuitTypes.js'
import { Circuit } from './CircuitState.js'
import FunctionBlockView from './FunctionBlockView.js'
import * as HTML from '../Lib/HTML.js'
import { GUIChildElement } from '../GUI/GUIChildElement.js'
import TraceLayerBezier from './TraceLayerBezier.js'
import { ID, IORef } from '../Controller/ControllerDataTypes.js'
import FunctionBlockPinView from './FunctionBlockPinView.js'
import { CircuitTrace, ICircuitTraceLayer } from './CircuitTrace.js'
import { FunctionBlock } from './FunctionBlockState.js'
import CircuitPointerHandler from './CircuitPointerHandler.js'
import IOArea from './CircuitIOArea.js'


const debugLogging = false
function logInfo(...args: any[]) { debugLogging && console.info('Circuit View:', ...args)}
function logError(...args: any[]) { console.error('Circuit View:', ...args)}



/////////////////////////////
//    Circuit Block Area
/////////////////////////////

class BlockArea extends GUIChildElement implements CircuitElement
{
    constructor(view: CircuitView) {
        super(view.children, 'div',
            vec2(view.style.IOAreaWidth, 0),
            Vec2.sub(view.size, vec2(view.style.IOAreaWidth*2, 0)), {}, true
        )
    }
    type: 'blockArea'
    id: ID
    declare gui: CircuitView
}


/////////////////////////////
//      Circuit View
/////////////////////////////

export default class CircuitView extends GUIView<CircuitElement, CircuitStyle>
{
    constructor(parent: HTMLElement, size: Vec2, scale: Vec2, style: CircuitStyle)
    {
        super(parent, Vec2.add(size, vec2(style.IOAreaWidth*2, 0)), scale, style, {
            backgroundColor: style.colorBackground,
            ...HTML.backgroundGridStyle(scale, style.colorGridLine),
            fontFamily: 'system-ui',
            fontSize: Math.round(scale.y * style.fontSize)+'px'

        })
        parent.style.backgroundColor = style.colorBackground

        this.traceLayer = new TraceLayerBezier(this.DOMElement, this.scale, this.gui.style)
        this.blockArea = new BlockArea(this)
        this.inputArea = new IOArea(this, 'inputArea')
        this.outputArea = new IOArea(this, 'outputArea')

        window.onkeydown = this.onKeyDown.bind(this)
        window.onkeyup = this.onKeyUp.bind(this)

        this.pointer.attachEventHandler(CircuitPointerHandler(this))

    }

    circuit: Circuit
    gridMap = new CircuitGrid()
    traceLayer: ICircuitTraceLayer

    blockArea: BlockArea
    inputArea: IOArea
    outputArea: IOArea

    connectingTraceID: ID = -1

    funcPendingPlacement: FunctionBlock
    blockInPlacement: FunctionBlockView

    selectedElements = new Set<CircuitElement>()
    selectedElementsInitPos = new WeakMap<CircuitElement, Vec2>()
    
    selectionBox: HTMLDivElement
    selectionBoxInitPos: Vec2

    blocks = new Map<ID, FunctionBlockView>()
    traces = new Map<ID, CircuitTrace>()

    loadCircuit(circuit: Circuit) {
        console.log('CircuitView: Load circuit')
        this.circuit = circuit
        const margin = vec2(6, 2)
        const area = vec2(16, 8)
        const w = (this.size.x - margin.x*2)
        
        // Define circuit IO
        this.inputArea.createCircuitIOViews(circuit)
        this.outputArea.createCircuitIOViews(circuit)

        // Create function block views
        circuit.blocks.forEach((block, i) => {
            const n = i * area.x
            const row = Math.trunc(n / w)
            const col = n - row * w
            const y = margin.y + row * area.y
            const x = margin.x + col
            this.createFunctionBlockView(block, vec2(x, y))
        })

        // Create connection traces
        this.blocks.forEach(funcBlockElem => {
            funcBlockElem.inputPins.forEach(inputPin => {
                if (inputPin.source) {
                    const outputPin = this.getSourcePin(inputPin.source)
                    const trace = this.createConnectionTrace(outputPin, inputPin)
                    trace.validate()
                }
            })
        })
    }

    createFunctionBlockView(funcBlock: FunctionBlock, pos: Vec2, ) {
        const block = new FunctionBlockView(this.blockArea.children, pos, funcBlock)
        this.blocks.set(funcBlock.id, block)
        return block
    }

    deleteFunctionBlock(block: FunctionBlockView) {
        this.traces.forEach(trace => trace.isConnectedTo(block) && this.disconnect(trace.inputPin))
        this.circuit.deleteFunctionBlock(block.id)
        this.blocks.delete(block.id)
        block.delete()
    }

    connect(outputPin: FunctionBlockPinView, inputPin: FunctionBlockPinView, inverted = false) {
        logInfo('connect', outputPin.id, inputPin.id)
        
        if (inputPin.funcState.isCircuit) {
            this.circuit.setOutputRef(inputPin.ioNum, outputPin.funcState.id, outputPin.ioNum)
        }
        else {
            inputPin.funcState.setInputRef(inputPin.ioNum, outputPin.blockID, outputPin.ioNum)
        }
        this.createConnectionTrace(outputPin, inputPin, inverted)
    }
    
    disconnect(inputPin: FunctionBlockPinView) {
        logInfo('disconnect', inputPin.id)
        if (inputPin.funcState.isCircuit) {
            this.circuit.setOutputRef(inputPin.ioNum, null, 0)
        }
        else {
            inputPin.funcState.setInputRef(inputPin.ioNum, null, 0)
        }
        this.deleteConnectionTrace(inputPin.id)
    }

    createConnectionTrace(outputPin: FunctionBlockPinView, inputPin: FunctionBlockPinView, inverted = false) {
        logInfo('create trace', inputPin.id)
        if (inputPin.source) {
            this.deleteConnectionTrace(inputPin.id)
        }
        const trace = new CircuitTrace(this.traceLayer, outputPin, inputPin)
        this.traces.set(inputPin.id, trace)
        return trace
    }
    
    deleteConnectionTrace(id: ID) {
        const trace = this.traces.get(id)
        if (!trace) return
        logInfo('delete trace', id)
        trace.delete()
        this.traces.delete(id)
    }

    // Get connection source pin element
    getSourcePin(conn: IORef) {
        let outputPin: FunctionBlockPinView
        if (conn.id == -1) {
            outputPin = this.inputArea.ioViews[conn.ioNum].ioPin
        }
        else {
            const sourceBlockElem = this.blocks.get(conn.id)
            outputPin = sourceBlockElem.outputPins[conn.ioNum - sourceBlockElem.inputPins.length]
        }
        return outputPin
    }


    // Element info to debug string
    elementToString(elem: CircuitElement) {
        if (!elem) return 'undefined'
        return `type: ${elem.type}, id: ${elem.id}, pos: ${elem.absPos.toString()}`    
    }

    deleteElement(elem: CircuitElement) {
        console.log('Delete element', elem)
        switch (elem.type)
        {
            case 'inputPin':
                this.disconnect(elem as FunctionBlockPinView)
                break
            
            case 'block':
                this.deleteFunctionBlock(elem as FunctionBlockView)
                break
        }
    }

    insertBlock(lib: number, opcode: number) {
        this.funcPendingPlacement = this.circuit.addFunctionBlock(lib, opcode)
        if (this.pointer.targetElem == this.blockArea) {

        }
    }

    startBlockPlacement() {
        logInfo('Start block placement')
        this.blockInPlacement = this.createFunctionBlockView(this.funcPendingPlacement, this.blockArea.pointerScaledPos())
        this.blockInPlacement.DOMElement.style.pointerEvents = 'none'
        this.funcPendingPlacement = undefined
    }

    ////////////////////////////
    //      DRAG ELEMENT
    ////////////////////////////

    dragElementStarted(elem: CircuitElement) {
        switch(elem.type) {
            case 'circuitInput':
            case 'circuitOutput': 
            case 'block':
                this.selectedElementsInitPos.set(elem, elem.pos.copy())
                break
            case 'inputPin':
            case 'outputPin':
                this.selectedElementsInitPos.set(elem, elem.pos.copy())
                this.traceLayer.addTrace(this.connectingTraceID, elem.absPos, elem.absPos, this.style.colorPinHover)
                break
        }
    }
    
    draggingElement(elem: CircuitElement, initPos: Vec2, offset: Vec2, currentPos: Vec2) {
        switch(elem.type) {
            case 'circuitInput':
            case 'circuitOutput': 
            case 'block': {
                elem.setPos(currentPos)
                this.traces.forEach((trace, id) => (trace.isConnectedTo(elem)) && this.updateRequests.add(trace))
                break
            }
            case 'inputPin': {
                const absPos = this.pointer.scaledPos.sub(vec2(0.5))
                this.traceLayer.updateTrace(this.connectingTraceID, absPos, elem.absPos)
                break
            }
            case 'outputPin': {
                const absPos = this.pointer.scaledPos.sub(vec2(0.5))
                this.traceLayer.updateTrace(this.connectingTraceID, elem.absPos, absPos)
                break
            }
        }
    }

    dragElementEnded(elem: CircuitElement, initPos: Vec2, offset: Vec2, currentPos: Vec2) {
        switch(elem.type) {
            case 'circuitInput':
            case 'circuitOutput': 
            case 'block': {
                elem.setPos(Vec2.round(elem.pos))
                this.traces.forEach((trace, id) => (trace.isConnectedTo(elem)) && this.updateRequests.add(trace))
                break
            }
            case 'inputPin': {
                const targetElem = this.pointer.targetElem
                const inputPin = elem as FunctionBlockPinView
                if (targetElem?.type == 'outputPin') {
                    const outputPin = targetElem as FunctionBlockPinView
                    this.connect(outputPin, inputPin)
                }
                else if (inputPin.source && targetElem?.type == 'inputPin' && targetElem != inputPin) {
                    const trace = this.traces.get(inputPin.id)
                    this.connect(trace.outputPin, targetElem as FunctionBlockPinView)
                    this.disconnect(inputPin)
                }
                this.traceLayer.deleteTrace(this.connectingTraceID)
                this.unselectAll()
                break
            }
            case 'outputPin': {
                const outputPin = elem as FunctionBlockPinView
                const targetElem = this.pointer.targetElem
                if (targetElem?.type == 'inputPin') {
                    const inputPin = targetElem as FunctionBlockPinView
                    this.connect(outputPin, inputPin)
                }
                else if (targetElem?.type == 'outputPin' && targetElem != outputPin) {
                    // Move output pin connection
                    const connectedTraces = Array.from(this.traces.values()).filter(trace => trace.outputPin == outputPin)
                    if (connectedTraces.length > 0) {
                        const newSourcePin = targetElem as FunctionBlockPinView
                        connectedTraces.forEach(trace => this.connect(newSourcePin, trace.inputPin))
                    }
                }
                this.traceLayer.deleteTrace(this.connectingTraceID)
                this.unselectAll()
                break
            }
        }
    }

    /////////////////////////
    //      SELECTION
    /////////////////////////

    selectElement(elem: CircuitElement) {
        this.selectedElements.add(elem)
        elem.onSelected()

        switch(elem.type) {
            case 'block': {
                this.blocks.forEach(block => block.setInfoVisibility('visible'))
                break
            }
        }
    }
    unselectElement(elem: CircuitElement) {
        this.selectedElements.delete(elem)
        elem.onUnselected()
        
        switch(elem.type) {
            case 'block': {
                if (this.selectedElements.size == 0) this.blocks.forEach(block => block.setInfoVisibility('hidden'))
                break
            }
        }
    }
    unselectAll() {
        this.selectedElements.forEach(elem => this.unselectElement(elem))
    }


    ////////////////////////////////
    //      KEYBOARD HANDLING
    ////////////////////////////////
    onKeyDown(ev: KeyboardEvent) {
        switch(ev.code)
        {
            case 'Delete':
            case 'Backspace':
            {
                this.selectedElements.forEach(elem => this.deleteElement(elem))
                this.unselectAll()
                break
            }
        }
    }
    
    onKeyUp(ev: KeyboardEvent) {
        console.log('Key up', ev.code, ev.key)
    }
}