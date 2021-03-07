export default class GUIContainer {
    constructor(parent) {
        this.parent = parent;
        this.elements = new Set();
        this.DOMElement = parent.DOMElement;
        this.gui = parent.gui;
    }
    get pos() { return this.parent.pos; }
    get absPos() { return this.parent.absPos; }
    get size() { return this.parent.size; }
    attachChildElement(elem) {
        this.DOMElement.appendChild(elem.DOMElement);
        this.elements.add(elem);
        elem.parentContainer = this;
        elem.gui = this.gui;
        this.gui.registerElement(elem);
    }
    removeChildElement(elem) {
        this.DOMElement.removeChild(elem.DOMElement);
        this.elements.delete(elem);
        elem.parentContainer = undefined;
        this.gui.unregisterElement(elem);
    }
    delete() {
        this.elements.forEach(elem => elem.delete());
    }
    update(force = false) {
        this.elements.forEach(elem => elem.update(force));
        return false;
    }
    rescale(scale) {
        this.elements.forEach(elem => elem.rescale(scale));
        return false;
    }
    restyle(style) {
        this.elements.forEach(elem => elem.restyle(style));
        return false;
    }
    parentMoved() {
        this.elements.forEach(elem => elem.parentMoved?.());
    }
}
