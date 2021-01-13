import Vec2, { vec2 } from '../Lib/Vector2.js';
import GUIView from '../GUI/GUIView.js';
import TraceLayer from './TraceLayer.js';
import CircuitGrid from './CircuitGrid.js';
import { defaultStyle } from './CircuitTypes.js';
import FunctionBlockElem from './FunctionBlockElem.js';
export default class CircuitView extends GUIView {
    constructor(parent, size, scale) {
        super(parent, size, scale);
        this.gridMap = new CircuitGrid();
        this.style = defaultStyle;
        this.selectedElements = new Set();
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
            }
            // Start dragging element
            else if (this.pointer.isDragging && this.pointer.downTargetElem?.isDraggable) {
                this.draggingMode = 2 /* DRAG_ELEMENT */;
                this.pointer.dragTargetInitPos = this.pointer.downTargetElem.pos.copy();
                this.pointer.downTargetElem.onDragStarted?.(ev, this.pointer);
                this.dragElementStarted(this.pointer.downTargetElem, this.pointer.dragTargetInitPos);
            }
        };
        this.onDragging = (ev) => {
            switch (this.draggingMode) {
                case 1 /* SCROLL_VIEW */:
                    this.parentDOM.scrollLeft = this.scrollStartPos.x - this.pointer.dragOffset.x;
                    this.parentDOM.scrollTop = this.scrollStartPos.y - this.pointer.dragOffset.y;
                    break;
                case 3 /* SELECTION_BOX */:
                    break;
                case 2 /* DRAG_ELEMENT */:
                    const offset = Vec2.div(this.pointer.dragOffset, this.scale);
                    const currentPos = Vec2.add(this.pointer.dragTargetInitPos, offset);
                    this.draggingElement(this.pointer.downTargetElem, this.pointer.dragTargetInitPos, offset, currentPos);
                    this.pointer.downTargetElem.onDragging?.(ev, this.pointer);
                    break;
            }
        };
        this.onDragEnded = (ev) => {
            switch (this.draggingMode) {
                case 1 /* SCROLL_VIEW */:
                    this.DOMElement.style.cursor = 'default';
                    break;
                case 3 /* SELECTION_BOX */:
                    break;
                case 2 /* DRAG_ELEMENT */:
                    const offset = Vec2.div(this.pointer.dragOffset, this.scale);
                    const currentPos = Vec2.add(this.pointer.dragTargetInitPos, offset);
                    this.dragElementEnded(this.pointer.downTargetElem, this.pointer.dragTargetInitPos, offset, currentPos);
                    this.pointer.downTargetElem.onDragEnded?.(ev, this.pointer);
                    break;
            }
            this.draggingMode = 0 /* NONE */;
        };
        this.traceLayer = new TraceLayer(this.DOMElement, this.scale);
    }
    loadCircuit(circuit) {
        const margin = vec2(6, 2);
        const area = vec2(16, 8);
        const w = (this.size.x - margin.x * 2);
        circuit.blocks.forEach((block, i) => {
            const n = i * area.x;
            const row = Math.trunc(n / w);
            const col = n - row * w;
            const y = margin.y + row * area.y;
            const x = margin.x + col;
            this.addFunctionBlock(vec2(x, y), block);
        });
    }
    addFunctionBlock(pos, funcBlock) {
        const block = new FunctionBlockElem(this.children, pos, funcBlock);
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
    dragElementStarted(elem, startPos) {
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
