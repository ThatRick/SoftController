import { GUIChildElement } from '../GUI/GUIChildElement.js'
import { GUIPointerEventHandler } from '../GUI/GUITypes.js'
import * as HTML from '../Lib/HTML.js'
import CircuitView from './CircuitView.js'

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

export default function CircuitPointerHandler(circuit: CircuitView) //: GUIPointerEventHandler
{

}