import {IElementGUI, IChildElementGUI, IViewContainerGUI, IWindowGUI, Vec2, IStyleGUI} from './GUITypes.js'

export default class GUIContainer<T extends IChildElementGUI> implements IViewContainerGUI
{
    DOMElement: HTMLElement
    elements = new Set<T>()

    gui: IWindowGUI

    constructor(private parent: IElementGUI)
    {
        this.DOMElement = parent.DOMElement
        this.gui = parent.gui
    }

    get pos() { return this.parent.pos }
    get absPos() { return this.parent.absPos }
    get size() { return this.parent.size }

    attachChildElement(elem: T) {
        this.DOMElement.appendChild(elem.DOMElement)
        this.elements.add(elem)

        elem.parentContainer = this
        elem.gui = this.gui

        this.gui.registerElement(elem)
    }

    removeChildElement(elem: T) {
        this.DOMElement.removeChild(elem.DOMElement)
        this.elements.delete(elem)
        elem.parentContainer = undefined
        this.gui.unregisterElement(elem)
    }

    delete() {
        this.elements.forEach(elem => elem.delete())
    }

    update(force = false) {
        this.elements.forEach(elem => elem.update(force))
        return false
    }
    rescale(scale: Vec2) {
        this.elements.forEach(elem => elem.rescale(scale))
        return false
    }
    restyle(style: IStyleGUI) {
        this.elements.forEach(elem => elem.restyle(style))
        return false
    }
}