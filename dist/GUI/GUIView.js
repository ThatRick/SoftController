import Vec2, { vec2 } from '../Lib/Vector2.js';
import GUIContainer from './GUIContainer.js';
const DOUBLE_CLICK_INTERVAL = 400;
export default class GUIView {
    constructor(parentDOM, size, scale, style, css) {
        this.parentDOM = parentDOM;
        this.gui = this;
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
            upPos: vec2(0),
            relativeDownPos: vec2(0)
        };
        this.doubleClickPending = false;
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
        this.setupPointerHandlers();
        this.setup?.();
        requestAnimationFrame(this.update.bind(this));
    }
    set size(v) {
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
        this.updateRequests.forEach(elem => {
            const keep = elem.update();
            if (!keep)
                this.updateRequests.delete(elem);
        });
        this.loop?.();
        requestAnimationFrame(this.update.bind(this));
        return false;
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
    getPointerTargetElem(ev) {
        return this.eventTargetMap.get(ev.target);
    }
    setupPointerHandlers() {
        // Pointer down
        this.DOMElement.onpointerdown = ev => {
            ev.preventDefault();
            this.pointer.isDown = true;
            this.pointer.downPos.set(ev.x, ev.y);
            const elem = ev.target;
            const bounds = this.DOMElement.getBoundingClientRect();
            this.pointer.relativeDownPos.set(ev.x - bounds.x, ev.y - bounds.y);
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
                // Double
                if (this.doubleClickPending) {
                    if (this.pointer.targetElem == this.pointer.downTargetElem)
                        this.pointer.targetElem?.onDoubleClicked?.(ev, this.pointer);
                    this.onDoubleClicked?.(ev);
                }
                // Single
                else {
                    if (this.pointer.targetElem == this.pointer.downTargetElem)
                        this.pointer.targetElem?.onClicked?.(ev, this.pointer);
                    this.onClicked?.(ev);
                    this.doubleClickPending = true;
                    setTimeout(() => this.doubleClickPending = false, DOUBLE_CLICK_INTERVAL);
                }
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
