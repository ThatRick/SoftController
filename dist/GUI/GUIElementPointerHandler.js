import Vec2, { vec2 } from './Vector2.js';
export default class GUIElementPointerHandler {
    constructor(elemId) {
        this.isConstantlyUpdated = false;
        this.isDraggable = true;
        //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤
        //   Pointer events
        //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤
        this.pointer = {
            isOver: false,
            isDown: false,
            isDragging: false,
            dragHyst: 1,
            dragOffset: undefined,
            pos: undefined,
            downPos: undefined,
            upPos: undefined,
        };
        this.DOMElement = document.getElementById(elemId);
        this.setupInputHandlers();
    }
    setupInputHandlers() {
        this.DOMElement.onpointerenter = ev => {
            this.pointer.isOver = true;
            this.onPointerEnter && this.onPointerEnter(ev);
        };
        this.DOMElement.onpointerleave = ev => {
            this.pointer.isOver = false;
            this.pointer.isDown = false;
            this.onPointerLeave && this.onPointerLeave(ev);
        };
        this.DOMElement.onpointerdown = ev => {
            this.pointer.isDown = true;
            this.pointer.downPos = vec2(ev.x, ev.y);
            this.onPointerDown && this.onPointerDown(ev);
        };
        this.DOMElement.onpointermove = ev => {
            this.pointer.pos = vec2(ev.x, ev.y);
            if (this.pointer.isDown) {
                this.pointer.dragOffset = Vec2.sub(this.pointer.pos, this.pointer.downPos);
                const dragging = this.pointer.isDragging || (this.isDraggable && (Vec2.len(this.pointer.dragOffset) > this.pointer.dragHyst));
                if (dragging && !this.pointer.isDragging) {
                    this.pointer.isDragging = true;
                    this.onDragStarted && this.onDragStarted(ev);
                }
                if (this.pointer.isDragging)
                    this.onDragging && this.onDragging(ev);
            }
            this.onPointerMove && this.onPointerMove(ev);
        };
        this.DOMElement.onpointerup = ev => {
            const wasDown = this.pointer.isDown;
            this.pointer.isDown = false;
            this.pointer.upPos = vec2(ev.x, ev.y);
            this.onPointerUp && this.onPointerUp(ev);
            if (wasDown) {
                this.onClicked && this.onClicked(ev);
            }
            if (this.pointer.isDragging) {
                this.pointer.isDragging = false;
                // Drag ended action
                this.onDragEnded && this.onDragEnded(ev);
            }
        };
    }
}
