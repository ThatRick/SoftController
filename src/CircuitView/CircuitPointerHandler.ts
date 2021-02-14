import { GUIChildElement } from '../GUI/GUIChildElement.js';
import { GUIPointerEventHandler } from '../GUI/GUITypes.js';
import Vec2, { vec2 } from '../Lib/Vector2.js';
import CircuitView from './CircuitView.js';
import FunctionBlockPinView from './FunctionBlockPinView.js';
import * as HTML from '../Lib/HTML.js'


const enum PointerMode {
    NONE,
    SCROLL_VIEW,
    DRAG_ELEMENT,
    SELECTION_BOX,
    INSERT_NEW
}

const enum MouseButton {
    LEFT =   1,
    RIGHT =  2,
    MIDDLE = 4
}

export default function CircuitPointerHandler(circuit: CircuitView): GUIPointerEventHandler
{
    let mode: PointerMode
    let scrollStartPos: Vec2


    const onPointerMove = (ev: PointerEvent) => {
        if (circuit.funcPendingPlacement && circuit.pointer.targetElem == circuit.blockArea) {
            circuit.startBlockPlacement()
        }
        else if (circuit.blockInPlacement) {
            circuit.blockInPlacement.setPos(circuit.blockArea.pointerScaledPos())
        }
    }

    const onPointerDown = (ev: PointerEvent) => {
        const elem = circuit.pointer.downTargetElem
        const selected = Array.from(circuit.selectedElements.values())[0]

        if (circuit.blockInPlacement) {
            const pos = circuit.blockArea.pointerScaledPos().round()
            circuit.blockInPlacement.setPos(pos)
            circuit.blockInPlacement.DOMElement.style.pointerEvents = 'auto'
            circuit.blockInPlacement = undefined
        }

        if (selected?.type == 'outputPin' && elem.type == 'inputPin' && !((elem as FunctionBlockPinView).source)) {
            circuit.connect(selected as FunctionBlockPinView, elem as FunctionBlockPinView)
            circuit.unselectAll()
            return
        }
        if (selected?.type == 'inputPin' && elem.type == 'outputPin' && !((selected as FunctionBlockPinView).source)) {
            circuit.connect(elem as FunctionBlockPinView, selected as FunctionBlockPinView)
            circuit.unselectAll()
            return
        }

        if (elem?.isSelectable && !ev.shiftKey) {
            if (!circuit.selectedElements.has(elem)) {
                circuit.unselectAll()
                circuit.selectElement(elem)
            }
        }
        if (elem?.isSelectable && ev.shiftKey && (elem?.isMultiSelectable || circuit.selectedElements.size == 0)) {
            (circuit.selectedElements.has(elem)) ? circuit.unselectElement(elem) : circuit.selectElement(elem)
        }
    }

    const onClicked = (ev: PointerEvent) => {
        console.log('clicked!')
        const elem = circuit.pointer.downTargetElem

        if (!elem?.isSelectable && !ev.shiftKey) {
            circuit.unselectAll()
        }

        ev.altKey && console.log('Clicked:', circuit.elementToString(elem), circuit.blockArea.pointerScaledPos())
    }

    const onDoubleClicked = (ev: PointerEvent) => {
        if (circuit.pointer.downTargetElem?.isSelectable) circuit.unselectAll()
    }

    const onDragStarted = (ev: PointerEvent) => {
        // Start scrolling view
        if (circuit.pointer.downTargetElem == circuit.blockArea && ev.buttons == MouseButton.RIGHT) {
            mode = PointerMode.SCROLL_VIEW
            scrollStartPos = vec2(circuit.parentDOM.scrollLeft, circuit.parentDOM.scrollTop)
            circuit.DOMElement.style.cursor = 'grab'
        }
        // Start selection box
        else if (circuit.pointer.downTargetElem == circuit.blockArea && ev.buttons == MouseButton.LEFT) {
            mode = PointerMode.SELECTION_BOX
            circuit.selectionBoxInitPos = circuit.blockArea.pointerScreenPos()
            circuit.selectionBox = HTML.domElement(circuit.blockArea.DOMElement, 'div', {
                position: 'absolute',
                backgroundColor: 'rgba(128,128,255,0.2)',
                border: 'thin solid #88F',
                pointerEvents: 'none',
                ...getPositiveRectAttributes(circuit.selectionBoxInitPos, circuit.pointer.screenDragOffset)
            })
            console.log('selection start:', circuit.selectionBoxInitPos)
        }
        // Start dragging selection
        else if (circuit.pointer.isDragging && circuit.pointer.downTargetElem?.isDraggable) {
            mode = PointerMode.DRAG_ELEMENT
            circuit.pointer.dragTargetInitPos = circuit.pointer.downTargetElem.pos.copy()
            circuit.selectedElements.forEach(elem => {
                circuit.dragElementStarted(elem)
                elem.onDragStarted?.(ev, circuit.pointer)
            })
        }
    }
    const onDragging = (ev: PointerEvent) => {
        switch(mode)
        {
            case PointerMode.SCROLL_VIEW:
                circuit.parentDOM.scrollLeft = scrollStartPos.x - circuit.pointer.screenDragOffset.x
                circuit.parentDOM.scrollTop = scrollStartPos.y - circuit.pointer.screenDragOffset.y
                break
            
            case PointerMode.SELECTION_BOX:
                Object.assign(circuit.selectionBox.style, getPositiveRectAttributes(circuit.selectionBoxInitPos, circuit.pointer.screenDragOffset))
                break

            case PointerMode.DRAG_ELEMENT:
                circuit.selectedElements.forEach(elem => {
                    const initPos = circuit.selectedElementsInitPos.get(elem)
                    const offset = circuit.pointer.scaledDragOffset
                    circuit.draggingElement(elem, initPos, offset, Vec2.add(initPos, offset))
                    elem.onDragging?.(ev, circuit.pointer)
                })
                break
        }
    }
    const onDragEnded = (ev: PointerEvent) => {
        switch(mode)
        {
            case PointerMode.SCROLL_VIEW:
                circuit.DOMElement.style.cursor = 'default'
                break
            
            case PointerMode.SELECTION_BOX:
                if (!ev.shiftKey) circuit.unselectAll()
                circuit.blocks.forEach(block => {
                    const pos = Vec2.div(circuit.selectionBoxInitPos, circuit.scale)
                    const size = Vec2.div(circuit.pointer.screenDragOffset, circuit.scale)
                    if (isElementInsideRect(block, pos, size)) {
                        circuit.selectElement(block)
                    }
                })
                circuit.blockArea.DOMElement.removeChild(circuit.selectionBox)
                break

            case PointerMode.DRAG_ELEMENT:
                circuit.selectedElements.forEach(elem => {
                    const offset = circuit.pointer.scaledDragOffset
                    const initPos = circuit.selectedElementsInitPos.get(elem)
                    const currentPos = Vec2.add(initPos, offset)
                    circuit.dragElementEnded(elem, initPos, offset, currentPos)
                    elem.onDragEnded?.(ev, circuit.pointer)
                })
                break
        }

        mode = PointerMode.NONE
    }

    return {
        onPointerDown,
        onPointerMove,
        onClicked,
        onDoubleClicked,
        onDragStarted,
        onDragging,
        onDragEnded,
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