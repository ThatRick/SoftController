import { GUIChildElement } from '../GUI/GUIChildElement.js'
import GUIPointer from '../GUI/GUIPointer.js'
import { GUIPointerEventHandler, IChildElementGUI } from '../GUI/GUITypes.js'
import * as HTML from '../Lib/HTML.js'
import CircuitView from './CircuitView.js'
import { Style } from './Common.js'
import FunctionBlockView from './FunctionBlockView.js'
import IOPinView from './IOPinView.js'

const enum PointerMode {
    POINT,
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
    const pointer = circuit.pointer
    const selection = circuit.selection

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