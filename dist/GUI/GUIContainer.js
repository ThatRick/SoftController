export default class GUIContainer {
    constructor(parent) {
        this.parent = parent;
        this.elements = new Set();
        this.uninitializedElements = new Set();
        this.DOMElement = parent.DOMElement;
    }
    get pos() { return this.parent.pos; }
    get absPos() { return this.parent.absPos; }
    get size() { return this.parent.size; }
    attachChildElement(elem) {
        this.DOMElement.appendChild(elem.DOMElement);
        this.elements.add(elem);
        elem.parent = this;
        if (this.gui)
            this.initChild(elem);
        else
            this.uninitializedElements.add(elem);
    }
    removeChildElement(elem) {
        if (!this.gui) {
            this.uninitializedElements.delete(elem);
            return;
        }
        this.DOMElement.removeChild(elem.DOMElement);
        this.elements.delete(elem);
        elem.parent = undefined;
        this.gui.unregisterElement(elem);
    }
    initChild(elem) {
        elem.init(this.gui);
        this.gui.registerElement(elem);
    }
    init(gui) {
        this.gui = gui;
        this.uninitializedElements.forEach(elem => this.initChild(elem));
        this.uninitializedElements.clear();
    }
    update(gui, force) {
        this.elements.forEach(elem => elem.update(gui, force));
        return false;
    }
}
