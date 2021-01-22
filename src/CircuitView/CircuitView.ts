import Vec2, { vec2 } from '../Lib/Vector2.js'
import GUIView from '../GUI/GUIView.js'
import CircuitGrid from './CircuitGrid.js'
import { CircuitElement, CircuitStyle, defaultStyle, ElementType } from './CircuitTypes.js'
import { Circuit, FunctionBlock, IOConnection } from './CircuitState.js'
import FunctionBlockView from './FunctionBlockView.js'
import * as HTML from '../Lib/HTML.js'
import { GUIChildElement } from '../GUI/GUIChildElement.js'
import TraceLayerBezier from './TraceLayerBezier.js'
import { ID, IORef } from '../Controller/ControllerDataTypes.js'
import FunctionBlockPinView from './FunctionBlockPinView.js'
import GUIContainer from '../GUI/GUIContainer.js'
import { CircuitTrace, ICircuitTraceLayer } from './CircuitTrace.js'
import CircuitIOView from './CircuitIOView.js'

const enum DraggingMode {
    NONE,
    SCROLL_VIEW,
    DRAG_ELEMENT,
    SELECTION_BOX
}

const enum MouseButton {
    LEFT =   1,
    RIGHT =  2,
    MIDDLE = 4
}

const debugLogging = true
function logInfo(...args: any[]) { debugLogging && console.info('Circuit View:', ...args)}
function logError(...args: any[]) { console.error('Circuit View:', ...args)}

function backgroundGridStyle(scale: Vec2, lineColor: string) {
    return {
        backgroundImage: `linear-gradient(to right, ${lineColor} 1px, transparent 1px), linear-gradient(to bottom, ${lineColor} 1px, transparent 1px)`,
        backgroundSize: `${scale.x}px ${scale.y}px`
    } as Partial<CSSStyleDeclaration>
}
function backgroundLinesStyle(scale: Vec2, lineColor: string) {
    return {
        backgroundImage: `linear-gradient(to bottom, ${lineColor} 1px, transparent 1px)`,
        backgroundSize: `${scale.x}px ${scale.y}px`
    } as Partial<CSSStyleDeclaration>
}
function backgroundDotStyle(scale: Vec2, lineColor: string) {
    return {
        backgroundImage: `radial-gradient(circle, ${lineColor} 1px, transparent 1px)`,
        backgroundSize: `${scale.x}px ${scale.y}px`
    } as Partial<CSSStyleDeclaration>
}

////////////////////////////////////
//    Circuit Input/Output Area
////////////////////////////////////
class IOArea extends GUIChildElement implements CircuitElement {
    constructor(view: CircuitView, type: 'inputArea' | 'outputArea')
    {
        super(view.children, 'div',
            (type == 'inputArea') ? vec2(0, 0) : vec2(view.size.x - view.style.IOAreaWidth, 0),
            vec2(view.style.IOAreaWidth, view.size.y), {
                //borderRight: '1px solid '+view.style.colorPanelLines,
                backgroundColor: view.style.colorPanel,
                ...backgroundLinesStyle(Vec2.mul(vec2(view.style.IOAreaWidth, 1), view.scale), view.style.colorPanelLines)
            }, true)
        this.type = type
    }
    createCircuitIOViews(circuit: Circuit) {
        this.circuit = circuit
        let ioNumStart: number
        let ioNumEnd: number
        if (this.type == 'inputArea') {
            ioNumStart = 0
            ioNumEnd = circuit.funcData.inputCount - 1
        } else {
            ioNumStart = circuit.funcData.inputCount
            ioNumEnd = ioNumStart + circuit.funcData.outputCount - 1
        }
        for (let ioNum = ioNumStart; ioNum <= ioNumEnd; ioNum++) {
            this.ioViews.push(new CircuitIOView(this.children, circuit, ioNum, vec2(0, ioNum + 2) ))
        }
    }
    circuit: Circuit
    type: ElementType
    ioViews: CircuitIOView[] = []
    get id(): number { return this.circuit.offlineID }
    gui: CircuitView
}

