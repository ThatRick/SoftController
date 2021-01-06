import CreatePointerHandlers from './GUIPointerEventHandler.js';
import Vec2, { vec2 } from './Vector2.js';
import GUIContainer from './GUIContainer.js';
export default class GUIView {
    constructor(parent, size, scale, style) {
        this.DOMElements = new Map();
        this.updateRequests = new Set();
        this.pos = vec2(0, 0);
        this.absPos = vec2(0, 0);
        this.isScrolling = false;
        this.onDragStarted = (ev) => {
            // Start scrolling view
            if (ev.target == this.DOMElement) { // ev.buttons == MouseButton.MIDDLE
                this.scrollStartPos = vec2(this.DOMElement.scrollLeft, this.DOMElement.scrollTop);
                this.isScrolling = true;
                this.DOMElement.style.cursor = 'grab';
            }
            // Start dragging GUI element
            if (this.pointer.isDragging && this.pointer.downTargetElem?.isMovable) {
                this.pointer.dragTargetInitPos = this.pointer.downTargetElem.pos.copy();
                this.pointer.downTargetElem.onDragStarted?.(ev, this.pointer);
            }
        };
        this.onDragging = (ev) => {
            // Scrolling view
            if (this.isScrolling) {
                this.DOMElement.scrollLeft = this.scrollStartPos.x - this.pointer.dragOffset.x;
                this.DOMElement.scrollTop = this.scrollStartPos.y - this.pointer.dragOffset.y;
            }
            // Dragging GUI element
            if (this.pointer.downTargetElem?.isMovable) {
                this.pointer.downTargetElem.onDragging?.(ev, this.pointer);
                const offset = Vec2.div(this.pointer.dragOffset, this.scale);
                const newPos = Vec2.add(this.pointer.dragTargetInitPos, offset);
                this.pointer.downTargetElem.pos = newPos;
            }
        };
        this.onDragEnded = (ev) => {
            // End scrolling
            this.endScrolling();
            // End dragging
            if (this.pointer.downTargetElem?.isMovable) {
                this.pointer.downTargetElem.onDragEnded?.(ev, this.pointer);
            }
        };
        this.onPointerLeave = (ev) => {
            this.endScrolling();
        };
        console.log('GUI Init');
        this.DOMElement = document.createElement('div');
        parent.appendChild(this.DOMElement);
        const defaultStyle = {
            position: 'relative',
            top: '0px',
            left: '0px',
            width: '100%',
            height: '100%',
            overflow: 'auto'
        };
        Object.assign(this.DOMElement.style, defaultStyle, style);
        this._size = size;
        this._scale = scale;
        this.resize();
        this.children = new GUIContainer(this);
        CreatePointerHandlers(this);
        this.setup();
        this.children.init(this);
        requestAnimationFrame(this.update.bind(this));
    }
    set scale(v) {
        if (this._scale?.equal(v))
            return;
        this._scale = Object.freeze(v.copy());
        this.resize();
        this.update(true);
    }
    get scale() { return this._scale; }
    set size(v) {
        if (this._size?.equal(v))
            return;
        this._size = Object.freeze(v.copy());
        this.resize();
        this.update(true);
    }
    get size() { return this._size; }
    resize() {
        // this.DOMElement.style.width = this._size.x * this._scale.x + 'px'
        // this.DOMElement.style.height = this._size.y * this._scale.y + 'px'
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
    getPointerTargetElem(ev) {
        return this.DOMElements.get(ev.target);
    }
    endScrolling() {
        if (this.isScrolling) {
            this.isScrolling = false;
            this.DOMElement.style.cursor = 'default';
        }
    }
}
