import { vec2 } from '../Lib/Vector2.js';
import GUIContainer from './GUIContainer.js';
import GUIPointer from './GUIPointer.js';
import { EventEmitter } from '../Lib/Events.js';
export default class GUIView {
    parentDOM;
    DOMElement;
    gui = this;
    pos = vec2(0, 0);
    absPos = vec2(0, 0);
    get size() { return this._size; }
    get scale() { return this._scale; }
    get style() { return this._style; }
    resize(v) {
        if (this._size?.equal(v))
            return;
        this._size = Object.freeze(v.copy());
        this._resize();
        this.onResize?.();
        this.events.emit(0 /* Resized */);
    }
    rescale(scale) {
        if (this._scale?.equal(scale))
            return;
        this._scale = Object.freeze(scale.copy());
        this._resize();
        this.onRescale?.();
        this.children?.rescale(scale);
        this.events.emit(1 /* Rescaled */);
    }
    restyle(style) {
        this._style = Object.freeze(style);
        this.onRestyle?.();
        this.children?.restyle(style);
        this.events.emit(2 /* Restyled */);
    }
    parentMoved() {
        this.children?.parentMoved();
    }
    pointer;
    events = new EventEmitter(this);
    //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤
    //                CONSTRUCTOR  
    //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤
    constructor(parentDOM, size, scale, style, css) {
        this.parentDOM = parentDOM;
        this.DOMElement = document.createElement('div');
        parentDOM.appendChild(this.DOMElement);
        const defaultStyle = {
            position: 'relative',
            top: '0px',
            left: '0px',
        };
        Object.assign(this.DOMElement.style, defaultStyle, css);
        this._size = Object.freeze(size.copy());
        this._scale = Object.freeze(scale.copy());
        this._style = Object.freeze(style);
        this.children = new GUIContainer(this);
        this.pointer = new GUIPointer(this);
        requestAnimationFrame(this.update.bind(this));
    }
    //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤
    //            PRIVATE & PROTECTED  
    //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤
    _scale;
    _size;
    _style;
    _resize() {
        this.DOMElement.style.width = this._size.x * this._scale.x + 'px';
        this.DOMElement.style.height = this._size.y * this._scale.y + 'px';
    }
    children;
    eventTargetMap = new WeakMap();
    updateRequests = new Set();
    update() {
        this.pointer.update();
        this.updateRequests.forEach(elem => {
            const keep = elem.update();
            if (!keep)
                this.updateRequests.delete(elem);
        });
        this.onUpdate?.();
        requestAnimationFrame(this.update.bind(this));
        return false;
    }
    setStyle(style) {
        Object.assign(this.DOMElement.style, style);
    }
    delete() {
        this.children?.delete();
        this.eventTargetMap = null;
        this.updateRequests.clear();
        this.parentDOM.removeChild(this.DOMElement);
        requestAnimationFrame(null);
        this.events.emit(3 /* Removed */);
        this.events.clear();
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
    requestUpdate(obj) {
        this.updateRequests.add(obj);
    }
    //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤
    //   Pointer events
    //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤
    onPointerEnter;
    onPointerDown;
    onPointerMove;
    onPointerUp;
    onClicked;
    onDoubleClicked;
    onDragStarted;
    onDragging;
    onDragEnded;
}
