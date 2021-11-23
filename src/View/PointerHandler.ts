import { GUIChildElement } from '../GUI/GUIChildElement.js'
import { GUIPointerEventHandler } from '../GUI/GUITypes.js'
import * as HTML from '../Lib/HTML.js'
import Vec2, { vec2 } from '../Lib/Vector2.js'
import CircuitView, { CircuitIOArea } from './CircuitView.js'
import FunctionBlockView from './FunctionBlockView.js'
import IOPinView from './IOPinView.js'
import FunctionBlockContextMenu from './FunctionBlockContextMenu.js'
import CircuitContextMenu from './CircuitContextMenu.js'
import { TraceAnchorHandle } from './TraceLine.js'
import IOPinContextMenu from './IOPinContextMenu.js'
import CircuitIOView from './CircuitIOView.js'
import CircuitIOAreaContextMenu from './CircuitIOAreaContextMenu.js'

const enum PointerMode {
    DEFAULT,
    DRAG_SCROLL_VIEW,
    DRAG_SELECTION_BOX,
    DRAG_BLOCK,
    DRAG_CIRCUIT_IO,
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

export default function CircuitPointerHandler(circuitView: CircuitView): GUIPointerEventHandler
{
    const pointer = circuitView.pointer
    const selection = circuitView.selection

    let menu: HTML.Menu

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
        if (elem == circuitView.body) {
            selection.unselectAll()
        }
        // Function Block
        else if (elem instanceof FunctionBlockView && !ev.shiftKey && !selection.has(elem)) {
            selection.set(elem)
        }
        // Circuit IO
        else if (elem instanceof CircuitIOView) {
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
                    selection.unselectAll()
                }
                else if (selection.pin.direction == 'right' && clickedPin.direction == 'left') {
                    // Make connection
                    clickedPin.io.setSource(selection.pin.io)
                    // Unselect source if shift key not down
                    if (!ev.shiftKey) selection.unselectAll()
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
                ? selection.unselect(elem)
                : selection.add(elem)
        }
        else if (elem instanceof TraceAnchorHandle) {
            selection.anchor.traceLine.onSelected()
        }
    }

    const onDoubleClicked = (ev: PointerEvent) => {
        // Double click on IO pin
        if (selection.type == 'Pin') {
            const pin = selection.pin
            selection.unselectAll()
            if (pin.io.datatype == 'BINARY') {
                if (pin.io.sourceIO) {
                    pin.io.setInversion(!pin.io.inverted)
                } else {
                    pin.io.setValue(pin.io.value ? 0 : 1)
                }
            } else {
                const inputField = new HTML.InputField({
                    value: pin.io.value,
                    parent: pin.DOMElement,
                    containerStyle: {
                        position: 'absolute',
                        [(pin.direction == 'left') ? 'right' : 'left']: '0px',
                        bottom: '0px'
                    },
                    inputStyle: { textAlign: (pin.direction == 'left') ? 'right' : 'left' },
                    onSubmitValue: (value: number) => {
                        console.log('set value to', value)
                        if (value != null) pin.io.setValue(value)
                        inputField.remove()
                    }
                })
            }
        }
        // Double click on Circuit IO view
        if (selection.type == 'CircuitIO') {
            const circIOView = selection.circuitIO
            const inputField = new HTML.InputField({
                value: circIOView.pin.io.name,
                parent: circIOView.DOMElement,
                containerStyle: {
                    position: 'absolute',
                    left: '0px',
                    bottom: '0px'
                },
                onSubmitText: (text: string) => {
                    console.log('set value to', text)
                    if (text != null) circIOView.pin.io.setName(text)
                    inputField.remove()
                }
            })
        }
    }

    const onRightClicked = (ev: PointerEvent) => {
        const elem = pointer.targetElem
        
        // Open circuit context menu
        if (elem == circuitView.body) {
            selection.unselectAll()
            pointerMode = PointerMode.MODAL_MENU
            menu = CircuitContextMenu({
                circuitView: circuitView,
                parentContainer: circuitView.DOMElement,
                pos: pointer.screenDownPos.copy(),
                destructor: () => {
                    menu.remove()
                    menu = null
                    pointerMode = PointerMode.DEFAULT
                }
            })
        }
        // Open circuit IO area context menu
        else if (elem instanceof CircuitIOArea) {
            pointerMode = PointerMode.MODAL_MENU
            const ioArea = elem as CircuitIOArea
            menu = CircuitIOAreaContextMenu({
                ioArea,
                parentContainer: circuitView.DOMElement,
                pos: pointer.screenDownPos.copy(),
                destructor: () => {
                    menu.remove()
                    menu = null
                    pointerMode = PointerMode.DEFAULT
                    selection.unselectAll()
                }
            })
        }
        // Open function block context menu
        else if (elem instanceof FunctionBlockView) {
            pointerMode = PointerMode.MODAL_MENU
            menu = FunctionBlockContextMenu({
                selection,
                circuitView,
                parentContainer: circuitView.DOMElement,
                pos: pointer.screenDownPos.copy(),
                destructor: () => {
                    menu.remove()
                    menu = null
                    pointerMode = PointerMode.DEFAULT
                    selection.unselectAll()
                }
            })
        }
        // Open IO pin context menu
        else if (elem instanceof IOPinView) {
            pointerMode = PointerMode.MODAL_MENU
            menu = IOPinContextMenu({
                ioPinView: elem,
                parentContainer: circuitView.DOMElement,
                pos: pointer.screenDownPos.copy(),
                destructor: () => {
                    menu.remove()
                    menu = null
                    pointerMode = PointerMode.DEFAULT
                    selection.unselectAll()
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
            scrollStartPos = vec2(circuitView.parentDOM.scrollLeft, circuitView.parentDOM.scrollTop)
            circuitView.DOMElement.style.cursor = 'grab'
        },
        move(ev: PointerEvent) {
            circuitView.parentDOM.scrollLeft = scrollStartPos.x - pointer.screenDragOffset.x
            circuitView.parentDOM.scrollTop = scrollStartPos.y - pointer.screenDragOffset.y
        },
        end(ev: PointerEvent) {
            circuitView.DOMElement.style.cursor = 'default'
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
            selectionBox = HTML.domElement(circuitView.DOMElement, 'div', {
                position: 'absolute',
                backgroundColor: 'rgba(128,128,255,0.2)',
                border: 'thin solid #88F',
                pointerEvents: 'none',
                ...getPositiveRectAttributes(selectionBoxStartPos, circuitView.pointer.screenDragOffset)
            })
        },
        move(ev: PointerEvent) {
            Object.assign(selectionBox.style, getPositiveRectAttributes(selectionBoxStartPos, circuitView.pointer.screenDragOffset))
        },
        end(ev: PointerEvent) {
            if (!ev.shiftKey) selection.unselectAll()
            circuitView.blockViews.forEach(block => {
                const pos = Vec2.div(selectionBoxStartPos, circuitView.scale)
                const size = Vec2.div(circuitView.pointer.screenDragOffset, circuitView.scale)
                if (isElementInsideRect(block, pos, size)) {
                    selection.add(block)
                }
            })
            circuitView.DOMElement.removeChild(selectionBox)
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
                block.onDragStarted?.(ev, circuitView.pointer)
            })
            circuitView.traceLayer.resetCollisions()
        },
        move(ev: PointerEvent) {
            selection.blocks.forEach(block => {
                const startPos = selectedBlocksStartDragPos.get(block)
                const newPos = Vec2.add(startPos, pointer.scaledDragOffset)
                                   .limit(vec2(CircuitView.IO_AREA_WIDTH + 3, 1),
                                          vec2(circuitView.size.x - CircuitView.IO_AREA_WIDTH - block.size.x - 3, circuitView.size.y - block.size.y - 1))
                block.setPos(newPos)
                block.onDragging?.(ev, circuitView.pointer)
            })
        },
        end(ev: PointerEvent) {
            pointer.downTargetElem?.setStyle({cursor: 'grab'})
            selection.blocks.forEach(block => {
                block.setPos(Vec2.round(block.pos))
                block.onDragEnded?.(ev, circuitView.pointer)
                circuitView.requestUpdate(circuitView.grid)
            })
        }
    })

    //  Drag a circuit IO view
    // --------------
    let circuitIODragStartPos: Vec2

    dragBehaviour.set(PointerMode.DRAG_CIRCUIT_IO,
    {
        start(ev: PointerEvent) {
            selection.circuitIO.setStyle({cursor: 'grabbing'})
            circuitIODragStartPos = selection.circuitIO.pos
        },
        move(ev: PointerEvent) {
            const newPos = Vec2.add(circuitIODragStartPos, vec2(0, pointer.scaledDragOffset.y))
                           .limit(vec2(0, 0), vec2(0, circuitView.size.y))
            selection.circuitIO.setPos(newPos)
            selection.circuitIO.onDragging?.(ev, circuitView.pointer)
        },
        end(ev: PointerEvent) {
            selection.circuitIO.setPos(Vec2.round(selection.circuitIO.pos))
            selection.circuitIO.onDragEnded?.(ev, circuitView.pointer)
            
            circuitView.requestUpdate(circuitView.grid)
        }
    })

    //  Drag IO pin
    // -------------
    let connectionLine: HTML.SVGLine
    let connectionDropTargetPin: IOPinView
    let connectionCreateValid: boolean
    let connectionMoveInputValid: boolean
    let connectionMoveOutputValid: boolean

    dragBehaviour.set(PointerMode.DRAG_IO_PIN,
    {
        start(ev: PointerEvent) {
            const startPos = circuitView.traceLayer.cellCenterScreenPos(selection.pin.absPos)
            const endPos = pointer.screenPos
            connectionLine = new HTML.SVGLine(startPos, endPos, {
                parent: circuitView.traceLayer.svg,
                color: 'rgba(255, 255, 255, 0.5)',
                dashArray: '3, 3',
                strokeWidth: 2
            })
        },
        move(ev: PointerEvent) {
            connectionLine.setEndPos(pointer.screenPos)
            if (pointer.targetElem instanceof IOPinView) {
                connectionDropTargetPin = pointer.targetElem as IOPinView

                connectionCreateValid = (selection.pin.direction == 'left' && connectionDropTargetPin.direction == 'right'
                                      || selection.pin.direction == 'right' && connectionDropTargetPin.direction == 'left');

                connectionMoveInputValid = (selection.pin.direction == 'left' && connectionDropTargetPin.direction == 'left'
                                      && selection.pin != connectionDropTargetPin
                                      && selection.pin.io.sourceIO != null);

                connectionMoveOutputValid = (selection.pin.direction == 'right' && connectionDropTargetPin.direction == 'right'
                                      && selection.pin != connectionDropTargetPin
                                      && ([...circuitView.traceLines.values()].find(trace => trace.sourcePinView.io == selection.pin.io) != null))

                connectionLine.setColor((connectionCreateValid || connectionMoveInputValid || connectionMoveOutputValid)
                    ? circuitView.style.colors.connectionLineValid
                    : circuitView.style.colors.connectionLine)
            }
            else {
                connectionCreateValid = false
                connectionMoveInputValid = false
                connectionMoveOutputValid = false
                connectionDropTargetPin = null
                connectionLine.setColor(circuitView.style.colors.connectionLine)
            }
        },
        end(ev: PointerEvent) {
            if (connectionCreateValid) {
                (selection.pin.direction == 'left')
                    ? selection.pin.io.setSource(connectionDropTargetPin.io)
                    : connectionDropTargetPin.io.setSource(selection.pin.io)
            }
            if (connectionMoveInputValid) {
                connectionDropTargetPin.io.setSource(selection.pin.io.sourceIO)
                connectionDropTargetPin.io.setInversion(selection.pin.io.inverted)
                selection.pin.io.setSource(null)
            }

            if (connectionMoveOutputValid) {
                ([...circuitView.traceLines.values()]
                .filter(trace => trace.sourcePinView.io == selection.pin.io)
                .forEach(trace => trace.destPinView.io.setSource(connectionDropTargetPin.io)))
            }
            selection.unselectAll()

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
            selection.unselectAll()
            circuitView.requestUpdate(circuitView.grid)
        }
    })

    // =======================
    //  Handle dragging modes
    // =======================
    const onDragStarted = (ev: PointerEvent) =>
    {
        ev.preventDefault()
        if (pointerMode == PointerMode.MODAL_MENU) return
        else if (pointer.downTargetElem == circuitView.body && ev.buttons == MouseButton.RIGHT) {
            pointerMode = PointerMode.DRAG_SCROLL_VIEW
        }
        else if (pointer.downTargetElem == circuitView.body && ev.buttons == MouseButton.LEFT) {
            pointerMode = PointerMode.DRAG_SELECTION_BOX
        }
        else if (selection.type == 'Block') {
            pointerMode = PointerMode.DRAG_BLOCK
        }
        else if (selection.type == 'CircuitIO') {
            pointerMode = PointerMode.DRAG_CIRCUIT_IO
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
        onDoubleClicked,
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