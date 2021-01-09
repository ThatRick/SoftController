import {IDOMElement, IGUIElement, IGUIContainer, IGUIView} from './GUITypes.js'

export default class GUIContainer<T extends IGUIElement> implements IGUIContainer
{
    DOMElement: HTMLElement
    elements = new Set<T>()
    uninitializedElements = new Set<T>()

    gui: IGUIView

    constructor(private parent: IDOMElement)
    {
        this.DOMElement = parent.DOMElement
    }

    get pos() { return this.parent.pos }
    get absPos() { return this.parent.absPos }
    get size() { return this.parent.size }

    attachChildElement(elem: T) {
        this.DOMElement.appendChild(elem.DOMElement)
        this.elements.add(elem)
        elem.parent = this

        if (this.gui)
            this.initChild(elem)
        else
            this.uninitializedElements.add(elem)  
    }

    removeChildElement(elem: T) {
        if (!this.gui) {
            this.uninitializedElements.delete(elem)            
            return
        }

        this.DOMElement.removeChild(elem.DOMElement)
        this.elements.delete(elem)
        elem.parent = undefined
        this.gui.unregisterElement(elem)
    }

    initChild(elem) {
        elem.init(this.gui)
        this.gui.registerElement(elem)
    }

    init(gui: IGUIView) {
        console.log('GUIContainer init')
        this.gui = gui
        this.uninitializedElements.forEach(elem => this.initChild(elem))
        this.uninitializedElements.clear()
    }

    update(gui: IGUIView, force) {
        this.elements.forEach(elem => elem.update(gui, force))
        return false
    }

}