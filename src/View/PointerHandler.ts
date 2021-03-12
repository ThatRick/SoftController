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
import { IOPin } from '../State/IOPin.js'
import IOPinContextMenu from './IOPinContextMenu.js'

const enum PointerMode {
    DEFAULT,
    DRAG_SCROLL_VIEW,
    DRAG_SELECTION_BOX,
    DRAG_BLOCK,
    DRAG_IO_PIN,
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
        // Unselect all
        if (elem == circuit.body) {
            selection.removeAll()
        }
        // Set selection to unselected block (to enable instant dragging of unselected block)
        else if (elem instanceof FunctionBlockView && !ev.shiftKey && !selection.has(elem)) {
            selection.set(elem)
        }
        // Anchor
        else if (elem instanceof TraceAnchorHandle) {
            selection.set(elem)
        }
        // IO Pin
        else if (elem instanceof IOPinView) {
            const clickedPin = elem as IOPinView
            if (selection.type == 'Pin') {
                if (selection.pin.direction == 'left' && clickedPin.direction == 'right') {
                    // Make connection
                    selection.pin.io.setSource(clickedPin.io)
                    // Unselect
                    selection.removeAll()
                }
                else if (selection.pin.direction == 'right' && clickedPin.direction == 'left') {
                    // Make connection
                    clickedPin.io.setSource(selection.pin.io)
                    // Unselect if not shift key down
                    if (!ev.shiftKey) selection.removeAll()
                }
                else selection.set(elem)
            }
            else selection.set(elem)
        }
    }

    const onClicked = (ev: PointerEvent) => {
        const elem = pointer.targetElem

        // Set selection to block (no shift key)
        if (!ev.shiftKey && elem instanceof FunctionBlockView) {
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
        if (elem == circuit.body) {
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
                    selection.removeAll()
                }
            })
        }
        // Open IO pin context menu
        else if (elem instanceof IOPinView) {
            pointerMode = PointerMode.MODAL_MENU
            menu = IOPinContextMenu({
                ioPinView: elem,
                parentContainer: circuit.DOMElement,
                pos: pointer.screenDownPos.copy(),
                destructor: () => {
                    menu.remove()
                    menu = null
                    pointerMode = PointerMode.DEFAULT
                    selection.removeAll()
                }
            })
        }
    }

    const dragBehaviour = new Map<PointerMode, IDragBehaviour>()

    //  Scroll view
    // -------------
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
    
    //  Draw selection box
    // --------------------
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
            circuit.traceLayer.resetCollisions()
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
                circuit.requestUpdate(circuit.grid)
            })
        }
    })

    //  Drag IO pin
    // -------------
    let connectionLine: HTML.SVGLine
    let connectionValid: boolean
    let connectionDropTargetPin: IOPinView

    dragBehaviour.set(PointerMode.DRAG_IO_PIN,
    {
        start(ev: PointerEvent) {
            const startPos = circuit.traceLayer.cellCenterScreenPos(selection.pin.absPos)
            const endPos = pointer.screenPos
            connectionLine = new HTML.SVGLine(startPos, endPos, {
                parent: circuit.traceLayer.svg,
                color: 'rgba(255, 255, 255, 0.5)',
                dashArray: '3, 3'
            })
        },
        move(ev: PointerEvent) {
            connectionLine.setEndPos(pointer.screenPos)
            if (pointer.targetElem instanceof IOPinView) {
                connectionDropTargetPin = pointer.targetElem as IOPinView
                connectionValid = (selection.pin.direction == 'left' && connectionDropTargetPin.direction == 'right' ||
                                   selection.pin.direction == 'right' && connectionDropTargetPin.direction == 'left');
                                   
                connectionLine.setColor(connectionValid ? circuit.style.colors.connectionLineValid
                                                        : circuit.style.colors.connectionLine)
            }
            else {
                connectionValid = false
                connectionDropTargetPin = null
                connectionLine.setColor(circuit.style.colors.connectionLine)
            }
        },
        end(ev: PointerEvent) {
            if (connectionValid) {
                (selection.pin.direction == 'left')
                    ? selection.pin.io.setSource(connectionDropTargetPin.io)
                    : connectionDropTargetPin.io.setSource(selection.pin.io)
                
                selection.removeAll()
            }
            connectionLine.delete()
        }
    })
    
    //  Drag trace anchor
    // -------------------
    let selectedAnchorStartDragPos: Vec2

    dragBehaviour.set(PointerMode.DRAG_TRACE_ANCHOR,
    {
        start(ev: PointerEvent) {
            selectedAnchorStartDragPos = selection.anchor.pos
            selection.anchor.traceLine.route.collisions = []
        },
        move(ev: PointerEvent) {
            const newPos = Vec2.add(selectedAnchorStartDragPos, pointer.scaledDragOffset)
            selection.anchor.move(newPos)
        },
        end(ev: PointerEvent) {
            const newPos = Vec2.add(selectedAnchorStartDragPos, pointer.scaledDragOffset).round()
            selection.anchor.move(newPos)
            selection.removeAll()
            circuit.requestUpdate(circuit.grid)
        }
    })

    // =======================
    //  Handle dragging modes
    // =======================
    const onDragStarted = (ev: PointerEvent) =>
    {
        ev.preventDefault()
        if (pointerMode == PointerMode.MODAL_MENU) return
        else if (pointer.downTargetElem == circuit.body && ev.buttons == MouseButton.RIGHT) {
            pointerMode = PointerMode.DRAG_SCROLL_VIEW
        }
        else if (pointer.downTargetElem == circuit.body && ev.buttons == MouseButton.LEFT) {
            pointerMode = PointerMode.DRAG_SELECTION_BOX
        }
        else if (selection.type == 'Block') {
            pointerMode = PointerMode.DRAG_BLOCK
        }
        else if (selection.type == 'Pin') {
            pointerMode = PointerMode.DRAG_IO_PIN
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