import { GUIChildElement } from '../GUI/GUIChildElement.js'
import { GUIPointerEventHandler } from '../GUI/GUITypes.js'
import * as HTML from '../Lib/HTML.js'
import HTMLMenu from '../Lib/HTMLMenu.js'
import Vec2, { vec2 } from '../Lib/Vector2.js'
import CircuitView from './CircuitView.js'
import FunctionBlockView from './FunctionBlockView.js'
import IOPinView from './IOPinView.js'
import FunctionBlockContextMenu from './FunctionBlockContextMenu.js'
import CircuitContextMenu from './CircuitContextMenu.js'
import { TraceAnchorHandle } from './TraceLine.js'

const enum PointerMode {
    DEFAULT,
    DRAG_SCROLL_VIEW,
    DRAG_SELECTION_BOX,
    DRAG_BLOCK,
    DRAG_INPUT_PIN,
    DRAG_OUTPUT_PIN,
    DRAG_TRACE_ANCHOR,
    INSERT_NEW_BLOCK,
    MODAL_MENU,
}

const enum MouseButton {
    LEFT =   1,
    RIGHT =  2,
    MIDDLE = 4
}

interface IDragBehaviour {
    start(ev: PointerEvent): void
    move(ev: PointerEvent): void
    end(ev: PointerEvent): void
}

