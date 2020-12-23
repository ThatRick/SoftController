import CreatePointerHandlers from './GUIPointerEventHandler.js';
import { vec2 } from './Vector2.js';
import GUIContainer from './GUIContainer.js';
export default class GUIView {
    constructor(DOMElement, style) {
        this.DOMElement = DOMElement;
        this.children = new GUIContainer(this);
        this.DOMElements = new Map();
        this.updateRequests = new Set();
        this._scale = Object.freeze(vec2(1, 1));
        this.snap = Object.freeze(vec2(32));
        this.pos = vec2(0, 0);
        this.absPos = vec2(0, 0);
        this.isScrolling = false;
        this.onDragStarted = (ev) => {
            if (ev.buttons == 4 /* MIDDLE */ && ev.target == this.DOMElement) {
                this.scrollStartPos = vec2(this.DOMElement.scrollLeft, this.DOMElement.scrollTop);
                this.isScrolling = true;
                this.DOMElement.style.cursor = 'grab';
            }
        };
        this.onDragging = (ev) => {
            if (this.isScrolling) {
                this.DOMElement.scrollLeft = this.scrollStartPos.x - this.pointer.dragOffset.x;
                this.DOMElement.scrollTop = this.scrollStartPos.y - this.pointer.dragOffset.y;
            }
        };
        this.onDragEnded = (ev) => {
            this.endScrolling();
        };
        this.onPointerLeave = (ev) => {
            this.endScrolling();
        };
        console.log('GUI Init');
        const defaultStyle = {
            width: '100%',
            position: 'relative',
            overflow: 'auto'
        };
        Object.assign(this.DOMElement.style, defaultStyle, style);
        CreatePointerHandlers(this);
        this.setup();
        this.children.init(this);
        requestAnimationFrame(this.update.bind(this));
    }
    set scale(v) {
        if (this._scale.equal(v))
            return;
        this._scale = Object.freeze(v.copy());
        this.update(true);
    }
    get scale() { return this._scale; }
    get size() {
        const box = this.DOMElement.getBoundingClientRect();
        return vec2(box.width, box.height);
    }
    update(force = false) {
        if (force) {
            this.children.update(this, force);
            this.updateRequests.clear();
        }
        else {
            this.updateRequests.forEach(elem => {
                const keep = elem.update(this);
                if (!keep)
                    this.updateRequests.delete(elem);
            });
        }
        this.loop();
        requestAnimationFrame(this.update.bind(this));
    }
    //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤
    //   User defined functions
    //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤
    setup() { }
    loop() { }
    //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤
    //     Element handling
    //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤
    registerElement(elem) {
        this.DOMElements.set(elem.DOMElement, elem);
    }
    unregisterElement(elem) {
        this.DOMElements.delete(elem.DOMElement);
    }
    requestElementUpdate(elem) {
        this.updateRequests.add(elem);
    }
    //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤
    //   Pointer events
    //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤
    getPointerTarget(ev) {
        return this.DOMElements.get(ev.target);
    }
    endScrolling() {
        if (this.isScrolling) {
            this.isScrolling = false;
            this.DOMElement.style.cursor = 'default';
        }
    }
}
