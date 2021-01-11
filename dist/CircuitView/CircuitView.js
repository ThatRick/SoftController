import Vec2, { vec2 } from '../Lib/Vector2.js';
import GUIView from '../GUI/GUIView.js';
import TraceLayer from './TraceLayer.js';
import CircuitGrid from './CircuitGrid.js';
import { defaultStyle } from './CircuitTypes.js';
export default class CircuitView extends GUIView {
    constructor(parent, size, scale) {
        super(parent, size, scale);
        this.gridMap = new CircuitGrid();
        this.style = defaultStyle;
        this.selection = new Set();
        ////////////////////////////////
        //      POINTER HANDLING
        ////////////////////////////////
        this.onPointerDown = (ev) => {
            const elem = this.pointer.downTargetElem;
            if (elem?.isSelectable && !this.selection.has(elem)) {
                if (!ev.shiftKey)
                    this.unselectAll();
                this.selectElement(elem);
            }
            else {
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
            case 'block':
                elem.pos = currentPos;
                break;
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
        this.selection.add(elem);
        switch (elem.type) {
            case 'block':
                elem.DOMElement.style.outline = this.style.blockOutlineSelected;
                break;
        }
    }
    unselectElement(elem) {
        console.log('Unselected element', this.elementToString(elem));
        this.selection.delete(elem);
        switch (elem.type) {
            case 'block':
                elem.DOMElement.style.outline = this.style.blockOutlineUnselected;
                break;
        }
    }
    unselectAll() {
        this.selection.forEach(elem => this.unselectElement(elem));
    }
}
