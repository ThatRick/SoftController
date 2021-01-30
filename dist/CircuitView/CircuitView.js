import Vec2, { vec2 } from '../Lib/Vector2.js';
import GUIView from '../GUI/GUIView.js';
import CircuitGrid from './CircuitGrid.js';
import FunctionBlockView from './FunctionBlockView.js';
import * as HTML from '../Lib/HTML.js';
import { GUIChildElement } from '../GUI/GUIChildElement.js';
import TraceLayerBezier from './TraceLayerBezier.js';
import { CircuitTrace } from './CircuitTrace.js';
import CircuitIOView from './CircuitIOView.js';
const debugLogging = true;
function logInfo(...args) { debugLogging && console.info('Circuit View:', ...args); }
function logError(...args) { console.error('Circuit View:', ...args); }
function backgroundGridStyle(scale, lineColor) {
    return {
        backgroundImage: `linear-gradient(to right, ${lineColor} 1px, transparent 1px), linear-gradient(to bottom, ${lineColor} 1px, transparent 1px)`,
        backgroundSize: `${scale.x}px ${scale.y}px`
    };
}
function backgroundLinesStyle(scale, lineColor) {
    return {
        backgroundImage: `linear-gradient(to bottom, ${lineColor} 1px, transparent 1px)`,
        backgroundSize: `${scale.x}px ${scale.y}px`
    };
}
function backgroundDotStyle(scale, lineColor) {
    return {
        backgroundImage: `radial-gradient(circle, ${lineColor} 1px, transparent 1px)`,
        backgroundSize: `${scale.x}px ${scale.y}px`
    };
}
////////////////////////////////////
//    Circuit Input/Output Area
////////////////////////////////////
class IOArea extends GUIChildElement {
    constructor(view, type) {
        super(view.children, 'div', (type == 'inputArea') ? vec2(0, 0) : vec2(view.size.x - view.style.IOAreaWidth, 0), vec2(view.style.IOAreaWidth, view.size.y), {
            //borderRight: '1px solid '+view.style.colorPanelLines,
            backgroundColor: view.style.colorPanel,
            ...backgroundLinesStyle(Vec2.mul(vec2(view.style.IOAreaWidth, 1), view.scale), view.style.colorPanelLines)
        }, true);
        this.ioViews = [];
        this.type = type;
    }
    createCircuitIOViews(circuit) {
        this.circuit = circuit;
        let ioNumStart;
        let ioNumEnd;
        if (this.type == 'inputArea') {
            ioNumStart = 0;
            ioNumEnd = circuit.funcState.funcData.inputCount - 1;
        }
        else {
            ioNumStart = circuit.funcState.funcData.inputCount;
            ioNumEnd = ioNumStart + circuit.funcState.funcData.outputCount - 1;
        }
        for (let ioNum = ioNumStart; ioNum <= ioNumEnd; ioNum++) {
            this.ioViews.push(new CircuitIOView(this.children, circuit, ioNum, vec2(0, ioNum + 2)));
        }
    }
    get id() { return this.circuit.funcState.offlineID; }
}
/////////////////////////////
//    Circuit Block Area
/////////////////////////////
class BlockArea extends GUIChildElement {
    constructor(view) {
        super(view.children, 'div', vec2(view.style.IOAreaWidth, 0), Vec2.sub(view.size, vec2(view.style.IOAreaWidth * 2, 0)), {}, true);
    }
}
/////////////////////////////
//      Circuit View
/////////////////////////////
export default class CircuitView extends GUIView {
    constructor(parent, size, scale, style) {
        super(parent, Vec2.add(size, vec2(style.IOAreaWidth * 2, 0)), scale, style, {
            backgroundColor: style.colorBackground,
            ...backgroundGridStyle(scale, style.colorGridLine),
            fontFamily: 'system-ui',
            fontSize: Math.round(scale.y * style.fontSize) + 'px'
        });
        this.gridMap = new CircuitGrid();
        this.connectingTraceID = -1;
        this.selectedElements = new Set();
        this.selectedElementsInitPos = new Map();
        this.blocks = new Map();
        this.traces = new Map();
        ////////////////////////////////
        //      POINTER HANDLING
        ////////////////////////////////
        this.onPointerDown = (ev) => {
            const elem = this.pointer.downTargetElem;
            const selected = Array.from(this.selectedElements.values())[0];
            if (selected?.type == 'outputPin' && elem.type == 'inputPin' && !(elem.reference)) {
                this.connect(selected, elem);
                this.unselectAll();
                return;
            }
            if (selected?.type == 'inputPin' && elem.type == 'outputPin' && !(selected.reference)) {
                this.connect(elem, selected);
                this.unselectAll();
                return;
            }
            if (elem?.isSelectable && !ev.shiftKey) {
                if (!this.selectedElements.has(elem)) {
                    this.unselectAll();
                    this.selectElement(elem);
                }
            }
            if (elem?.isSelectable && ev.shiftKey && (elem?.isMultiSelectable || this.selectedElements.size == 0)) {
                (this.selectedElements.has(elem)) ? this.unselectElement(elem) : this.selectElement(elem);
            }
        };
        this.onClicked = (ev) => {
            const elem = this.pointer.downTargetElem;
            if (!elem?.isSelectable && !ev.shiftKey) {
                this.unselectAll();
            }
            console.log('Clicked:', this.elementToString(elem), this.pointer.relativeDownPos);
        };
        this.onDoubleClicked = (ev) => {
            if (this.pointer.downTargetElem?.isSelectable)
                this.unselectAll();
        };
        this.onDragStarted = (ev) => {
            // Start scrolling view
            if (this.pointer.downTargetElem == this.blockArea && ev.buttons == 2 /* RIGHT */) {
                this.draggingMode = 1 /* SCROLL_VIEW */;
                this.scrollStartPos = vec2(this.parentDOM.scrollLeft, this.parentDOM.scrollTop);
                this.DOMElement.style.cursor = 'grab';
            }
            // Start selection box
            else if (this.pointer.downTargetElem == this.blockArea && ev.buttons == 1 /* LEFT */) {
                this.draggingMode = 3 /* SELECTION_BOX */;
                this.selectionBoxInitPos = this.blockArea.relativePixelPos(this.pointer.downPos);
                this.selectionBox = HTML.domElement(this.blockArea.DOMElement, 'div', {
                    position: 'absolute',
                    backgroundColor: 'rgba(128,128,255,0.2)',
                    border: 'thin solid #88F',
                    pointerEvents: 'none',
                    ...getPositiveRectAttributes(this.selectionBoxInitPos, this.pointer.dragOffset)
                });
                console.log('selection start:', this.selectionBoxInitPos);
            }
            // Start dragging selection
            else if (this.pointer.isDragging && this.pointer.downTargetElem?.isDraggable) {
                this.draggingMode = 2 /* DRAG_ELEMENT */;
                this.pointer.dragTargetInitPos = this.pointer.downTargetElem.pos.copy();
                this.selectedElements.forEach(elem => {
                    this.dragElementStarted(elem);
                    elem.onDragStarted?.(ev, this.pointer);
                });
            }
        };
        this.onDragging = (ev) => {
            switch (this.draggingMode) {
                case 1 /* SCROLL_VIEW */:
                    this.parentDOM.scrollLeft = this.scrollStartPos.x - this.pointer.dragOffset.x;
                    this.parentDOM.scrollTop = this.scrollStartPos.y - this.pointer.dragOffset.y;
                    break;
                case 3 /* SELECTION_BOX */:
                    Object.assign(this.selectionBox.style, getPositiveRectAttributes(this.selectionBoxInitPos, this.pointer.dragOffset));
                    break;
                case 2 /* DRAG_ELEMENT */:
                    const offset = Vec2.div(this.pointer.dragOffset, this.scale);
                    this.selectedElements.forEach(elem => {
                        const initPos = this.selectedElementsInitPos.get(elem);
                        const currentPos = Vec2.add(initPos, offset);
                        this.draggingElement(elem, initPos, offset, currentPos);
                        elem.onDragging?.(ev, this.pointer);
                    });
                    break;
            }
        };
        this.onDragEnded = (ev) => {
            switch (this.draggingMode) {
                case 1 /* SCROLL_VIEW */:
                    this.DOMElement.style.cursor = 'default';
                    break;
                case 3 /* SELECTION_BOX */:
                    if (!ev.shiftKey)
                        this.unselectAll();
                    this.blocks.forEach(block => {
                        const pos = Vec2.div(this.selectionBoxInitPos, this.scale);
                        const size = Vec2.div(this.pointer.dragOffset, this.scale);
                        if (isElementInsideRect(block, pos, size)) {
                            this.selectElement(block);
                        }
                    });
                    this.blockArea.DOMElement.removeChild(this.selectionBox);
                    break;
                case 2 /* DRAG_ELEMENT */:
                    const offset = Vec2.div(this.pointer.dragOffset, this.scale);
                    this.selectedElements.forEach(elem => {
                        const initPos = this.selectedElementsInitPos.get(elem);
                        const currentPos = Vec2.add(initPos, offset);
                        this.dragElementEnded(elem, initPos, offset, currentPos);
                        elem.onDragEnded?.(ev, this.pointer);
                    });
                    break;
            }
            this.draggingMode = 0 /* NONE */;
        };
        parent.style.backgroundColor = style.colorBackground;
        this.traceLayer = new TraceLayerBezier(this.DOMElement, this.scale, this.gui.style);
        this.blockArea = new BlockArea(this);
        this.inputArea = new IOArea(this, 'inputArea');
        this.outputArea = new IOArea(this, 'outputArea');
        window.onkeydown = this.onKeyDown.bind(this);
        window.onkeyup = this.onKeyUp.bind(this);
    }
    loadCircuit(circuit) {
        this.circuit = circuit;
        this.circuit.onOnlineModificationDone = (modification, success) => {
        };
        console.log('CircuitView: Load circuit');
        const margin = vec2(6, 2);
        const area = vec2(16, 8);
        const w = (this.size.x - margin.x * 2);
        // Define circuit IO
        this.inputArea.createCircuitIOViews(circuit);
        this.outputArea.createCircuitIOViews(circuit);
        // Create function block views
        circuit.blocks.forEach((block, i) => {
            const n = i * area.x;
            const row = Math.trunc(n / w);
            const col = n - row * w;
            const y = margin.y + row * area.y;
            const x = margin.x + col;
            this.createFunctionBlockView(block, vec2(x, y));
        });
        // Create connection traces
        this.blocks.forEach(funcBlockElem => {
            funcBlockElem.inputPins.forEach(inputPin => {
                if (inputPin.reference) {
                    const outputPin = this.getConnectionSourcePin(inputPin.reference);
                    const trace = this.createConnectionTrace(outputPin, inputPin);
                    trace.validate();
                }
            });
        });
    }
    createFunctionBlockView(funcBlock, pos) {
        const block = new FunctionBlockView(this.blockArea.children, pos, funcBlock);
        this.blocks.set(funcBlock.offlineID, block);
    }
    deleteFunctionBlock(block) {
        this.traces.forEach(trace => trace.isConnectedTo(block) && this.disconnect(trace.inputPin));
        this.circuit.deleteFunctionBlock(block.id);
        this.blocks.delete(block.id);
        block.delete();
    }
    connect(outputPin, inputPin, inverted = false) {
        logInfo('connect', outputPin.id, inputPin.id);
        if (inputPin.funcState.isCircuit) {
            this.circuit.setOutputRef(inputPin.ioNum, outputPin.funcState.offlineID, outputPin.ioNum);
        }
        else {
            inputPin.funcState.setInputRef(inputPin.ioNum, outputPin.blockID, outputPin.ioNum);
        }
        this.createConnectionTrace(outputPin, inputPin, inverted);
    }
    disconnect(inputPin) {
        logInfo('disconnect', inputPin.id);
        if (inputPin.funcState.isCircuit) {
            this.circuit.setOutputRef(inputPin.ioNum, null, 0);
        }
        else {
            inputPin.funcState.setInputRef(inputPin.ioNum, null, 0);
        }
        this.deleteConnectionTrace(inputPin.id);
    }
    createConnectionTrace(outputPin, inputPin, inverted = false) {
        logInfo('create trace', inputPin.id);
        if (inputPin.reference) {
            this.deleteConnectionTrace(inputPin.id);
        }
        const trace = new CircuitTrace(this.traceLayer, outputPin, inputPin);
        this.traces.set(inputPin.id, trace);
        return trace;
    }
    deleteConnectionTrace(id) {
        const trace = this.traces.get(id);
        if (!trace)
            return;
        logInfo('delete trace', id);
        trace.delete();
        this.traces.delete(id);
    }
    // Get connection source pin element
    getConnectionSourcePin(conn) {
        let outputPin;
        if (conn.id == -1) {
            outputPin = this.inputArea.ioViews[conn.ioNum].ioPin;
        }
        else {
            const sourceBlockElem = this.blocks.get(conn.id);
            outputPin = sourceBlockElem.outputPins[conn.ioNum - sourceBlockElem.inputPins.length];
        }
        return outputPin;
    }
    // Element info to debug string
    elementToString(elem) {
        if (!elem)
            return 'undefined';
        return `type: ${elem.type}, id: ${elem.id}, pos: ${elem.absPos.toString()}`;
    }
    deleteElement(elem) {
        console.log('Delete element', elem);
        switch (elem.type) {
            case 'inputPin':
                this.disconnect(elem);
                break;
            case 'block':
                this.deleteFunctionBlock(elem);
                break;
        }
    }
    /////////////////////////
    //      DRAGGING
    /////////////////////////
    dragElementStarted(elem) {
        switch (elem.type) {
            case 'circuitInput':
            case 'circuitOutput':
            case 'block':
                this.selectedElementsInitPos.set(elem, elem.pos.copy());
                break;
            case 'inputPin':
            case 'outputPin':
                this.selectedElementsInitPos.set(elem, elem.pos.copy());
                this.traceLayer.addTrace(this.connectingTraceID, elem.absPos, elem.absPos, this.style.colorPinHover);
                break;
        }
    }
    draggingElement(elem, startPos, offset, currentPos) {
        switch (elem.type) {
            case 'circuitInput':
            case 'circuitOutput':
            case 'block': {
                elem.setPos(currentPos);
                this.traces.forEach((trace, id) => (trace.isConnectedTo(elem)) && this.updateRequests.add(trace));
                break;
            }
            case 'inputPin': {
                const absPos = Vec2.div(this.pointer.relativeDownPos, this.scale).add(offset).sub(vec2(0.5));
                this.traceLayer.updateTrace(this.connectingTraceID, absPos, elem.absPos);
                break;
            }
            case 'outputPin': {
                const absPos = Vec2.div(this.pointer.relativeDownPos, this.scale).add(offset).sub(vec2(0.5));
                this.traceLayer.updateTrace(this.connectingTraceID, elem.absPos, absPos);
                break;
            }
        }
    }
    dragElementEnded(elem, startPos, offset, currentPos) {
        switch (elem.type) {
            case 'circuitInput':
            case 'circuitOutput':
            case 'block': {
                elem.setPos(Vec2.round(elem.pos));
                this.traces.forEach((trace, id) => (trace.isConnectedTo(elem)) && this.updateRequests.add(trace));
                break;
            }
            case 'inputPin': {
                const targetElem = this.pointer.targetElem;
                const inputPin = elem;
                if (targetElem?.type == 'outputPin') {
                    const outputPin = targetElem;
                    this.connect(outputPin, inputPin);
                }
                else if (inputPin.reference && targetElem?.type == 'inputPin' && targetElem != inputPin) {
                    const trace = this.traces.get(inputPin.id);
                    this.connect(trace.outputPin, targetElem);
                    this.disconnect(inputPin);
                }
                this.traceLayer.deleteTrace(this.connectingTraceID);
                this.unselectAll();
                break;
            }
            case 'outputPin': {
                const outputPin = elem;
                const targetElem = this.pointer.targetElem;
                if (targetElem?.type == 'inputPin') {
                    const inputPin = targetElem;
                    this.connect(outputPin, inputPin);
                }
                else if (targetElem?.type == 'outputPin' && targetElem != outputPin) {
                    // Move output pin connection
                    const connectedTraces = Array.from(this.traces.values()).filter(trace => trace.outputPin == outputPin);
                    if (connectedTraces.length > 0) {
                        const newSourcePin = targetElem;
                        connectedTraces.forEach(trace => this.connect(newSourcePin, trace.inputPin));
                    }
                }
                this.traceLayer.deleteTrace(this.connectingTraceID);
                this.unselectAll();
                break;
            }
        }
    }
    /////////////////////////
    //      SELECTION
    /////////////////////////
    selectElement(elem) {
        this.selectedElements.add(elem);
        elem.onSelected();
        switch (elem.type) {
            case 'block': {
                this.blocks.forEach(block => block.setInfoVisibility('visible'));
                break;
            }
        }
    }
    unselectElement(elem) {
        this.selectedElements.delete(elem);
        elem.onUnselected();
        switch (elem.type) {
            case 'block': {
                if (this.selectedElements.size == 0)
                    this.blocks.forEach(block => block.setInfoVisibility('hidden'));
                break;
            }
        }
    }
    unselectAll() {
        this.selectedElements.forEach(elem => this.unselectElement(elem));
    }
    ////////////////////////////////
    //      KEYBOARD HANDLING
    ////////////////////////////////
    onKeyDown(ev) {
        switch (ev.code) {
            case 'Delete':
            case 'Backspace':
                {
                    this.selectedElements.forEach(elem => this.deleteElement(elem));
                    this.unselectAll();
                    break;
                }
        }
    }
    onKeyUp(ev) {
        console.log('Key up', ev.code, ev.key);
    }
}
function getPositiveRectAttributes(pos, size) {
    let { x, y } = pos;
    let { x: w, y: h } = size;
    if (w < 0) {
        w *= -1;
        x -= w;
    }
    if (h < 0) {
        h *= -1;
        y -= h;
    }
    return {
        left: x + 'px',
        top: y + 'px',
        width: w + 'px',
        height: h + 'px',
    };
}
function isElementInsideRect(elem, rectPos, rectSize) {
    let { x: left, y: top } = rectPos;
    let { x: width, y: height } = rectSize;
    if (width < 0) {
        width *= -1;
        left -= width;
    }
    if (height < 0) {
        height *= -1;
        top -= height;
    }
    const right = left + width;
    const bottom = top + height;
    const elemRight = elem.pos.x + elem.size.x;
    const elemBottom = elem.pos.y + elem.size.y;
    return (elem.pos.x > left && elemRight < right && elem.pos.y > top && elemBottom < bottom);
}
