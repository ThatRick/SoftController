import Vec2, { vec2 } from '../Lib/Vector2.js';
import GUIView from '../GUI/GUIView.js';
import CircuitGrid from './CircuitGrid.js';
import { defaultStyle } from './CircuitTypes.js';
import FunctionBlockView from './FunctionBlockView.js';
import * as HTML from '../Lib/HTML.js';
import { GUIChildElement } from '../GUI/GUIChildElement.js';
import TraceLayerBezier from './TraceLayerBezier.js';
import { CircuitTrace } from './CircuitTrace.js';
import CircuitIOView from './CircuitIOView.js';
class IOArea extends GUIChildElement {
    constructor(view, type) {
        super(view.children, 'div', (type == 'inputArea') ? vec2(0, 0) : vec2(view.size.x - view.style.IOAreaWidth, 0), vec2(view.style.IOAreaWidth, view.size.y), {
            backgroundColor: '#215'
        }, true);
        this.ioViews = [];
        this.type = type;
    }
    addCircuitIO(circuit) {
        const ioList = (this.type == 'inputArea') ? circuit.inputs : circuit.outputs;
        this.ioViews = ioList.map((io, i) => new CircuitIOView(this.children, io, vec2(0, i + 2)));
    }
    get id() { return this.circuit.offlineID; }
}
class BlockArea extends GUIChildElement {
    constructor(view) {
        super(view.children, 'div', vec2(view.style.IOAreaWidth, 0), Vec2.sub(view.size, vec2(view.style.IOAreaWidth * 2, 0)), {
            backgroundColor: '#104'
        }, true);
    }
}
/////////////////////////////
//      Circuit View
/////////////////////////////
export default class CircuitView extends GUIView {
    constructor(parent, size, scale) {
        super(parent, Vec2.add(size, vec2(defaultStyle.IOAreaWidth * 2, 0)), scale, defaultStyle);
        this.blockArea = new BlockArea(this);
        this.inputArea = new IOArea(this, 'inputArea');
        this.outputArea = new IOArea(this, 'outputArea');
        this.gridMap = new CircuitGrid();
        this.selectedElements = new Set();
        this.selectedElementsInitPos = new Map();
        this.blocks = new Map();
        this.traces = new Map();
        this.internalInputPins = [];
        this.internalOutputPins = [];
        ////////////////////////////////
        //      POINTER HANDLING
        ////////////////////////////////
        this.onPointerDown = (ev) => {
            const elem = this.pointer.downTargetElem;
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
            console.log('Clicked:', this.elementToString(elem));
        };
        this.onDragStarted = (ev) => {
            // Start scrolling view
            if (this.pointer.targetElem == this.blockArea && ev.buttons == 2 /* RIGHT */) {
                this.draggingMode = 1 /* SCROLL_VIEW */;
                this.scrollStartPos = vec2(this.parentDOM.scrollLeft, this.parentDOM.scrollTop);
                this.DOMElement.style.cursor = 'grab';
            }
            // Start selection box
            else if (this.pointer.targetElem == this.blockArea && ev.buttons == 1 /* LEFT */) {
                this.draggingMode = 3 /* SELECTION_BOX */;
                this.selectionBox = HTML.domElement(this.blockArea.DOMElement, 'div', {
                    position: 'absolute',
                    backgroundColor: 'rgba(128,128,255,0.2)',
                    border: 'thin solid #88F',
                    pointerEvents: 'none',
                    ...getPositiveRectAttributes(this.pointer.relativeDownPos, this.pointer.dragOffset)
                });
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
                    Object.assign(this.selectionBox.style, getPositiveRectAttributes(this.pointer.relativeDownPos, this.pointer.dragOffset));
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
                        const pos = Vec2.div(this.pointer.relativeDownPos, this.scale);
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
        parent.style.backgroundColor = this.gui.style.colorBackground;
        this.traceLayer = new TraceLayerBezier(this.DOMElement, this.scale, this.gui.style);
    }
    loadCircuit(circuit) {
        console.log('CircuitView: Load circuit');
        const margin = vec2(6, 2);
        const area = vec2(16, 8);
        const w = (this.size.x - margin.x * 2);
        // io
        this.inputArea.addCircuitIO(circuit);
        this.outputArea.addCircuitIO(circuit);
        // blocks
        circuit.blocks.forEach((block, i) => {
            const n = i * area.x;
            const row = Math.trunc(n / w);
            const col = n - row * w;
            const y = margin.y + row * area.y;
            const x = margin.x + col;
            this.addFunctionBlock(vec2(x, y), block);
        });
        // Late initialization vittuun! GUIView on aina olemassa kun elementtiä luodaan. Turhaa kikkailua ja johtaa tähän paskaan:
        setTimeout(() => this.createCircuitTraces(), 10);
    }
    getConnectionSourcePin(conn) {
        let outputPin;
        if (conn.sourceBlockID == -1) {
            outputPin = this.internalInputPins[conn.outputNum];
        }
        else {
            const sourceBlockElem = this.blocks.get(conn.sourceBlockID);
            outputPin = sourceBlockElem.outputPins[conn.outputNum];
        }
        return outputPin;
    }
    createCircuitTraces() {
        console.log('CircuitView: Create traces');
        this.blocks.forEach(funcBlockElem => {
            funcBlockElem.inputPins.forEach(inputPin => {
                const conn = inputPin.io.getConnection();
                if (conn) {
                    const outputPin = this.getConnectionSourcePin(conn);
                    outputPin && this.traces.set(inputPin.id, new CircuitTrace(this.traceLayer, outputPin, inputPin));
                }
            });
        });
    }
    addFunctionBlock(pos, funcBlock) {
        const block = new FunctionBlockView(this.blockArea.children, pos, funcBlock);
        this.blocks.set(funcBlock.offlineID, block);
    }
    // Element info to debug string
    elementToString(elem) {
        if (!elem)
            return 'undefined';
        return `type: ${elem.type}, id: ${elem.id}, pos: ${elem.absPos.toString()}`;
    }
    /////////////////////////
    //      DRAGGING
    /////////////////////////
    dragElementStarted(elem) {
        this.selectedElementsInitPos.set(elem, elem.pos.copy());
    }
    draggingElement(elem, startPos, offset, currentPos) {
        switch (elem.type) {
            case 'block': {
                elem.pos = currentPos;
                this.traces.forEach((trace, id) => (trace.isConnectedTo(elem)) && this.updateRequests.add(trace));
                break;
            }
            case 'input': {
                break;
            }
            case 'output': {
                break;
            }
        }
    }
    dragElementEnded(elem, startPos, offset, currentPos) {
        elem.pos = Vec2.round(elem.pos);
        this.traces.forEach((trace, id) => (trace.isConnectedTo(elem)) && this.updateRequests.add(trace));
    }
    /////////////////////////
    //      SELECTION
    /////////////////////////
    selectElement(elem) {
        this.selectedElements.add(elem);
        elem.selected();
        switch (elem.type) {
            case 'block': { }
            case 'input': { }
            case 'output': { }
        }
    }
    unselectElement(elem) {
        this.selectedElements.delete(elem);
        elem.unselected();
        switch (elem.type) {
            case 'block': { }
            case 'input': { }
            case 'output': { }
        }
    }
    unselectAll() {
        this.selectedElements.forEach(elem => this.unselectElement(elem));
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
