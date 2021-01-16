import Vec2, { vec2 } from '../Lib/Vector2.js';
import GUIView from '../GUI/GUIView.js';
import CircuitGrid from './CircuitGrid.js';
import { defaultStyle } from './CircuitTypes.js';
import FunctionBlockView from './FunctionBlockView.js';
import * as HTML from '../Lib/HTML.js';
import TraceLayerBezier from './TraceLayerBezier.js';
export default class CircuitView extends GUIView {
    constructor(parent, size, scale) {
        super(parent, size, scale, defaultStyle);
        this.gridMap = new CircuitGrid();
        this.selectedElements = new Set();
        this.selectedElementsInitPos = new Map();
        this.blocks = new Map();
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
            if (ev.target == this.DOMElement && ev.buttons == 2 /* RIGHT */) {
                this.draggingMode = 1 /* SCROLL_VIEW */;
                this.scrollStartPos = vec2(this.parentDOM.scrollLeft, this.parentDOM.scrollTop);
                this.DOMElement.style.cursor = 'grab';
            }
            // Start selection box
            else if (ev.target == this.DOMElement && ev.buttons == 1 /* LEFT */) {
                this.draggingMode = 3 /* SELECTION_BOX */;
                this.selectionBox = HTML.domElement(this.DOMElement, 'div', {
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
                    this.DOMElement.removeChild(this.selectionBox);
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
        this.traceLayer = new TraceLayerBezier(this.DOMElement, this.scale);
    }
    loadCircuit(circuit) {
        console.log('CircuitView: Load circuit');
        const margin = vec2(6, 2);
        const area = vec2(16, 8);
        const w = (this.size.x - margin.x * 2);
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
    createCircuitTraces() {
        console.log('CircuitView: Create traces');
        this.blocks.forEach(funcBlockElem => {
            const connections = [];
            funcBlockElem.inputPins.forEach(inputPin => {
                const conn = inputPin.io.getConnection();
                if (conn) {
                    const sourceBlockElem = this.blocks.get(conn.sourceBlockID);
                    const outputPin = sourceBlockElem.outputPins[conn.outputNum];
                    connections.push({ outputPin, inputPin });
                }
            });
            connections.forEach(conn => this.traceLayer.addTrace(conn.inputPin.id, conn.outputPin.absPos, conn.inputPin.absPos));
        });
    }
    addFunctionBlock(pos, funcBlock) {
        console.log('Add function block', funcBlock.offlineID);
        const block = new FunctionBlockView(this.children, pos, funcBlock);
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
    }
    /////////////////////////
    //      SELECTION
    /////////////////////////
    selectElement(elem) {
        console.log('Selected element', this.elementToString(elem));
        this.selectedElements.add(elem);
        elem.selected();
        switch (elem.type) {
            case 'block': { }
            case 'input': { }
            case 'output': { }
        }
    }
    unselectElement(elem) {
        console.log('Unselected element', this.elementToString(elem));
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
