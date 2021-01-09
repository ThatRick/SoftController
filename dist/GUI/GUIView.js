import Vec2, { vec2 } from '../Lib/Vector2.js';
import GUIContainer from './GUIContainer.js';
export default class GUIView {
    constructor(parentDOM, size, scale, style) {
        this.parentDOM = parentDOM;
        this.eventTargetMap = new Map();
        this.updateRequests = new Set();
        this.pos = vec2(0, 0);
        this.absPos = vec2(0, 0);
        //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤
        //   Pointer events
        //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤
        this.pointer = {
            isDown: false,
            isDragging: false,
            eventTarget: undefined,
            targetElem: undefined,
            downTargetElem: undefined,
            dragHyst: 2,
            dragOffset: undefined,
            dragTargetInitPos: undefined,
            pos: vec2(0),
            downPos: vec2(0),
            upPos: vec2(0)
        };
        this.isScrolling = false;
        this.onDragStarted = (ev) => {
            // Start scrolling view
            if (ev.target == this.DOMElement) { // ev.buttons == MouseButton.MIDDLE
                this.scrollStartPos = vec2(this.parentDOM.scrollLeft, this.parentDOM.scrollTop);
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
                this.parentDOM.scrollLeft = this.scrollStartPos.x - this.pointer.dragOffset.x;
                this.parentDOM.scrollTop = this.scrollStartPos.y - this.pointer.dragOffset.y;
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
        parentDOM.appendChild(this.DOMElement);
        const defaultStyle = {
            position: 'relative',
            top: '0px',
            left: '0px',
        };
        Object.assign(this.DOMElement.style, defaultStyle, style);
        this._size = size;
        this._scale = scale;
        this.resize();
        this.children = new GUIContainer(this);
        this.setupPointerHandlers();
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
        this.DOMElement.style.width = this._size.x * this._scale.x + 'px';
        this.DOMElement.style.height = this._size.y * this._scale.y + 'px';
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
        this.eventTargetMap.set(elem.DOMElement, elem);
    }
    unregisterElement(elem) {
        this.eventTargetMap.delete(elem.DOMElement);
    }
    requestElementUpdate(elem) {
        this.updateRequests.add(elem);
    }
    getPointerTargetElem(ev) {
        return this.eventTargetMap.get(ev.target);
    }
    endScrolling() {
        if (this.isScrolling) {
            this.isScrolling = false;
            this.DOMElement.style.cursor = 'default';
        }
    }
    setupPointerHandlers() {
        // Pointer down
        this.DOMElement.onpointerdown = ev => {
            ev.preventDefault();
            this.pointer.isDown = true;
            this.pointer.downPos.set(ev.x, ev.y);
            this.pointer.eventTarget = ev.target;
            this.pointer.targetElem = this.getPointerTargetElem?.(ev);
            this.pointer.downTargetElem = this.pointer.targetElem;
            this.pointer.targetElem?.onPointerDown?.(ev, this.pointer);
            this.onPointerDown?.(ev);
        };
        // Pointer move
        this.DOMElement.onpointermove = ev => {
            ev.preventDefault();
            this.pointer.pos.set(ev.x, ev.y);
            // Only find target GUI Element if Event Target has changed
            if (ev.target != this.pointer.eventTarget) {
                this.pointer.eventTarget = ev.target;
                this.pointer.targetElem?.onPointerLeave?.(ev, this.pointer);
                this.pointer.targetElem = this.getPointerTargetElem?.(ev);
                this.pointer.targetElem?.onPointerEnter?.(ev, this.pointer);
            }
            this.pointer.targetElem?.onPointerMove?.(ev, this.pointer);
            this.onPointerMove?.(ev);
            // Check if user is dragging
            if (this.pointer.isDown) {
                this.pointer.dragOffset = Vec2.sub(this.pointer.pos, this.pointer.downPos);
                const pointerIsDragging = this.pointer.isDragging || this.pointer.dragOffset.len() > this.pointer.dragHyst;
                // Drag started
                if (pointerIsDragging && !this.pointer.isDragging) {
                    this.pointer.isDragging = true;
                    this.onDragStarted?.(ev);
                }
                // Dragging
                if (this.pointer.isDragging) {
                    this.onDragging?.(ev);
                }
            }
        };
        // Pointer up
        this.DOMElement.onpointerup = ev => {
            ev.preventDefault();
            this.pointer.isDown = false;
            this.pointer.upPos = vec2(ev.x, ev.y);
            this.pointer.eventTarget = ev.target;
            this.pointer.targetElem = this.getPointerTargetElem?.(ev);
            this.onPointerUp?.(ev);
            // Clicked
            if (!this.pointer.isDragging) {
                this.onClicked?.(ev);
                if (this.pointer.targetElem == this.pointer.downTargetElem)
                    this.pointer.targetElem?.onClicked?.(ev, this.pointer);
            }
            // Stop dragging
            if (this.pointer.isDragging) {
                this.pointer.isDragging = false;
                this.onDragEnded?.(ev);
            }
            this.pointer.downTargetElem = undefined;
        };
    }
}