export default function CircuitPointerHandler(circuit: CircuitView): GUIPointerEventHandler
{
    const pointer = circuit.pointer
    const selection = circuit.selection
    const body = circuit.body

    let menu: HTMLMenu

    let pointerMode: PointerMode = PointerMode.DEFAULT
    
    const onPointerDown = (ev: PointerEvent) => {
        const elem = pointer.targetElem
        if (ev.altKey) console.log('Target', elem, pointer.screenPos)
        // Discard modal menu
        if (menu) {
            menu.remove()
            menu = null
        }
        // Set selection to unselected block (to enable instant dragging of unselected)
        if (!ev.shiftKey && elem instanceof FunctionBlockView && !selection.has(elem)) {
            selection.set(elem)
        }
        // Select Pin or Anchor
        else if (elem instanceof IOPinView || elem instanceof TraceAnchorHandle) {
            selection.set(elem)
        }
        else if (elem == body) {
            selection.removeAll()
        }
    }

    const onClicked = (ev: PointerEvent) => {
        const elem = pointer.targetElem
        // Deselect all
        if (elem == body) {
            selection.removeAll()
        }
        // Set selection to block (no shift key)
        else if (!ev.shiftKey && elem instanceof FunctionBlockView) {
            selection.set(elem)
        }
        // Add or remove selection (with shift key)
        else if (ev.shiftKey && elem instanceof FunctionBlockView) {
            selection.has(elem)
                ? selection.remove(elem)
                : selection.add(elem)
        }
    }

    const onRightClicked = (ev: PointerEvent) => {
        const elem = pointer.targetElem
        
        // Open circuit context menu
        if (elem == body) {
            selection.removeAll()
            pointerMode = PointerMode.MODAL_MENU
            menu = CircuitContextMenu({
                circuitView: circuit,
                parentContainer: circuit.DOMElement,
                pos: pointer.screenDownPos.copy(),
                destructor: () => {
                    menu.remove()
                    menu = null
                    pointerMode = PointerMode.DEFAULT
                }
            })
        }
        // Open function block context menu
        else if (elem instanceof FunctionBlockView) {
            pointerMode = PointerMode.MODAL_MENU
            menu = FunctionBlockContextMenu({
                blockView: elem,
                parentContainer: circuit.DOMElement,
                pos: pointer.screenDownPos.copy(),
                destructor: () => {
                    menu.remove()
                    menu = null
                    pointerMode = PointerMode.DEFAULT
                }
            })
        }
    }

    const dragBehaviour = new Map<PointerMode, IDragBehaviour>()

    //  Darg to scroll view
    // ---------------------
    let scrollStartPos: Vec2

    dragBehaviour.set(PointerMode.DRAG_SCROLL_VIEW,
    {
        start(ev: PointerEvent) {
            scrollStartPos = vec2(circuit.parentDOM.scrollLeft, circuit.parentDOM.scrollTop)
            circuit.DOMElement.style.cursor = 'grab'
        },
        move(ev: PointerEvent) {
            circuit.parentDOM.scrollLeft = scrollStartPos.x - pointer.screenDragOffset.x
            circuit.parentDOM.scrollTop = scrollStartPos.y - pointer.screenDragOffset.y
        },
        end(ev: PointerEvent) {
            circuit.DOMElement.style.cursor = 'default'
        }
    })
    
    //  Drag to draw selection box
    // ----------------------------
    let selectionBoxStartPos: Vec2
    let selectionBox: HTMLElement

    dragBehaviour.set(PointerMode.DRAG_SELECTION_BOX,
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
        move(ev: PointerEvent) {
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
    })

    //  Drag a block
    // --------------
    const selectedBlocksStartDragPos = new WeakMap<FunctionBlockView, Vec2>()

    dragBehaviour.set(PointerMode.DRAG_BLOCK,
    {
        start(ev: PointerEvent) {
            pointer.downTargetElem?.setStyle({cursor: 'grabbing'})
            selection.blocks.forEach(block => {
                selectedBlocksStartDragPos.set(block, block.pos.copy())
                block.onDragStarted?.(ev, circuit.pointer)
            })
        },
        move(ev: PointerEvent) {
            selection.blocks.forEach(block => {
                const startPos = selectedBlocksStartDragPos.get(block)
                block.setPos(Vec2.add(startPos, pointer.scaledDragOffset))
                block.onDragging?.(ev, circuit.pointer)
            })
        },
        end(ev: PointerEvent) {
            pointer.downTargetElem?.setStyle({cursor: 'grab'})
            selection.blocks.forEach(block => {
                const startPos = selectedBlocksStartDragPos.get(block)
                block.setPos(Vec2.add(startPos, pointer.scaledDragOffset).round())
                block.onDragEnded?.(ev, circuit.pointer)
            })
        }
    })

    //  Drag input pin
    // ----------------
    dragBehaviour.set(PointerMode.DRAG_INPUT_PIN,
    {
        start(ev: PointerEvent) {
        },
        move(ev: PointerEvent) {
        },
        end(ev: PointerEvent) {
        }
    })
    
    //  Drag trace anchor
    // -------------------
    let selectedAnchorStartDragPos: Vec2

    dragBehaviour.set(PointerMode.DRAG_TRACE_ANCHOR,
    {
        start(ev: PointerEvent) {
            selectedAnchorStartDragPos = selection.anchor.pos
        },
        move(ev: PointerEvent) {
            const newPos = Vec2.add(selectedAnchorStartDragPos, pointer.scaledDragOffset)
            selection.anchor.move(newPos)
        },
        end(ev: PointerEvent) {
            const newPos = Vec2.add(selectedAnchorStartDragPos, pointer.scaledDragOffset).round()
            selection.anchor.move(newPos)
            selection.removeAll()            
        }
    })

    // =======================
    //  Handle dragging modes
    // =======================
    const onDragStarted = (ev: PointerEvent) =>
    {
        ev.preventDefault()
        if (pointerMode == PointerMode.MODAL_MENU) return
        else if (pointer.downTargetElem == body && ev.buttons == MouseButton.RIGHT) {
            pointerMode = PointerMode.DRAG_SCROLL_VIEW
        }
        else if (pointer.downTargetElem == body && ev.buttons == MouseButton.LEFT) {
            pointerMode = PointerMode.DRAG_SELECTION_BOX
        }
        else if (selection.type == 'Block') {
            pointerMode = PointerMode.DRAG_BLOCK
        }
        else if (selection.type == 'Pin' && selection.pin.type == 'input') {
            pointerMode = PointerMode.DRAG_INPUT_PIN
        }
        else if (selection.type == 'Pin' && selection.pin.type == 'output') {
            pointerMode = PointerMode.DRAG_OUTPUT_PIN
        }
        else if (selection.type == 'Anchor') {
            pointerMode = PointerMode.DRAG_TRACE_ANCHOR
        }
        console.log('onDragStarted:', pointerMode)
        dragBehaviour.get(pointerMode)?.start(ev)
    }

    const onDragging = (ev: PointerEvent) => {
        ev.preventDefault()
        dragBehaviour.get(pointerMode)?.move(ev)
    }

    const onDragEnded = (ev: PointerEvent) => {
        dragBehaviour.get(pointerMode)?.end(ev)
        pointerMode = PointerMode.DEFAULT
    }
    
    return {
        onPointerDown,
        onClicked,
        onRightClicked,
        onDragStarted,
        onDragging,
        onDragEnded
    }
}


function getPositiveRectAttributes(pos: Vec2, size: Vec2): Partial<CSSStyleDeclaration>
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