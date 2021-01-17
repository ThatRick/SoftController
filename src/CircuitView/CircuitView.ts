import Vec2, { vec2 } from '../Lib/Vector2.js'
import GUIView from '../GUI/GUIView.js'
import CircuitGrid from './CircuitGrid.js'
import { CircuitElement, CircuitStyle, defaultStyle } from './CircuitTypes.js'
import { Circuit, FunctionBlock, Input, IOConnection, Output } from './CircuitModel.js'
import FunctionBlockView from './FunctionBlockView.js'
import * as HTML from '../Lib/HTML.js'
import { GUIChildElement } from '../GUI/GUIChildElement.js'
import TraceLayerBezier from './TraceLayerBezier.js'
import { ID } from '../Controller/ControllerDataTypes.js'
import FunctionBlockPinView from './FunctionBlockPinView.js'
import GUIContainer from '../GUI/GUIContainer.js'

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


export interface ICircuitTraceLayer {
    addTrace(id: number, outputPos: Vec2, inputPos: Vec2, color: string)
    updateTrace(id: number, outputPos: Vec2, inputPos: Vec2)
    deleteTrace(id: number)
    setTraceColor(id: number, color: string)
    onTraceSelected: (id: number) => void
}


class CircuitTrace {
    constructor(
        public layer: ICircuitTraceLayer,
        public outputPin: FunctionBlockPinView<Output>,
        public inputPin: FunctionBlockPinView<Input>
    ) {
        this.id = inputPin.id
        layer.addTrace(this.id, outputPin.absPos, inputPin.absPos, outputPin.color)
        outputPin.onPinUpdated = this.updateColor.bind(this)
    }
    id: ID

    updateColor() {
        console.log('CircuitTrace: update pin color', this.id, this.outputPin.color)
        this.layer.setTraceColor(this.id, this.outputPin.color)
    }

    update() {
        this.layer.updateTrace(this.id, this.outputPin.absPos, this.inputPin.absPos)
        return false
    }
    delete() {

    }
    isConnectedTo(block: CircuitElement) {
        const isConnected = (this.inputPin.blockID == block.id || this.outputPin.blockID == block.id)
        return isConnected
    }
}

class BlockArea extends GUIChildElement implements CircuitElement {
    constructor(parent: GUIContainer<CircuitElement>, pos: Vec2, size: Vec2) {
        super(parent, 'div', vec2(6, 0), size, {
            backgroundColor: '#104'
        }, true)
    }
    type: 'circuitArea'
    id: ID
    gui: CircuitView

    get absPos() { return vec2(0, 0) }
}


/////////////////////////////
//      Circuit View
/////////////////////////////

export default class CircuitView extends GUIView<CircuitElement, CircuitStyle>
{
    constructor(parent: HTMLElement, size: Vec2, scale: Vec2)
    {
        super(parent, Vec2.add(size, vec2(defaultStyle.IOAreaWidth*2, 0)), scale, defaultStyle)
        parent.style.backgroundColor = this.gui.style.colorBackground

        this.circuitArea = new BlockArea(this.children,
            vec2(this.gui.style.IOAreaWidth, 0),
            size
        )
        this.traceLayer = new TraceLayerBezier(this.circuitArea.DOMElement, this.scale, this.gui.style)
    }

    circuitArea: CircuitElement

    gridMap = new CircuitGrid()

    traceLayer: ICircuitTraceLayer

    scrollStartPos: Vec2
    draggingMode: DraggingMode

    selectedElements = new Set<CircuitElement>()
    selectedElementsInitPos = new Map<CircuitElement, Vec2>()
    selectionBox: HTMLDivElement

    blocks = new Map<ID, FunctionBlockView>()
    traces = new Map<ID, CircuitTrace>()

    internalInputPins: FunctionBlockPinView<Output>[] = []
    internalOutputPins: FunctionBlockPinView<Input>[] = []

    loadCircuit(circuit: Circuit) {
        console.log('CircuitView: Load circuit')
        const margin = vec2(6, 2)
        const area = vec2(16, 8)
        const w = (this.size.x - margin.x*2)
        
        // blocks
        circuit.blocks.forEach((block, i) => {
            const n = i * area.x
            const row = Math.trunc(n / w)
            const col = n - row * w
            const y = margin.y + row * area.y
            const x = margin.x + col
            this.addFunctionBlock(vec2(x, y), block)
        })

        // Late initialization vittuun! GUIView on aina olemassa kun elementtiä luodaan. Turhaa kikkailua ja johtaa tähän paskaan:
        setTimeout(() => this.createCircuitTraces(), 10)
    }

