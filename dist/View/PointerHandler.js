import * as HTML from '../Lib/HTML.js';
import Vec2, { vec2 } from '../Lib/Vector2.js';
import FunctionBlockView from './FunctionBlockView.js';
import IOPinView from './IOPinView.js';
import FunctionBlockContextMenu from './FunctionBlockContextMenu.js';
import CircuitContextMenu from './CircuitContextMenu.js';
import { TraceAnchorHandle } from './TraceLine.js';
export default function CircuitPointerHandler(circuit) {
    const pointer = circuit.pointer;
    const selection = circuit.selection;
    const body = circuit.body;
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
        // Set selection to unselected block (to enable instant dragging of unselected)
        if (!ev.shiftKey && elem instanceof FunctionBlockView && !selection.has(elem)) {
            selection.set(elem);
        }
        // Select Pin or Anchor
        else if (elem instanceof IOPinView || elem instanceof TraceAnchorHandle) {
            selection.set(elem);
        }
        else if (elem == body) {
            selection.removeAll();
        }
    };
    const onClicked = (ev) => {
        const elem = pointer.targetElem;
        // Deselect all
        if (elem == body) {
            selection.removeAll();
        }
        // Set selection to block (no shift key)
        else if (!ev.shiftKey && elem instanceof FunctionBlockView) {
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
        if (elem == body) {
            selection.removeAll();
            pointerMode = 8 /* MODAL_MENU */;
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
            pointerMode = 8 /* MODAL_MENU */;
            menu = FunctionBlockContextMenu({
                blockView: elem,
                parentContainer: circuit.DOMElement,
                pos: pointer.screenDownPos.copy(),
                destructor: () => {
                    menu.remove();
                    menu = null;
                    pointerMode = 0 /* DEFAULT */;
                }
            });
        }
    };
    const dragBehaviour = new Map();
    //  Darg to scroll view
    // ---------------------
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
    //  Drag to draw selection box
    // ----------------------------
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
            });
        }
    });
    //  Drag input pin
    // ----------------
    dragBehaviour.set(4 /* DRAG_INPUT_PIN */, {
        start(ev) {
        },
        move(ev) {
        },
        end(ev) {
        }
    });
    //  Drag trace anchor
    // -------------------
    let selectedAnchorStartDragPos;
    dragBehaviour.set(6 /* DRAG_TRACE_ANCHOR */, {
        start(ev) {
            selectedAnchorStartDragPos = selection.anchor.pos;
        },
        move(ev) {
            const newPos = Vec2.add(selectedAnchorStartDragPos, pointer.scaledDragOffset);
            selection.anchor.move(newPos);
        },
        end(ev) {
            const newPos = Vec2.add(selectedAnchorStartDragPos, pointer.scaledDragOffset).round();
            selection.anchor.move(newPos);
            selection.removeAll();
        }
    });
    // =======================
    //  Handle dragging modes
    // =======================
    const onDragStarted = (ev) => {
        ev.preventDefault();
        if (pointerMode == 8 /* MODAL_MENU */)
            return;
        else if (pointer.downTargetElem == body && ev.buttons == 2 /* RIGHT */) {
            pointerMode = 1 /* DRAG_SCROLL_VIEW */;
        }
        else if (pointer.downTargetElem == body && ev.buttons == 1 /* LEFT */) {
            pointerMode = 2 /* DRAG_SELECTION_BOX */;
        }
        else if (selection.type == 'Block') {
            pointerMode = 3 /* DRAG_BLOCK */;
        }
        else if (selection.type == 'Pin' && selection.pin.type == 'input') {
            pointerMode = 4 /* DRAG_INPUT_PIN */;
        }
        else if (selection.type == 'Pin' && selection.pin.type == 'output') {
            pointerMode = 5 /* DRAG_OUTPUT_PIN */;
        }
        else if (selection.type == 'Anchor') {
            pointerMode = 6 /* DRAG_TRACE_ANCHOR */;
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
