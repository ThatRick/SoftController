import Vec2, { vec2 } from '../Lib/Vector2.js'
import GUIView from '../GUI/GUIView.js'
import TraceLayer from './TraceLayer.js'
import CircuitGrid from './CircuitGrid.js'
import { CircuitElement, CircuitStyle, defaultStyle } from './CircuitTypes.js'
import { Circuit } from './CircuitModel.js'

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

export default class CircuitView extends GUIView<CircuitElement>
{
    constructor(parent: HTMLElement, size: Vec2, scale: Vec2)
    {
        super(parent, size, scale)

        this.traceLayer = new TraceLayer(this.DOMElement, this.scale)
    }

    traceLayer: TraceLayer
    gridMap = new CircuitGrid()
    style: CircuitStyle = defaultStyle

    scrollStartPos: Vec2
    draggingMode: DraggingMode

    selectedElements = new Set<CircuitElement>()


    // Element info to debug string
    elementToString(elem: CircuitElement) {
        if (!elem) return 'undefined'
        return `type: ${elem.type}, id: ${elem.id}, pos: ${elem.absPos.toString()}`    
    }


    /////////////////////////
    //      DRAGGING
    /////////////////////////

    dragElementStarted(elem: CircuitElement, startPos: Vec2) {

    }
    
    draggingElement(elem: CircuitElement, startPos: Vec2, offset: Vec2, currentPos: Vec2) {
        switch(elem.type) {
            case 'block': {
                elem.pos = currentPos
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
    }


    /////////////////////////
    //      SELECTION
    /////////////////////////

    selectElement(elem: CircuitElement) {
        console.log('Selected element', this.elementToString(elem))
        this.selectedElements.add(elem)
        elem.selected()

        switch(elem.type) {
            case 'block': {}
            case 'input': {}
            case 'output': {}
        }
    }
    unselectElement(elem: CircuitElement) {
        console.log('Unselected element', this.elementToString(elem))
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
        if (ev.target == this.DOMElement && ev.buttons == MouseButton.RIGHT) { 
            this.draggingMode = DraggingMode.SCROLL_VIEW
            this.scrollStartPos = vec2(this.parentDOM.scrollLeft, this.parentDOM.scrollTop)
            this.DOMElement.style.cursor = 'grab'
        }
        // Start selection box
        else if (ev.target == this.DOMElement && ev.buttons == MouseButton.LEFT) { 
            this.draggingMode = DraggingMode.SELECTION_BOX
        }
        // Start dragging element
        else if (this.pointer.isDragging && this.pointer.downTargetElem?.isDraggable) {
            this.draggingMode = DraggingMode.DRAG_ELEMENT
            this.pointer.dragTargetInitPos = this.pointer.downTargetElem.pos.copy()
            this.pointer.downTargetElem.onDragStarted?.(ev, this.pointer)
            this.dragElementStarted(this.pointer.downTargetElem, this.pointer.dragTargetInitPos)
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
                break

            case DraggingMode.DRAG_ELEMENT:
                const offset = Vec2.div(this.pointer.dragOffset, this.scale)
                const currentPos = Vec2.add(this.pointer.dragTargetInitPos, offset)
                this.draggingElement(this.pointer.downTargetElem, this.pointer.dragTargetInitPos, offset, currentPos)
                this.pointer.downTargetElem.onDragging?.(ev, this.pointer)
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
                break

            case DraggingMode.DRAG_ELEMENT:
                const offset = Vec2.div(this.pointer.dragOffset, this.scale)
                const currentPos = Vec2.add(this.pointer.dragTargetInitPos, offset)
                this.dragElementEnded(this.pointer.downTargetElem, this.pointer.dragTargetInitPos, offset, currentPos)
                this.pointer.downTargetElem.onDragEnded?.(ev, this.pointer)
                break
        }

        this.draggingMode = DraggingMode.NONE
    }
}