    getConnectionSourcePin(conn: IOConnection) {
        let outputPin: FunctionBlockPinView<Output>
        if (conn.sourceBlockID == -1) {
            outputPin = this.internalInputPins[conn.outputNum]
        }
        else {
            const sourceBlockElem = this.blocks.get(conn.sourceBlockID)
            outputPin = sourceBlockElem.outputPins[conn.outputNum]
        }
        return outputPin
    }

    createCircuitTraces() {
        console.log('CircuitView: Create traces')
        // draw traces
        interface Connection { outputPin: FunctionBlockPinView<Output>, inputPin: FunctionBlockPinView<Input> }
        this.blocks.forEach(funcBlockElem => {
            funcBlockElem.inputPins.forEach(inputPin => {
                const conn = inputPin.io.getConnection()
                if (conn) {
                    const outputPin = this.getConnectionSourcePin(conn)
                    outputPin && this.traces.set(inputPin.id, new CircuitTrace(this.traceLayer, outputPin, inputPin))
                }
            })
        })
    }

    addFunctionBlock(pos: Vec2, funcBlock: FunctionBlock) {
        const block = new FunctionBlockView(this.circuitArea.children, pos, funcBlock)
        this.blocks.set(funcBlock.offlineID, block)
    }

    // Element info to debug string
    elementToString(elem: CircuitElement) {
        if (!elem) return 'undefined'
        return `type: ${elem.type}, id: ${elem.id}, pos: ${elem.absPos.toString()}`    
    }


    /////////////////////////
    //      DRAGGING
    /////////////////////////

    dragElementStarted(elem: CircuitElement) {
        this.selectedElementsInitPos.set(elem, elem.pos.copy())
    }
    
    draggingElement(elem: CircuitElement, startPos: Vec2, offset: Vec2, currentPos: Vec2) {
        switch(elem.type) {
            case 'block': {
                elem.pos = currentPos
                this.traces.forEach((trace, id) => (trace.isConnectedTo(elem)) && this.updateRequests.add(trace))
                break
            }
            case 'input': {
                break
            }
            case 'output': {
                break
            }
        }
    }

    dragElementEnded(elem: CircuitElement, startPos: Vec2, offset: Vec2, currentPos: Vec2) {
        elem.pos = Vec2.round(elem.pos)
        this.traces.forEach((trace, id) => (trace.isConnectedTo(elem)) && this.updateRequests.add(trace))
    }

    /////////////////////////
    //      SELECTION
    /////////////////////////

    selectElement(elem: CircuitElement) {
        this.selectedElements.add(elem)
        elem.selected()

        switch(elem.type) {
            case 'block': {}
            case 'input': {}
            case 'output': {}
        }
    }
    unselectElement(elem: CircuitElement) {
        this.selectedElements.delete(elem)
        elem.unselected()
        
        switch(elem.type) {
            case 'block': {}
            case 'input': {}
            case 'output': {}
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

        console.log('Clicked:', this.elementToString(elem))
    }

    onDragStarted = (ev: PointerEvent) => {
        // Start scrolling view
        if (this.pointer.targetElem == this.circuitArea && ev.buttons == MouseButton.RIGHT) {
            this.draggingMode = DraggingMode.SCROLL_VIEW
            this.scrollStartPos = vec2(this.parentDOM.scrollLeft, this.parentDOM.scrollTop)
            this.DOMElement.style.cursor = 'grab'
        }
        // Start selection box
        else if (this.pointer.targetElem == this.circuitArea && ev.buttons == MouseButton.LEFT) { 
            this.draggingMode = DraggingMode.SELECTION_BOX
            this.selectionBox = HTML.domElement(this.circuitArea.DOMElement, 'div', {
                position: 'absolute',
                backgroundColor: 'rgba(128,128,255,0.2)',
                border: 'thin solid #88F',
                pointerEvents: 'none',
                ...getPositiveRectAttributes(this.pointer.relativeDownPos, this.pointer.dragOffset)
            })
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
                Object.assign(this.selectionBox.style, getPositiveRectAttributes(this.pointer.relativeDownPos, this.pointer.dragOffset))
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
                    const pos = Vec2.div(this.pointer.relativeDownPos, this.scale)
                    const size = Vec2.div(this.pointer.dragOffset, this.scale)
                    if (isElementInsideRect(block, pos, size)) {
                        this.selectElement(block)
                    }
                })
                this.circuitArea.DOMElement.removeChild(this.selectionBox)
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