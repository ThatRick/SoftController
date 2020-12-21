import GUIElement from './GUIElement.js'
import GUI from './GUI.js'

export interface GUIContainer
{
    DOMElement: HTMLElement
    elements: Set<GUIElement>

    attachElement: (elem: GUIElement) => void
}

