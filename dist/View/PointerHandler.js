import * as HTML from '../Lib/HTML.js';
import Vec2, { vec2 } from '../Lib/Vector2.js';
import FunctionBlockView from './FunctionBlockView.js';
import IOPinView from './IOPinView.js';
import FunctionBlockContextMenu from './FunctionBlockContextMenu.js';
import CircuitContextMenu from './CircuitContextMenu.js';
import { TraceAnchorHandle } from './TraceLine.js';
import IOPinContextMenu from './IOPinContextMenu.js';
export default function CircuitPointerHandler(circuit) {
    const pointer = circuit.pointer;
    const selection = circuit.selection;
    let menu;
    let pointerMode = 0 /* DEFAULT */;
    const onPointerDown = (ev) => {
        const elem = pointer.targetElem;
        if (ev.altKey)
            console.log('Target', elem, pointer.screenPos);
        // Discard modal menu
        if (menu) {
            menu.remove();
            menu = null;
        }
        // Unselect all
        if (elem == circuit.body) {
            selection.removeAll();
        }
        // Set selection to unselected block (to enable instant dragging of unselected block)
        else if (elem instanceof FunctionBlockView && !ev.shiftKey && !selection.has(elem)) {
            selection.set(elem);
        }
        // Anchor
        else if (elem instanceof TraceAnchorHandle) {
            selection.set(elem);
        }
        // IO Pin
        else if (elem instanceof IOPinView) {
            const clickedPin = elem;
            if (selection.type == 'Pin') {
                if (selection.pin.direction == 'left' && clickedPin.direction == 'right') {
                    // Make connection
                    selection.pin.io.setSource(clickedPin.io);
                    // Unselect
                    selection.removeAll();
                }
                else if (selection.pin.direction == 'right' && clickedPin.direction == 'left') {
                    // Make connection
                    clickedPin.io.setSource(selection.pin.io);
                    // Unselect if not shift key down
                    if (!ev.shiftKey)
                        selection.removeAll();
                }
                else
                    selection.set(elem);
            }
            else
                selection.set(elem);
        }
    };
    const onClicked = (ev) => {
        const elem = pointer.targetElem;
        // Set selection to block (no shift key)
        if (!ev.shiftKey && elem instanceof FunctionBlockView) {
            selection.set(elem);
        }
        // Add or remove selection (with shift key)
        else if (ev.shiftKey && elem instanceof FunctionBlockView) {
            selection.has(elem)
                ? selection.remove(elem)
                : selection.add(elem);
        }
    };
    const onRightClicked = (ev) => {
        const elem = pointer.targetElem;
        // Open circuit context menu
        if (elem == circuit.body) {
            selection.removeAll();
            pointerMode = 7 /* MODAL_MENU */;
            menu = CircuitContextMenu({
                circuitView: circuit,
                parentContainer: circuit.DOMElement,
                pos: pointer.screenDownPos.copy(),
                destructor: () => {
                    menu.remove();
                    menu = null;
                    pointerMode = 0 /* DEFAULT */;
                }
            });
        }
        // Open function block context menu
        else if (elem instanceof FunctionBlockView) {
            pointerMode = 7 /* MODAL_MENU */;
            menu = FunctionBlockContextMenu({
                blockView: elem,
                parentContainer: circuit.DOMElement,
                pos: pointer.screenDownPos.copy(),
                destructor: () => {
                    menu.remove();
                    menu = null;
                    pointerMode = 0 /* DEFAULT */;
                    selection.removeAll();
                }
            });
        }
        // Open IO pin context menu
        else if (elem instanceof IOPinView) {
            pointerMode = 7 /* MODAL_MENU */;
            menu = IOPinContextMenu({
                ioPinView: elem,
                parentContainer: circuit.DOMElement,
                pos: pointer.screenDownPos.copy(),
                destructor: () => {
                    menu.remove();
                    menu = null;
                    pointerMode = 0 /* DEFAULT */;
                    selection.removeAll();
                }
            });
        }
    };
    const dragBehaviour = new Map();
    //  Scroll view
    // -------------
    let scrollStartPos;
    dragBehaviour.set(1 /* DRAG_SCROLL_VIEW */, {
        start(ev) {
            scrollStartPos = vec2(circuit.parentDOM.scrollLeft, circuit.parentDOM.scrollTop);
            circuit.DOMElement.style.cursor = 'grab';
        },
        move(ev) {
            circuit.parentDOM.scrollLeft = scrollStartPos.x - pointer.screenDragOffset.x;
            circuit.parentDOM.scrollTop = scrollStartPos.y - pointer.screenDragOffset.y;
        },
        end(ev) {
            circuit.DOMElement.style.cursor = 'default';
        }
    });
    //  Draw selection box
    // --------------------
    let selectionBoxStartPos;
    let selectionBox;
    dragBehaviour.set(2 /* DRAG_SELECTION_BOX */, {
        start(ev) {
            selectionBoxStartPos = pointer.screenDownPos;
            selectionBox = HTML.domElement(circuit.DOMElement, 'div', {
                position: 'absolute',
                backgroundColor: 'rgba(128,128,255,0.2)',
                border: 'thin solid #88F',
                pointerEvents: 'none',
                ...getPositiveRectAttributes(selectionBoxStartPos, circuit.pointer.screenDragOffset)
            });
        },
        move(ev) {
            Object.assign(selectionBox.style, getPositiveRectAttributes(selectionBoxStartPos, circuit.pointer.screenDragOffset));
        },
        end(ev) {
            if (!ev.shiftKey)
                selection.removeAll();
            circuit.blockViews.forEach(block => {
                const pos = Vec2.div(selectionBoxStartPos, circuit.scale);
                const size = Vec2.div(circuit.pointer.screenDragOffset, circuit.scale);
                if (isElementInsideRect(block, pos, size)) {
                    selection.add(block);
                }
            });
            circuit.DOMElement.removeChild(selectionBox);
        }
    });
    //  Drag a block
    // --------------
    const selectedBlocksStartDragPos = new WeakMap();
    dragBehaviour.set(3 /* DRAG_BLOCK */, {
        start(ev) {
            pointer.downTargetElem?.setStyle({ cursor: 'grabbing' });
            selection.blocks.forEach(block => {
                selectedBlocksStartDragPos.set(block, block.pos.copy());
                block.onDragStarted?.(ev, circuit.pointer);
            });
            circuit.traceLayer.resetCollisions();
        },
        move(ev) {
            selection.blocks.forEach(block => {
                const startPos = selectedBlocksStartDragPos.get(block);
                block.setPos(Vec2.add(startPos, pointer.scaledDragOffset));
                block.onDragging?.(ev, circuit.pointer);
            });
        },
        end(ev) {
            pointer.downTargetElem?.setStyle({ cursor: 'grab' });
            selection.blocks.forEach(block => {
                const startPos = selectedBlocksStartDragPos.get(block);
                block.setPos(Vec2.add(startPos, pointer.scaledDragOffset).round());
                block.onDragEnded?.(ev, circuit.pointer);
                circuit.requestUpdate(circuit.grid);
            });
        }
    });
    //  Drag IO pin
    // -------------
    let connectionLine;
    let connectionValid;
    let connectionDropTargetPin;
    dragBehaviour.set(4 /* DRAG_IO_PIN */, {
        start(ev) {
            const startPos = circuit.traceLayer.cellCenterScreenPos(selection.pin.absPos);
            const endPos = pointer.screenPos;
            connectionLine = new HTML.SVGLine(startPos, endPos, {
                parent: circuit.traceLayer.svg,
                color: 'rgba(255, 255, 255, 0.5)',
                dashArray: '3, 3'
            });
        },
        move(ev) {
            connectionLine.setEndPos(pointer.screenPos);
            if (pointer.targetElem instanceof IOPinView) {
                connectionDropTargetPin = pointer.targetElem;
                connectionValid = (selection.pin.direction == 'left' && connectionDropTargetPin.direction == 'right' ||
                    selection.pin.direction == 'right' && connectionDropTargetPin.direction == 'left');
                connectionLine.setColor(connectionValid ? circuit.style.colors.connectionLineValid
                    : circuit.style.colors.connectionLine);
            }
            else {
                connectionValid = false;
                connectionDropTargetPin = null;
                connectionLine.setColor(circuit.style.colors.connectionLine);
            }
        },
        end(ev) {
            if (connectionValid) {
                (selection.pin.direction == 'left')
                    ? selection.pin.io.setSource(connectionDropTargetPin.io)
                    : connectionDropTargetPin.io.setSource(selection.pin.io);
                selection.removeAll();
            }
            connectionLine.delete();
        }
    });
    //  Drag trace anchor
    // -------------------
    let selectedAnchorStartDragPos;
    dragBehaviour.set(5 /* DRAG_TRACE_ANCHOR */, {
        start(ev) {
            selectedAnchorStartDragPos = selection.anchor.pos;
            selection.anchor.traceLine.route.collisions = [];
        },
        move(ev) {
            const newPos = Vec2.add(selectedAnchorStartDragPos, pointer.scaledDragOffset);
            selection.anchor.move(newPos);
        },
        end(ev) {
            const newPos = Vec2.add(selectedAnchorStartDragPos, pointer.scaledDragOffset).round();
            selection.anchor.move(newPos);
            selection.removeAll();
            circuit.requestUpdate(circuit.grid);
        }
    });
    // =======================
    //  Handle dragging modes
    // =======================
    const onDragStarted = (ev) => {
        ev.preventDefault();
        if (pointerMode == 7 /* MODAL_MENU */)
            return;
        else if (pointer.downTargetElem == circuit.body && ev.buttons == 2 /* RIGHT */) {
            pointerMode = 1 /* DRAG_SCROLL_VIEW */;
        }
        else if (pointer.downTargetElem == circuit.body && ev.buttons == 1 /* LEFT */) {
            pointerMode = 2 /* DRAG_SELECTION_BOX */;
        }
        else if (selection.type == 'Block') {
            pointerMode = 3 /* DRAG_BLOCK */;
        }
        else if (selection.type == 'Pin') {
            pointerMode = 4 /* DRAG_IO_PIN */;
        }
        else if (selection.type == 'Anchor') {
            pointerMode = 5 /* DRAG_TRACE_ANCHOR */;
        }
        console.log('onDragStarted:', pointerMode);
        dragBehaviour.get(pointerMode)?.start(ev);
    };
    const onDragging = (ev) => {
        ev.preventDefault();
        dragBehaviour.get(pointerMode)?.move(ev);
    };
    const onDragEnded = (ev) => {
        dragBehaviour.get(pointerMode)?.end(ev);
        pointerMode = 0 /* DEFAULT */;
    };
    return {
        onPointerDown,
        onClicked,
        onRightClicked,
        onDragStarted,
        onDragging,
        onDragEnded
    };
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
