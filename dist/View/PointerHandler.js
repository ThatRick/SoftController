import * as HTML from '../Lib/HTML.js';
import Vec2, { vec2 } from '../Lib/Vector2.js';
import FunctionBlockView from './FunctionBlockView.js';
import IOPinView from './IOPinView.js';
import FunctionBlockContextMenu from './FunctionBlockContextMenu.js';
import CircuitContextMenu from './CircuitContextMenu.js';
export default function CircuitPointerHandler(circuit) {
    const pointer = circuit.pointer;
    const selection = circuit.selection;
    let menu;
    let pointerMode = 0 /* DEFAULT */;
    const onPointerDown = (ev) => {
        const elem = pointer.targetElem;
        if (ev.altKey)
            console.log('Target', elem, pointer.screenPos);
        if (menu) {
            menu.remove();
            menu = null;
        }
        // Select Block
        if (!ev.shiftKey && elem instanceof FunctionBlockView && !selection.has(elem)) {
            selection.set(elem);
        }
        // Select Pin
        else if (elem instanceof IOPinView) {
            selection.set(elem);
        }
    };
    const onClicked = (ev) => {
        const elem = pointer.targetElem;
        // Deselect all
        if (!elem) {
            selection.removeAll();
            return;
        }
        else if (!ev.shiftKey && elem instanceof FunctionBlockView) {
            selection.set(elem);
        }
        else if (ev.shiftKey && elem instanceof FunctionBlockView) {
            selection.has(elem)
                ? selection.remove(elem)
                : selection.add(elem);
        }
    };
    const onRightClicked = (ev) => {
        const elem = pointer.targetElem;
        // Open circuit context menu
        if (!elem) {
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
                }
            });
        }
    };
    const dragBehaviour = new Map();
    let scrollStartPos;
    dragBehaviour.set(1 /* DRAG_SCROLL_VIEW */, {
        start(ev) {
            scrollStartPos = vec2(circuit.parentDOM.scrollLeft, circuit.parentDOM.scrollTop);
            circuit.DOMElement.style.cursor = 'grab';
        },
        dragging(ev) {
            circuit.parentDOM.scrollLeft = scrollStartPos.x - pointer.screenDragOffset.x;
            circuit.parentDOM.scrollTop = scrollStartPos.y - pointer.screenDragOffset.y;
        },
        end(ev) {
            circuit.DOMElement.style.cursor = 'default';
        }
    });
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
        dragging(ev) {
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
    const selectedBlocksStartDragPos = new WeakMap();
    dragBehaviour.set(3 /* DRAG_BLOCK */, {
        start(ev) {
            selection.blocks.forEach(block => {
                selectedBlocksStartDragPos.set(block, block.pos.copy());
                block.onDragStarted?.(ev, circuit.pointer);
            });
        },
        dragging(ev) {
            selection.blocks.forEach(block => {
                const startPos = selectedBlocksStartDragPos.get(block);
                block.setPos(Vec2.add(startPos, pointer.scaledDragOffset));
                block.onDragging?.(ev, circuit.pointer);
            });
        },
        end(ev) {
            selection.blocks.forEach(block => {
                const startPos = selectedBlocksStartDragPos.get(block);
                block.setPos(Vec2.add(startPos, pointer.scaledDragOffset).round());
                block.onDragEnded?.(ev, circuit.pointer);
            });
        }
    });
    const onDragStarted = (ev) => {
        if (pointerMode == 7 /* MODAL_MENU */) { }
        else if (pointer.downEventTarget == circuit.DOMElement && ev.buttons == 2 /* RIGHT */) {
            pointerMode = 1 /* DRAG_SCROLL_VIEW */;
        }
        else if (pointer.downEventTarget == circuit.DOMElement && ev.buttons == 1 /* LEFT */) {
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
        console.log('onDragStarted:', pointerMode);
        dragBehaviour.get(pointerMode)?.start(ev);
    };
    const onDragging = (ev) => {
        dragBehaviour.get(pointerMode)?.dragging(ev);
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
