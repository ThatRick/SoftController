import Vec2, { vec2 } from '../lib/Vector2.js';
import { GUIChildElement } from './GUIChildElement.js';
import * as HTML from './../Lib/HTML.js';
const DOUBLE_CLICK_INTERVAL = 400;
export default class GUIPointer {
    constructor(view, eventHandler) {
        this.view = view;
        this.isDown = false;
        this.isDragging = false;
        this.screenPos = vec2(0);
        this.screenDownPos = vec2(0);
        this.screenDragOffset = vec2(0);
        this.scaledPos = vec2(0);
        this.scaledDownPos = vec2(0);
        this.scaledDragOffset = vec2(0);
        this.dragTargetInitPos = vec2(0);
        this.screenLocalPos = vec2(0);
        this.dragHyst = 2;
        this.doubleClickPending = false;
        console.log('construct GUIPointer', eventHandler);
        this.eventHandler = eventHandler || view;
        const bounds = view.DOMElement.getBoundingClientRect();
        this.viewOffset = vec2(bounds.x, bounds.y);
        this.scrollOffset = vec2(view.parentDOM.scrollLeft, view.parentDOM.scrollTop);
        this.setupEventListeners();
        this.markers = {
            dot: new GUIChildElement(this.view.children, 'div', vec2(2, 2), vec2(1, 1 * (this.view.scale.x / this.view.scale.y)), {
                borderRadius: this.view.scale.x / 2 + 'px', backgroundColor: 'rgba(192,192,255,0.25)'
            }),
            coords: new HTML.Text('coordinates: 123, 123', {
                parent: this.view.DOMElement,
                style: { left: '300px', top: '2px', color: 'white', position: 'fixed' }
            })
        };
    }
    update() {
        if (this.latestMovementEvent) {
            this.updatePointerPosition(this.latestMovementEvent);
            this.latestMovementEvent = null;
        }
    }
    attachEventHandler(handler) {
        this.eventHandler = handler;
        this.setupEventListeners();
    }
    updatePointerPosition(ev) {
        const view = this.view;
        const handler = this.eventHandler;
        this.scrollOffset = vec2(view.parentDOM.scrollLeft, view.parentDOM.scrollTop);
        const x = (ev.x - this.viewOffset.x + this.scrollOffset.x);
        const y = (ev.y - this.viewOffset.y + this.scrollOffset.y);
        this.screenPos.set(x, y).round();
        this.scaledPos.set(x, y).div(view.scale);
        this.screenLocalPos.set(ev.offsetX, ev.offsetY).round();
        // Only find target GUI Element if Event Target has changed
        if (ev.target != this.eventTarget) {
            this.eventTarget = ev.target;
            this.targetElem?.onPointerLeave?.(ev, this);
            this.targetElem = this.getPointerTargetElem?.(ev);
            this.targetElem?.onPointerEnter?.(ev, this);
        }
        this.targetElem?.onPointerMove?.(ev, this);
        handler.onPointerMove?.(ev);
        // Check if user is dragging
        if (this.isDown) {
            this.screenDragOffset.set(this.screenPos).sub(this.screenDownPos);
            this.scaledDragOffset.set(this.screenDragOffset).div(view.scale);
            const pointerIsDragging = this.isDragging || this.screenDragOffset.len() > this.dragHyst;
            // Drag started
            if (pointerIsDragging && !this.isDragging) {
                this.isDragging = true;
                handler.onDragStarted?.(ev);
            }
            // Dragging
            if (this.isDragging) {
                handler.onDragging?.(ev);
            }
        }
        // Debug marker
        this.markers.dot.setPos(Vec2.sub(this.scaledPos, vec2(0.5)));
        this.markers.coords.setText('coords: ' + Vec2.round(this.scaledPos).toString());
    }
    getPointerTargetElem(ev) {
        return this.view.eventTargetMap.get(ev.target);
    }
    setupEventListeners() {
        const view = this.view;
        const handler = this.eventHandler;
        // Pointer down
        view.DOMElement.onpointerdown = ev => {
            ev.preventDefault();
            this.isDown = true;
            this.screenDownPos.set(this.screenPos);
            this.eventTarget = ev.target;
            this.targetElem = this.getPointerTargetElem?.(ev);
            this.downTargetElem = this.targetElem;
            this.targetElem?.onPointerDown?.(ev, this);
            handler.onPointerDown?.(ev);
        };
        // Pointer move
        view.DOMElement.onpointermove = ev => {
            this.latestMovementEvent = ev;
        };
        // Pointer up
        view.DOMElement.onpointerup = ev => {
            this.isDown = false;
            this.eventTarget = ev.target;
            this.targetElem = this.getPointerTargetElem?.(ev);
            handler.onPointerUp?.(ev);
            // Clicked
            if (!this.isDragging) {
                // Double
                if (this.doubleClickPending) {
                    if (this.targetElem == this.downTargetElem)
                        this.targetElem?.onDoubleClicked?.(ev, this);
                    handler.onDoubleClicked?.(ev);
                }
                // Single
                else {
                    if (this.targetElem == this.downTargetElem)
                        this.targetElem?.onClicked?.(ev, this);
                    handler.onClicked?.(ev);
                    this.doubleClickPending = true;
                    setTimeout(() => this.doubleClickPending = false, DOUBLE_CLICK_INTERVAL);
                }
            }
            // Stop dragging
            if (this.isDragging) {
                this.isDragging = false;
                handler.onDragEnded?.(ev);
            }
            this.downTargetElem = undefined;
        };
    }
}