/////////////////////////////
//    Circuit Block Area
/////////////////////////////
class BlockArea extends GUIChildElement implements CircuitElement {
    constructor(view: CircuitView) {
        super(view.children, 'div',
            vec2(view.style.IOAreaWidth, 0),
            Vec2.sub(view.size, vec2(view.style.IOAreaWidth*2, 0)), {

            }, true)
    }
    type: 'blockArea'
    id: ID
    gui: CircuitView
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
            ...backgroundGridStyle(scale, style.colorGridLine)
        })

        this.traceLayer = new TraceLayerBezier(this.DOMElement, this.scale, this.gui.style)
        this.blockArea = new BlockArea(this)
        this.inputArea = new IOArea(this, 'inputArea')
        this.outputArea = new IOArea(this, 'outputArea')

        window.onkeydown = this.onKeyDown.bind(this)
        window.onkeyup = this.onKeyUp.bind(this)
    }


    circuit: Circuit
    gridMap = new CircuitGrid()
    traceLayer: ICircuitTraceLayer

    blockArea: BlockArea
    inputArea: IOArea
    outputArea: IOArea

    draggingMode: DraggingMode
    scrollStartPos: Vec2
    connectingTraceID: ID = -1

    selectedElements = new Set<CircuitElement>()
    selectedElementsInitPos = new Map<CircuitElement, Vec2>()
    
    selectionBox: HTMLDivElement
    selectionBoxInitPos: Vec2

    blocks = new Map<ID, FunctionBlockView>()
    traces = new Map<ID, CircuitTrace>()


    loadCircuit(circuit: Circuit) {
        this.circuit = circuit
        this.circuit.onModificationUploaded = (type, success, blockID, ioNum) => {
            
        }
        console.log('CircuitView: Load circuit')
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
                if (inputPin.connection) {
                    const outputPin = this.getConnectionSourcePin(inputPin.connection)
                    this.createConnectionTrace(outputPin, inputPin)
                }
            })
        })
    }

    createFunctionBlockView(funcBlock: FunctionBlock, pos: Vec2, ) {
        const block = new FunctionBlockView(this.blockArea.children, pos, funcBlock)
        this.blocks.set(funcBlock.offlineID, block)
    }

    deleteFunctionBlock(block: FunctionBlockView) {
        this.traces.forEach(trace => trace.isConnectedTo(block) && this.disconnect(trace.inputPin))
        this.circuit.deleteFunctionBlock(block.id)
        this.blocks.delete(block.id)
        block.delete()
    }

    connect(outputPin: FunctionBlockPinView, inputPin: FunctionBlockPinView, inverted = false) {
        logInfo('connect', outputPin.id, inputPin.id)
        this.circuit.connectFunctionBlockInput(inputPin.blockID, inputPin.ioNum, outputPin.blockID, outputPin.ioNum)
        this.createConnectionTrace(outputPin, inputPin, inverted)
    }
    
    disconnect(inputPin: FunctionBlockPinView) {
        logInfo('disconnect', inputPin.id)
        this.circuit.disconnectFunctionBlockInput(inputPin.blockID, inputPin.ioNum)
        this.deleteConnectionTrace(inputPin.id)
    }

    createConnectionTrace(outputPin: FunctionBlockPinView, inputPin: FunctionBlockPinView, inverted = false) {
        logInfo('create trace', inputPin.id)
        if (inputPin.connection) {
            this.deleteConnectionTrace(inputPin.id)
        }
        const trace = new CircuitTrace(this.traceLayer, outputPin, inputPin)
        this.traces.set(inputPin.id, trace)
    }
    
    deleteConnectionTrace(id: ID) {
        const trace = this.traces.get(id)
        if (!trace) return
        logInfo('delete trace', id)
        trace.delete()
        this.traces.delete(id)
    }

    // Get connection source pin element
    getConnectionSourcePin(conn: IORef) {
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


    /////////////////////////
    //      DRAGGING
    /////////////////////////

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
    
    draggingElement(elem: CircuitElement, startPos: Vec2, offset: Vec2, currentPos: Vec2) {
        switch(elem.type) {
            case 'circuitInput':
            case 'circuitOutput': 
            case 'block': {
                elem.setPos(currentPos)
                this.traces.forEach((trace, id) => (trace.isConnectedTo(elem)) && this.updateRequests.add(trace))
                break
            }
            case 'inputPin': {
                const absPos = Vec2.div(this.pointer.relativeDownPos, this.scale).add(offset).sub(vec2(0.5))
                this.traceLayer.updateTrace(this.connectingTraceID, absPos, elem.absPos)
                break
            }
            case 'outputPin': {
                const absPos = Vec2.div(this.pointer.relativeDownPos, this.scale).add(offset).sub(vec2(0.5))
                this.traceLayer.updateTrace(this.connectingTraceID, elem.absPos, absPos)
                break
            }
        }
    }

    dragElementEnded(elem: CircuitElement, startPos: Vec2, offset: Vec2, currentPos: Vec2) {
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
                else if (inputPin.connection && targetElem?.type == 'inputPin' && targetElem != inputPin) {
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
            case 'block': {}
        }
    }
    unselectElement(elem: CircuitElement) {
        this.selectedElements.delete(elem)
        elem.onUnselected()
        
        switch(elem.type) {
            case 'block': {}
        }
    }
    unselectAll() {
        this.selectedElements.forEach(elem => this.unselectElement(elem))
    }


    ////////////////////////////////
    //      POINTER HANDLING
    ////////////////////////////////

    onPointerDown = (ev: PointerEvent) => {
        const elem = this.pointer.downTargetElem

        if (elem?.isSelectable && !ev.shiftKey) {
            if (!this.selectedElements.has(elem)) {
                this.unselectAll()
                this.selectElement(elem)
            }
        }
        if (elem?.isSelectable && ev.shiftKey && (elem?.isMultiSelectable || this.selectedElements.size == 0)) {
            (this.selectedElements.has(elem)) ? this.unselectElement(elem) : this.selectElement(elem)
        }
    }

    onClicked = (ev: PointerEvent) => {
        const elem = this.pointer.downTargetElem

        if (!elem?.isSelectable && !ev.shiftKey) {
            this.unselectAll()
        }

        console.log('Clicked:', this.elementToString(elem), this.pointer.relativeDownPos)
    }

    onDoubleClicked = (ev: PointerEvent) => {
        if (this.pointer.downTargetElem?.isSelectable) this.unselectAll()
    }

    onDragStarted = (ev: PointerEvent) => {
        // Start scrolling view
        if (this.pointer.targetElem == this.blockArea && ev.buttons == MouseButton.RIGHT) {
            this.draggingMode = DraggingMode.SCROLL_VIEW
            this.scrollStartPos = vec2(this.parentDOM.scrollLeft, this.parentDOM.scrollTop)
            this.DOMElement.style.cursor = 'grab'
        }
        // Start selection box
        else if (this.pointer.targetElem == this.blockArea && ev.buttons == MouseButton.LEFT) {
            this.draggingMode = DraggingMode.SELECTION_BOX
            this.selectionBoxInitPos = this.blockArea.relativePixelPos(this.pointer.downPos)
            this.selectionBox = HTML.domElement(this.blockArea.DOMElement, 'div', {
                position: 'absolute',
                backgroundColor: 'rgba(128,128,255,0.2)',
                border: 'thin solid #88F',
                pointerEvents: 'none',
                ...getPositiveRectAttributes(this.selectionBoxInitPos, this.pointer.dragOffset)
            })
            console.log('selection start:', this.selectionBoxInitPos)
        }
        // Start dragging selection
        else if (this.pointer.isDragging && this.pointer.downTargetElem?.isDraggable) {
            this.draggingMode = DraggingMode.DRAG_ELEMENT
            this.pointer.dragTargetInitPos = this.pointer.downTargetElem.pos.copy()
            this.selectedElements.forEach(elem => {
                this.dragElementStarted(elem)
                elem.onDragStarted?.(ev, this.pointer)
            })
        }
    }
    onDragging = (ev: PointerEvent) => {
        switch(this.draggingMode)
        {
            case DraggingMode.SCROLL_VIEW:
                this.parentDOM.scrollLeft = this.scrollStartPos.x - this.pointer.dragOffset.x
                this.parentDOM.scrollTop = this.scrollStartPos.y - this.pointer.dragOffset.y
                break
            
            case DraggingMode.SELECTION_BOX:
                Object.assign(this.selectionBox.style, getPositiveRectAttributes(this.selectionBoxInitPos, this.pointer.dragOffset))
                break

            case DraggingMode.DRAG_ELEMENT:
                const offset = Vec2.div(this.pointer.dragOffset, this.scale)
                this.selectedElements.forEach(elem => {
                    const initPos = this.selectedElementsInitPos.get(elem)
                    const currentPos = Vec2.add(initPos, offset)
                    this.draggingElement(elem, initPos, offset, currentPos)
                    elem.onDragging?.(ev, this.pointer)
                })
                break
        }
    }
    onDragEnded = (ev: PointerEvent) => {
        switch(this.draggingMode)
        {
            case DraggingMode.SCROLL_VIEW:
                this.DOMElement.style.cursor = 'default'
                break
            
            case DraggingMode.SELECTION_BOX:
                if (!ev.shiftKey) this.unselectAll()
                this.blocks.forEach(block => {
                    const pos = Vec2.div(this.selectionBoxInitPos, this.scale)
                    const size = Vec2.div(this.pointer.dragOffset, this.scale)
                    if (isElementInsideRect(block, pos, size)) {
                        this.selectElement(block)
                    }
                })
                this.blockArea.DOMElement.removeChild(this.selectionBox)
                break

            case DraggingMode.DRAG_ELEMENT:
                const offset = Vec2.div(this.pointer.dragOffset, this.scale)
                this.selectedElements.forEach(elem => {
                    const initPos = this.selectedElementsInitPos.get(elem)
                    const currentPos = Vec2.add(initPos, offset)
                    this.dragElementEnded(elem, initPos, offset, currentPos)
                    elem.onDragEnded?.(ev, this.pointer)
                })
                break
        }

        this.draggingMode = DraggingMode.NONE
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


function getPositiveRectAttributes(pos: Vec2, size: Vec2)
{
    let {x, y} = pos
    let {x: w, y: h} = size
    if (w < 0) {
        w *= -1
        x -= w
    }
    if (h < 0) {
        h *= -1
        y -= h
    }
    return {
        left:   x + 'px',
        top:    y + 'px',
        width:  w + 'px',
        height: h + 'px',
    }
}

function isElementInsideRect(elem: GUIChildElement, rectPos: Vec2, rectSize: Vec2) {
    let {x: left, y: top} = rectPos
    let {x: width, y: height} = rectSize
    if (width < 0) {
        width *= -1
        left -= width
    }
    if (height < 0) {
        height *= -1
        top -= height
    }
    const right = left + width
    const bottom = top + height
    const elemRight = elem.pos.x + elem.size.x
    const elemBottom = elem.pos.y + elem.size.y
    return (elem.pos.x > left && elemRight < right && elem.pos.y > top && elemBottom < bottom)
}