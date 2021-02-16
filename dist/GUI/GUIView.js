import { vec2 } from '../Lib/Vector2.js';
import GUIContainer from './GUIContainer.js';
import GUIPointer from './GUIPointer.js';
export default class GUIView {
    constructor(parentDOM, size, scale, style, css) {
        this.parentDOM = parentDOM;
        this.gui = this;
        this.eventTargetMap = new WeakMap();
        this.updateRequests = new Set();
        this.pos = vec2(0, 0);
        this.absPos = vec2(0, 0);
        this.DOMElement = document.createElement('div');
        parentDOM.appendChild(this.DOMElement);
        const defaultStyle = {
            position: 'relative',
            top: '0px',
            left: '0px',
        };
        Object.assign(this.DOMElement.style, defaultStyle, css);
        this._size = size;
        this.rescale(scale);
        this.restyle(style);
        this.children = new GUIContainer(this);
        this.pointer = new GUIPointer(this);
        this.setup?.();
        requestAnimationFrame(this.update.bind(this));
    }
    setSize(v) {
        if (this._size?.equal(v))
            return;
        this._size = Object.freeze(v.copy());
        this._resize();
    }
    get size() { return this._size; }
    _resize() {
        this.DOMElement.style.width = this._size.x * this._scale.x + 'px';
        this.DOMElement.style.height = this._size.y * this._scale.y + 'px';
    }
    rescale(scale) {
        if (this._scale?.equal(scale))
            return;
        this._scale = Object.freeze(scale.copy());
        this._resize();
        this.children?.rescale(scale);
    }
    get scale() { return this._scale; }
    restyle(style) {
        this._style = Object.freeze(style);
        this.children?.restyle(style);
    }
    get style() { return this._style; }
    update() {
        this.pointer.update();
        this.updateRequests.forEach(elem => {
            const keep = elem.update();
            if (!keep)
                this.updateRequests.delete(elem);
        });
        this.loop?.();
        requestAnimationFrame(this.update.bind(this));
        return false;
    }
    delete() {
        this.children?.delete();
        this.parentDOM.removeChild(this.DOMElement);
        requestAnimationFrame(null);
    }
    //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤
    //     Element handling
    //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤
    registerElement(elem) {
        this.eventTargetMap.set(elem.DOMElement, elem);
    }
    unregisterElement(elem) {
        this.eventTargetMap.delete(elem.DOMElement);
    }
    requestElementUpdate(elem) {
        this.updateRequests.add(elem);
    }
}
