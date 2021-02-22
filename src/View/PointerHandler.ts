import { GUIChildElement } from '../GUI/GUIChildElement.js'
import GUIPointer from '../GUI/GUIPointer.js'
import { GUIPointerEventHandler, IChildElementGUI, Vec2 } from '../GUI/GUITypes.js'
import * as HTML from '../Lib/HTML.js'
import { vec2 } from '../Lib/Vector2.js'
import CircuitView from './CircuitView.js'
import { Style } from './Common.js'
import FunctionBlockView from './FunctionBlockView.js'
import IOPinView from './IOPinView.js'

const enum PointerMode {
    POINT,
    SCROLL_VIEW,
    MOVE_ELEMENT,
    SELECTION_BOX,
    INSERT_NEW
}

const enum MouseButton {
    LEFT =   1,
    RIGHT =  2,
    MIDDLE = 4
}

interface IDragBehaviour {
    start(ev: PointerEvent): void
    drag(ev: PointerEvent): void
    end(ev: PointerEvent): void
}

export default function CircuitPointerHandler(circuit: CircuitView): GUIPointerEventHandler
{
    const pointer = circuit.pointer
    const selection = circuit.selection
    let scrollStartPos: Vec2
    let selectionBoxStartPos: Vec2
    let selectionBox: HTMLElement
    let dragBehaviour: IDragBehaviour | null

    const scrollViewBehaviour: IDragBehaviour =
    {
        start(ev: PointerEvent) {
            scrollStartPos = vec2(circuit.parentDOM.scrollLeft, circuit.parentDOM.scrollTop)
            circuit.DOMElement.style.cursor = 'grab'
        },
        drag(ev: PointerEvent) {
            circuit.parentDOM.scrollLeft = scrollStartPos.x - circuit.pointer.screenDragOffset.x
            circuit.parentDOM.scrollTop = scrollStartPos.y - circuit.pointer.screenDragOffset.y
        },
        end(ev: PointerEvent) {
            circuit.DOMElement.style.cursor = 'default'
        }
    }

    const selectionBoxBehaviour: IDragBehaviour = 
    {
        start(ev: PointerEvent) {
            selectionBoxStartPos = pointer.screenDownPos
            selectionBox = HTML.domElement(circuit.DOMElement, 'div', {
                position: 'absolute',
                backgroundColor: 'rgba(128,128,255,0.2)',
                border: 'thin solid #88F',
                pointerEvents: 'none',
                ...getPositiveRectAttributes(selectionBoxStartPos, circuit.pointer.screenDragOffset)
            })
        },
        drag(ev: PointerEvent) {
            Object.assign(selectionBox.style, getPositiveRectAttributes(selectionBoxStartPos, circuit.pointer.screenDragOffset))
        },
        end(ev: PointerEvent) {
            if (!ev.shiftKey) selection.removeAll()
            circuit.blockViews.forEach(block => {
                const pos = Vec2.div(selectionBoxStartPos, circuit.scale)
                const size = Vec2.div(circuit.pointer.screenDragOffset, circuit.scale)
                if (isElementInsideRect(block, pos, size)) {
                    selection.add(block)
                }
            })
            circuit.DOMElement.removeChild(selectionBox)
        }
    }

    const moveElementBehaviour: IDragBehaviour =
    {
        start(ev: PointerEvent) {
            pointer.dragTargetInitPos = pointer.downTargetElem.pos.copy()
            selection.blocks.forEach(block => {
                // circuit.dragElementStarted(block)
                block.onDragStarted?.(ev, circuit.pointer)
            })
        },
        drag(ev: PointerEvent) {

        },
        end(ev: PointerEvent) {

        }
    }

    const onPointerDown = () => {
        const elem = pointer.targetElem
        console.log('Target', elem)
        
        // Deselect all
        if (!elem || elem?.isSelectable) {
            selection.removeAll()
            return
        }
        // Select Block
        if (elem instanceof FunctionBlockView) {
            selection.set(elem)
        }
        // Select Pin
        else if (elem instanceof IOPinView) {
            selection.set(elem)
        }
    }

    return {
        onPointerDown
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